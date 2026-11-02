import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { Lead } from '../models/Lead.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';
import { SOURCES, STATUSES } from '../config/env.js';
import {
  detectClickId,
  detectSource,
  normalizeSource,
  sanitizeCampaign,
} from '../utils/attribution.js';
import { leadsToCsv } from '../utils/csv.js';

const router = Router();

const submitLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many submissions from this device. Please try later.' },
});

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function buildFilter(query) {
  const filter = {};
  const { q, status, source, formSlug, from, to, owner } = query;

  if (q && String(q).trim()) {
    const rx = new RegExp(escapeRegex(String(q).trim()), 'i');
    filter.$or = [{ name: rx }, { email: rx }, { phone: rx }, { company: rx }, { message: rx }, { 'campaign.name': rx }];
  }
  if (status && STATUSES.includes(status)) filter.status = status;
  if (source && SOURCES.includes(source)) filter.source = source;
  if (formSlug) filter.formSlug = formSlug;
  if (owner) filter.owner = owner;

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
  value_desc: { value: -1 },
  value_asc: { value: 1 },
  name_asc: { name: 1 },
  name_desc: { name: -1 },
};

/* ------------------------------------------------------------------ */
/* PUBLIC — the form your ads point to                                 */
/* ------------------------------------------------------------------ */

// GET /api/leads/public/config  → branding + options for the form
router.get('/public/config', (req, res) => {
  res.json({
    formTitle: 'Talk to our team',
    formSubtitle: 'Fill in your details and a specialist will reach out within 24 hours.',
    sources: SOURCES,
    statuses: STATUSES,
  });
});

// POST /api/leads/public  → create a lead from the web form
router.post(
  '/public',
  submitLimiter,
  asyncHandler(async (req, res) => {
    const body = req.body || {};
    const campaign = sanitizeCampaign(body.campaign || body.utm || {});
    const click = detectClickId({
      campaign,
      pageUrl: body.pageUrl || req.get('referer') || '',
    });
    const referrer = String(body.referrer || req.get('referer') || '').slice(0, 500);
    const source = detectSource({
      source: body.source,
      campaign,
      referrer,
      pageUrl: body.pageUrl || '',
    });

    const lead = new Lead({
      name: body.name,
      email: body.email,
      phone: body.phone || '',
      company: body.company || '',
      message: body.message || '',
      source,
      formSlug: String(body.formSlug || 'main').slice(0, 60),
      campaign: { ...campaign, ...click },
      pageUrl: String(body.pageUrl || '').slice(0, 500),
      referrer,
      userAgent: String(req.get('user-agent') || '').slice(0, 300),
      ip: (req.headers['x-forwarded-for'] || req.ip || '').toString().split(',')[0].trim(),
    });

    lead.events.push({ type: 'created', message: `Lead captured from ${source} form`, author: 'Website' });
    await lead.save();

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

// GET /api/leads  → paginated, searchable list
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const sort = SORTS[req.query.sort] || SORTS.newest;
    const filter = buildFilter(req.query);

    const [items, total] = await Promise.all([
      Lead.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
      Lead.countDocuments(filter),
    ]);

    res.json({
      items: items.map((l) => ({ ...l, id: l._id.toString() })),
      page,
      limit,
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
    });
  })
);

// GET /api/leads/export.csv  → CSV download
router.get(
  '/export.csv',
  asyncHandler(async (req, res) => {
    const filter = buildFilter(req.query);
    const leads = await Lead.find(filter).sort({ createdAt: -1 }).lean();
    const csv = leadsToCsv(leads);
    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="leads-${stamp}.csv"`);
    res.send(csv);
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
    res.json({ lead: { ...lead, id: lead._id.toString() } });
  })
);

// POST /api/leads  → add a lead manually from the dashboard
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const b = req.body || {};
    const campaign = sanitizeCampaign(b.campaign || {});
    const lead = new Lead({
      name: b.name,
      email: b.email,
      phone: b.phone || '',
      company: b.company || '',
      message: b.message || '',
      source: normalizeSource(b.source),
      status: STATUSES.includes(b.status) ? b.status : 'new',
      value: Number(b.value) || 0,
      owner: b.owner || 'Unassigned',
      tags: Array.isArray(b.tags) ? b.tags.slice(0, 10) : [],
      campaign,
      formSlug: b.formSlug || 'manual',
      events: [{ type: 'created', message: 'Lead added manually', author: req.user.name }],
    });
    await lead.save();
    res.status(201).json({ lead: lead.toJSON() });
  })
);

// PATCH /api/leads/:id
router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Lead not found.' });

    const b = req.body || {};
    const editable = ['name', 'email', 'phone', 'company', 'message', 'owner'];
    for (const key of editable) {
      if (b[key] !== undefined) lead[key] = b[key];
    }
    if (b.source !== undefined) lead.source = normalizeSource(b.source);
    if (b.value !== undefined) lead.value = Math.max(0, Number(b.value) || 0);
    if (Array.isArray(b.tags)) lead.tags = b.tags.filter(Boolean).slice(0, 10);

    if (b.status !== undefined && STATUSES.includes(b.status) && b.status !== lead.status) {
      const from = lead.status;
      lead.status = b.status;
      lead.events.push({
        type: 'status',
        message: `Status changed from ${from} → ${b.status}`,
        author: req.user.name,
      });
      if (['contacted', 'qualified'].includes(b.status)) lead.lastContactedAt = new Date();
    }

    await lead.save();
    res.json({ lead: lead.toJSON() });
  })
);

// DELETE /api/leads/:id
router.delete(
  '/:id',
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

export default router;
