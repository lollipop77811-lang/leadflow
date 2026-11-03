import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { Lead, phoneKey } from '../models/Lead.js';
import { User } from '../models/User.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';
import {
  DOCUMENTS,
  env,
  LOST_REASONS,
  SOURCES,
  STATUSES,
  VEHICLE_CATEGORIES,
} from '../config/env.js';
import { detectClickId, detectSource, normalizeSource, sanitizeCampaign } from '../utils/attribution.js';
import { leadsToCsv } from '../utils/csv.js';
import { notifyNewLead } from '../utils/notify.js';

const router = Router();

const submitLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many submissions from this device. Please try again later.' },
});

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
const endOfToday = () => {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
};

function isServiceable(pincode) {
  if (!env.servicePincodes.length) return true;
  const pin = String(pincode || '').trim();
  return env.servicePincodes.some((prefix) => pin.startsWith(prefix));
}

function buildFilter(req) {
  const filter = {};
  const { q, status, source, lostReason, assignedTo, due, from, to, formSlug, hasQuote } = req.query;

  if (q && String(q).trim()) {
    const rx = new RegExp(escapeRegex(String(q).trim()), 'i');
    filter.$or = [
      { name: rx },
      { phone: rx },
      { email: rx },
      { 'vehicle.make': rx },
      { 'vehicle.model': rx },
      { 'vehicle.registrationNumber': rx },
      { 'pickup.city': rx },
      { 'pickup.pincode': rx },
      { 'campaign.name': rx },
      { tags: rx },
    ];
  }
  if (status && STATUSES.includes(status)) filter.status = status;
  if (source && SOURCES.includes(source)) filter.source = source;
  if (lostReason && LOST_REASONS.includes(lostReason)) filter.lostReason = lostReason;
  if (formSlug) filter.formSlug = formSlug;
  if (hasQuote === 'true') filter['quote.amount'] = { $gt: 0 };

  // Telecallers only ever see their own leads.
  if (req.user.role !== 'admin') {
    filter.assignedTo = req.user._id;
  } else if (assignedTo === 'unassigned') {
    filter.assignedTo = null;
  } else if (assignedTo && mongoose.isValidObjectId(assignedTo)) {
    filter.assignedTo = assignedTo;
  }

  if (due === 'overdue') {
    filter.followUpAt = { $lt: startOfToday() };
    filter.status = { $nin: ['paid', 'lost'] };
  } else if (due === 'today') {
    filter.followUpAt = { $gte: startOfToday(), $lte: endOfToday() };
    filter.status = { $nin: ['paid', 'lost'] };
  }

  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = end;
    }
  }
  return filter;
}

const SORTS = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  follow_up: { followUpAt: 1 },
  value_desc: { 'quote.amount': -1 },
  value_asc: { 'quote.amount': 1 },
  name_asc: { name: 1 },
  name_desc: { name: -1 },
  pickup: { 'pickup.scheduledDate': 1 },
};

/* ------------------------------------------------------------------ */
/* PUBLIC — the form your ads point to                                 */
/* ------------------------------------------------------------------ */

router.get('/public/config', (req, res) => {
  res.json({
    brand: env.brand,
    scrapRate: env.scrapRate,
    serviceAreas: env.servicePincodes,
    categories: VEHICLE_CATEGORIES,
  });
});

router.post(
  '/public',
  submitLimiter,
  asyncHandler(async (req, res) => {
    const body = req.body || {};

    // Honeypot: bots fill hidden fields. Pretend it worked.
    if (body.website || body.companyUrl) {
      return res.status(201).json({ message: 'Thanks! Your details have been received.' });
    }

    const campaign = sanitizeCampaign(body.campaign || {});
    const click = detectClickId({ campaign, pageUrl: body.pageUrl || req.get('referer') || '' });
    const referrer = String(body.referrer || req.get('referer') || '').slice(0, 500);
    const source = detectSource({
      source: body.source,
      campaign,
      referrer,
      pageUrl: body.pageUrl || '',
    });

    const v = body.vehicle || {};
    const p = body.pickup || {};
    const weight =
      Number(v.weightKg) ||
      VEHICLE_CATEGORIES.find((c) => c.id === v.category)?.defaultWeight ||
      0;

    const key = phoneKey(body.phone);
    const previous = await Lead.findOne({ phoneKey: key }).sort({ createdAt: -1 }).lean();
    const duplicateCount = previous ? await Lead.countDocuments({ phoneKey: key }) : 0;

    const lead = new Lead({
      name: body.name,
      phone: body.phone,
      phoneKey: key,
      email: body.email || '',
      whatsappConsent: body.whatsappConsent !== false,
      vehicle: {
        make: v.make || '',
        model: v.model || '',
        year: v.year ? Number(v.year) : null,
        fuel: v.fuel || 'petrol',
        condition: v.condition || 'running',
        rcStatus: v.rcStatus || 'original',
        registrationNumber: v.registrationNumber || '',
        category: v.category || 'hatchback',
        weightKg: weight,
        state: v.state || '',
        rto: v.rto || '',
      },
      pickup: {
        pincode: p.pincode || '',
        city: p.city || '',
        address: p.address || '',
        needsTowing: p.needsTowing !== false,
      },
      quote: { expectedAmount: Number(body.expectedPrice) || 0 },
      photos: Array.isArray(body.photos) ? body.photos.slice(0, 3) : [],
      source,
      formSlug: String(body.formSlug || 'main').slice(0, 60),
      campaign: { ...campaign, ...click },
      pageUrl: String(body.pageUrl || '').slice(0, 500),
      referrer,
      userAgent: String(req.get('user-agent') || '').slice(0, 300),
      ip: (req.headers['x-forwarded-for'] || req.ip || '').toString().split(',')[0].trim(),
      outOfArea: !isServiceable(p.pincode),
      duplicateOf: previous?._id || null,
      duplicateCount,
    });

    if (lead.outOfArea) {
      lead.tags.push('out-of-area');
      lead.events.push({ type: 'created', message: 'Pincode is outside the service area', author: 'Website' });
    }
    lead.events.push({
      type: 'created',
      message: `Lead captured from ${source} · ${lead.vehicleLabel}`,
      author: 'Website',
    });
    if (previous) {
      lead.events.push({
        type: 'duplicate',
        message: `Same phone number submitted before (${duplicateCount + 1} total submissions)`,
        author: 'System',
      });
    }

    await lead.save();

    // Don't make the customer wait on Telegram/webhook latency.
    notifyNewLead(lead).catch(() => {});

    res.status(201).json({
      message: 'Thanks! Your details have been received.',
      lead: { id: lead._id, name: lead.name, source: lead.source },
    });
  })
);

/* ------------------------------------------------------------------ */
/* PROTECTED — dashboard APIs                                          */
/* ------------------------------------------------------------------ */
router.use(requireAuth);

// GET /api/leads/today — pickups scheduled today + follow-ups due
router.get(
  '/today',
  asyncHandler(async (req, res) => {
    const scope = req.user.role === 'admin' ? {} : { assignedTo: req.user._id };

    const [pickups, followUps] = await Promise.all([
      Lead.find({
        ...scope,
        status: { $in: ['pickup_scheduled', 'vehicle_received', 'deregistered'] },
        'pickup.scheduledDate': { $gte: startOfToday(), $lte: endOfToday() },
      })
        .sort({ 'pickup.scheduledDate': 1 })
        .lean(),
      Lead.find({
        ...scope,
        status: { $nin: ['paid', 'lost'] },
        followUpAt: { $lte: endOfToday() },
      })
        .sort({ followUpAt: 1 })
        .limit(60)
        .lean(),
    ]);

    res.json({
      pickups: pickups.map((l) => ({ ...l, id: l._id.toString() })),
      followUps: followUps.map((l) => ({ ...l, id: l._id.toString() })),
    });
  })
);

// GET /api/leads/export.csv
router.get(
  '/export.csv',
  asyncHandler(async (req, res) => {
    const filter = buildFilter(req);
    const leads = await Lead.find(filter).sort({ createdAt: -1 }).lean();
    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="leads-${stamp}.csv"`);
    res.send(leadsToCsv(leads));
  })
);

// GET /api/leads — paginated, filterable list
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const sort = SORTS[req.query.sort] || SORTS.newest;
    const filter = buildFilter(req);

    const [items, total, counts] = await Promise.all([
      Lead.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
      Lead.countDocuments(filter),
      Lead.aggregate([
        { $match: req.user.role === 'admin' ? {} : { assignedTo: req.user._id } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    res.json({
      items: items.map((l) => ({ ...l, id: l._id.toString() })),
      page,
      limit,
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
      statusCounts: Object.fromEntries(counts.map((c) => [c._id, c.count])),
    });
  })
);

// GET /api/leads/:id
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid lead id.' });
    }
    const lead = await Lead.findById(req.params.id).lean();
    if (!lead) return res.status(404).json({ message: 'Lead not found.' });
    if (req.user.role !== 'admin' && String(lead.assignedTo) !== String(req.user._id)) {
      return res.status(403).json({ message: 'This lead is not assigned to you.' });
    }

    const duplicates = await Lead.find({ phoneKey: lead.phoneKey, _id: { $ne: lead._id } })
      .select('name status createdAt quote.amount')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    res.json({ lead: { ...lead, id: lead._id.toString() }, duplicates });
  })
);

// POST /api/leads — manual entry (walk-in / phone call)
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const b = req.body || {};
    const v = b.vehicle || {};
    const key = phoneKey(b.phone);
    const assignedTo = req.user.role === 'admin' && b.assignedTo ? b.assignedTo : req.user._id;
    const assignee = await User.findById(assignedTo).lean();

    const lead = new Lead({
      name: b.name,
      phone: b.phone,
      phoneKey: key,
      email: b.email || '',
      vehicle: {
        ...v,
        year: v.year ? Number(v.year) : null,
        weightKg:
          Number(v.weightKg) || VEHICLE_CATEGORIES.find((c) => c.id === v.category)?.defaultWeight || 0,
      },
      pickup: b.pickup || {},
      source: normalizeSource(b.source || 'walkin'),
      status: STATUSES.includes(b.status) ? b.status : 'new',
      assignedTo,
      assignedToName: assignee?.name || 'Unassigned',
      followUpAt: b.followUpAt ? new Date(b.followUpAt) : null,
      quote: { amount: Number(b.quoteAmount) || 0, expectedAmount: Number(b.expectedPrice) || 0 },
      formSlug: 'manual',
      events: [{ type: 'created', message: 'Lead added manually', author: req.user.name }],
    });
    await lead.save();
    res.status(201).json({ lead: lead.toJSON() });
  })
);

const NUMERIC = ['amount', 'ratePerKg', 'weightKg', 'expectedAmount'];

function applyPatch(lead, body, user) {
  const changes = [];
  const b = body || {};

  ['name', 'email', 'phone', 'lostReason'].forEach((k) => {
    if (b[k] !== undefined) lead[k] = b[k];
  });
  if (b.phone !== undefined) lead.phoneKey = phoneKey(b.phone);
  if (b.whatsappConsent !== undefined) lead.whatsappConsent = Boolean(b.whatsappConsent);
  if (Array.isArray(b.tags)) lead.tags = b.tags.filter(Boolean).slice(0, 12);
  if (b.followUpAt !== undefined) {
    lead.followUpAt = b.followUpAt ? new Date(b.followUpAt) : null;
  }

  if (b.vehicle && typeof b.vehicle === 'object') {
    Object.entries(b.vehicle).forEach(([k, val]) => {
      if (val !== undefined) lead.vehicle[k] = k === 'year' ? Number(val) || null : val;
    });
  }
  if (b.pickup && typeof b.pickup === 'object') {
    Object.entries(b.pickup).forEach(([k, val]) => {
      if (val === undefined) return;
      lead.pickup[k] = k === 'scheduledDate' ? (val ? new Date(val) : null) : val;
    });
  }
  if (b.documents && typeof b.documents === 'object') {
    DOCUMENTS.forEach((doc) => {
      if (b.documents[doc] !== undefined) lead.documents[doc] = Boolean(b.documents[doc]);
    });
  }
  if (b.cd && typeof b.cd === 'object') {
    ['cdNumber'].forEach((k) => {
      if (b.cd[k] !== undefined) lead.cd[k] = b.cd[k];
    });
    ['rtoSubmittedAt', 'rtoApprovedAt', 'cdDate', 'deliveredAt'].forEach((k) => {
      if (b.cd[k] !== undefined) lead.cd[k] = b.cd[k] ? new Date(b.cd[k]) : null;
    });
  }
  if (b.quote && typeof b.quote === 'object') {
    NUMERIC.forEach((k) => {
      if (b.quote[k] !== undefined) lead.quote[k] = Math.max(0, Number(b.quote[k]) || 0);
    });
    if (b.quote.amount !== undefined && Number(b.quote.amount) > 0) {
      lead.quote.sentAt = new Date();
      changes.push(`Quote of ₹${Number(b.quote.amount).toLocaleString('en-IN')} sent`);
    }
  }
  if (b.payout && typeof b.payout === 'object') {
    if (b.payout.amount !== undefined) lead.payout.amount = Math.max(0, Number(b.payout.amount) || 0);
    if (b.payout.mode !== undefined) lead.payout.mode = b.payout.mode;
    if (b.payout.reference !== undefined) lead.payout.reference = b.payout.reference;
    if (b.payout.paidAt !== undefined) {
      lead.payout.paidAt = b.payout.paidAt ? new Date(b.payout.paidAt) : null;
      if (b.payout.paidAt) changes.push('Marked as paid');
    }
  }

  if (b.assignedTo !== undefined && user.role === 'admin') {
    lead.assignedTo = b.assignedTo || null;
    lead.assignedToName = b.assignedToName || 'Unassigned';
    changes.push(`Assigned to ${lead.assignedToName}`);
  }

  if (b.status !== undefined && b.status !== lead.status) {
    if (b.status === 'lost' && !(b.lostReason || lead.lostReason)) {
      const err = new Error('Please pick a reason before marking the lead as lost.');
      err.status = 400;
      throw err;
    }
    const from = lead.status;
    lead.status = b.status;
    lead.statusChangedAt = new Date();
    changes.push(`Status: ${from.replace(/_/g, ' ')} → ${b.status.replace(/_/g, ' ')}`);

    if (!lead.firstContactedAt && b.status !== 'new') lead.firstContactedAt = new Date();
    if (b.status === 'vehicle_received' && !lead.pickup.completedAt) lead.pickup.completedAt = new Date();
    if (b.status === 'paid' && !lead.payout.paidAt) lead.payout.paidAt = new Date();
    if (b.status === 'lost') lead.followUpAt = null;
  }

  if (lead.pickup.scheduledDate && !lead.pickup.completedAt) {
    if (['new', 'contacted', 'quoted'].includes(lead.status)) {
      lead.status = 'pickup_scheduled';
      lead.statusChangedAt = new Date();
      changes.push('Pickup scheduled');
    }
  }

  changes.forEach((message) => lead.events.push({ type: 'update', message, author: user.name }));
  return lead;
}

// PATCH /api/leads/:id
router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Lead not found.' });
    if (req.user.role !== 'admin' && String(lead.assignedTo) !== String(req.user._id)) {
      return res.status(403).json({ message: 'This lead is not assigned to you.' });
    }

    applyPatch(lead, req.body, req.user);
    await lead.save();
    res.json({ lead: lead.toJSON() });
  })
);

// DELETE /api/leads/:id  (admin only)
router.delete(
  '/:id',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const deleted = await Lead.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Lead not found.' });
    res.json({ message: 'Lead deleted.', id: req.params.id });
  })
);

// POST /api/leads/:id/notes
router.post(
  '/:id/notes',
  asyncHandler(async (req, res) => {
    const text = String(req.body.text || '').trim();
    if (!text) return res.status(400).json({ message: 'Note cannot be empty.' });

    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Lead not found.' });

    lead.notes.unshift({ text, author: req.user.name });
    lead.events.push({ type: 'note', message: 'Note added', author: req.user.name });
    await lead.save();
    res.status(201).json({ lead: lead.toJSON() });
  })
);

// DELETE /api/leads/:id/notes/:noteId
router.delete(
  '/:id/notes/:noteId',
  asyncHandler(async (req, res) => {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Lead not found.' });
    lead.notes = lead.notes.filter((n) => n._id.toString() !== req.params.noteId);
    await lead.save();
    res.json({ lead: lead.toJSON() });
  })
);

// POST /api/leads/:id/photos  { photos: [dataUrl] }
router.post(
  '/:id/photos',
  asyncHandler(async (req, res) => {
    const photos = Array.isArray(req.body.photos) ? req.body.photos : [];
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Lead not found.' });

    lead.photos = [...lead.photos, ...photos].slice(0, 6);
    lead.events.push({ type: 'update', message: `${photos.length} photo(s) added`, author: req.user.name });
    await lead.save();
    res.json({ lead: lead.toJSON() });
  })
);

// DELETE /api/leads/:id/photos/:index
router.delete(
  '/:id/photos/:index',
  asyncHandler(async (req, res) => {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Lead not found.' });
    lead.photos.splice(Number(req.params.index), 1);
    await lead.save();
    res.json({ lead: lead.toJSON() });
  })
);

export default router;
