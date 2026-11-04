/**
 * DEMO API — in-browser stand-in for the Express + MongoDB backend.
 *
 * Used when VITE_DEMO_MODE !== 'false' so the static Netlify build can be shown
 * to a client with zero backend: any email + password logs in, and every screen
 * runs on realistic data. Requests are routed by path/method and persist to
 * localStorage, so a walkthrough can click through the whole workflow.
 *
 * Shape of every response mirrors the real API exactly — going back to the live
 * backend is a one-line env change (VITE_DEMO_MODE=false).
 */

import {
  WEIGHT,
  iso,
  loadState,
  phoneKey,
  prettyPhone,
  resetState,
  saveState,
  startOfToday,
  uid,
} from './demoStore';

const SOURCE_LABEL = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  google: 'Google',
  whatsapp: 'WhatsApp',
  justdial: 'Justdial',
  olx: 'OLX / car portal',
  walkin: 'Walk-in',
  youtube: 'YouTube',
  linkedin: 'LinkedIn',
  website: 'Website',
  other: 'Other',
};

const TERMINAL = ['paid', 'lost'];
const RECEIVED = ['vehicle_received', 'deregistered', 'paid'];

const fail = (message, status = 400, errors) => {
  const err = new Error(message);
  err.status = status;
  err.errors = errors;
  throw err;
};

const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const dayStart = (value) => {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
};
const sameDay = (a, b) => dayStart(a).getTime() === dayStart(b).getTime();
const inRange = (value, from, to) => {
  if (!value) return false;
  const t = new Date(value).getTime();
  return t >= from.getTime() && t <= to.getTime();
};

/* ---------------------------------------------------------------- agencies */

function monthProration(rows, start, end) {
  const map = new Map();
  rows.forEach((row) => {
    const [y, m] = String(row.month || '').split('-').map(Number);
    if (!y || !m) return;
    const daysInMonth = new Date(y, m, 0).getDate();
    const perDay = Number(row.amount || 0) / daysInMonth;
    let counted = 0;
    for (let day = 1; day <= daysInMonth; day += 1) {
      const d = new Date(y, m - 1, day, 12, 0, 0);
      if (d >= start && d <= end) counted += 1;
    }
    if (!counted) return;
    map.set(row.campaignName, (map.get(row.campaignName) || 0) + perDay * counted);
  });
  return map;
}

function computeStats(state) {
  const leads = state.leads;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const weekAgo = new Date(now.getTime() - 7 * 864e5);
  const monthAgo = new Date(now.getTime() - 30 * 864e5);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  const inMonth = (d) => d && new Date(d) >= monthStart && new Date(d) <= now;
  const inLast30 = (d) => d && new Date(d) >= monthAgo && new Date(d) <= now;

  const received = leads.filter((l) => RECEIVED.includes(l.status));
  const receivedMonth = received.filter((l) =>
    inMonth(l.pickup?.completedAt || l.statusChangedAt)
  );
  const received30 = received.filter((l) => inLast30(l.pickup?.completedAt || l.statusChangedAt));

  const last30 = leads.filter((l) => inLast30(l.createdAt)).length;

  const spendMap = monthProration(state.spend, monthAgo, now);
  const totalSpend = Math.round([...spendMap.values()].reduce((a, b) => a + b, 0));

  const openQuoteValue = leads
    .filter((l) => l.quote?.amount > 0 && l.status === 'quoted')
    .reduce((a, l) => a + l.quote.amount, 0);

  const pendingPayout = leads
    .filter((l) => l.status === 'deregistered' || l.status === 'vehicle_received')
    .reduce((a, l) => a + (l.payout?.amount || 0), 0);

  const paidMonth = leads
    .filter((l) => l.payout?.paidAt && inMonth(l.payout.paidAt))
    .reduce((a, l) => a + l.payout.amount, 0);

  const responded = leads.filter((l) => l.firstContactedAt);
  const avgResponseMins = responded.length
    ? Math.round(
        responded.reduce(
          (a, l) => a + (new Date(l.firstContactedAt) - new Date(l.createdAt)) / 60000,
          0
        ) / responded.length
      )
    : 0;

  const totals = {
    total: leads.length,
    today: leads.filter((l) => sameDay(l.createdAt, now)).length,
    week: leads.filter((l) => new Date(l.createdAt) >= weekAgo).length,
    last30,
    openLeads: leads.filter((l) => !TERMINAL.includes(l.status) && l.status !== 'deregistered').length,
    quotesOut: leads.filter((l) => l.quote?.amount > 0 && l.status === 'quoted').length,
    receivedMonth: receivedMonth.length,
    received30: received30.length,
    tonnageMonth: receivedMonth.reduce((a, l) => a + (l.vehicle?.weightKg || 0), 0),
    pendingPayout: Math.round(pendingPayout),
    paidMonth: Math.round(paidMonth),
    openQuoteValue: Math.round(openQuoteValue),
    lost: leads.filter((l) => l.status === 'lost').length,
    conversionRate: leads.length ? Math.round((received.length / leads.length) * 100) : 0,
    avgResponseMins,
    totalSpend,
    cpl: last30 ? Math.round(totalSpend / last30) : 0,
    costPerPickup: received30.length ? Math.round(totalSpend / received30.length) : 0,
  };

  const statusOrder = [
    'new', 'contacted', 'quoted', 'pickup_scheduled', 'vehicle_received', 'deregistered', 'paid', 'lost',
  ];
  const byStatus = statusOrder.map((status) => {
    const rows = leads.filter((l) => l.status === status);
    return {
      status,
      count: rows.length,
      quote: rows.reduce((a, l) => a + (l.quote?.amount || 0), 0),
    };
  });

  const sourceMap = new Map();
  leads.forEach((l) => sourceMap.set(l.source, (sourceMap.get(l.source) || 0) + 1));
  const bySource = [...sourceMap.entries()]
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);

  const lostMap = new Map();
  leads
    .filter((l) => l.status === 'lost' && l.lostReason)
    .forEach((l) => lostMap.set(l.lostReason, (lostMap.get(l.lostReason) || 0) + 1));
  const lostReasons = [...lostMap.entries()]
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);

  const campaignMap = new Map();
  leads.forEach((l) => {
    const name = l.campaign?.name || `${SOURCE_LABEL[l.source] || l.source} (untracked)`;
    const row = campaignMap.get(name) || { name, source: l.source, leads: 0, received: 0 };
    row.leads += 1;
    if (RECEIVED.includes(l.status)) row.received += 1;
    campaignMap.set(name, row);
  });
  const byCampaign = [...campaignMap.values()].map((row) => {
    const spend = Math.round(spendMap.get(row.name) || 0);
    return {
      ...row,
      spend,
      cpl: row.leads && spend ? Math.round(spend / row.leads) : 0,
      costPerPickup: row.received && spend ? Math.round(spend / row.received) : 0,
    };
  });
  spendMap.forEach((spend, name) => {
    if (!campaignMap.has(name) && spend > 0) {
      byCampaign.push({
        name,
        source: 'other',
        leads: 0,
        received: 0,
        spend: Math.round(spend),
        cpl: 0,
        costPerPickup: 0,
      });
    }
  });

  const timeline = [];
  for (let i = 13; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    timeline.push({
      date: d.toISOString().slice(0, 10),
      count: leads.filter((l) => sameDay(l.createdAt, d)).length,
    });
  }

  const openFollowUps = leads.filter(
    (l) => l.followUpAt && !TERMINAL.includes(l.status) && l.status !== 'deregistered'
  );
  const overdue = openFollowUps.filter((l) => new Date(l.followUpAt) < startOfToday()).length;
  const dueToday = openFollowUps.filter((l) => sameDay(l.followUpAt, now)).length;

  return {
    totals,
    byStatus,
    bySource,
    lostReasons,
    byCampaign,
    timeline,
    followUps: { overdue, today: dueToday },
    pickupsToday: leads.filter(
      (l) => l.pickup?.scheduledDate && sameDay(l.pickup.scheduledDate, now) && !l.pickup.noShow
    ).length,
    recent: [...leads]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 6),
    month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
    generatedAt: iso(now),
  };
}

/* ------------------------------------------------------------------ today */

function todayPayload(state) {
  const now = new Date();
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  return {
    pickups: state.leads
      .filter(
        (l) =>
          l.pickup?.scheduledDate &&
          new Date(l.pickup.scheduledDate) <= endOfToday &&
          !l.pickup.completedAt &&
          !TERMINAL.includes(l.status)
      )
      .sort((a, b) => new Date(a.pickup.scheduledDate) - new Date(b.pickup.scheduledDate)),
    followUps: state.leads
      .filter(
        (l) =>
          l.followUpAt &&
          new Date(l.followUpAt) <= endOfToday &&
          !TERMINAL.includes(l.status) &&
          l.status !== 'deregistered'
      )
      .sort((a, b) => new Date(a.followUpAt) - new Date(b.followUpAt)),
  };
}

/* ------------------------------------------------------------------- list */

function listPayload(state, params) {
  const q = (params.get('q') || '').trim().toLowerCase();
  let items = [...state.leads];

  if (q) {
    items = items.filter((l) =>
      [
        l.name,
        l.phone,
        l.phoneKey,
        l.vehicle?.make,
        l.vehicle?.model,
        l.vehicle?.registrationNumber,
        l.pickup?.city,
        l.pickup?.pincode,
        l.campaign?.name,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }
  if (params.get('status')) items = items.filter((l) => l.status === params.get('status'));
  if (params.get('source')) items = items.filter((l) => l.source === params.get('source'));
  if (params.get('lostReason')) items = items.filter((l) => l.lostReason === params.get('lostReason'));

  const assigned = params.get('assignedTo');
  if (assigned === 'unassigned') items = items.filter((l) => !l.assignedTo);
  else if (assigned) items = items.filter((l) => l.assignedTo === assigned);

  const due = params.get('due');
  if (due === 'overdue') {
    items = items.filter((l) => l.followUpAt && new Date(l.followUpAt) < startOfToday());
  } else if (due === 'today') {
    items = items.filter((l) => l.followUpAt && sameDay(l.followUpAt, new Date()));
  }

  if (params.get('from')) {
    const from = dayStart(params.get('from'));
    items = items.filter((l) => new Date(l.createdAt) >= from);
  }
  if (params.get('to')) {
    const to = dayStart(params.get('to'));
    to.setHours(23, 59, 59);
    items = items.filter((l) => new Date(l.createdAt) <= to);
  }

  const sort = params.get('sort') || 'newest';
  items.sort((a, b) => {
    if (sort === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
    if (sort === 'follow_up') {
      if (!a.followUpAt && !b.followUpAt) return new Date(b.createdAt) - new Date(a.createdAt);
      if (!a.followUpAt) return 1;
      if (!b.followUpAt) return -1;
      return new Date(a.followUpAt) - new Date(b.followUpAt);
    }
    if (sort === 'quote') return (b.quote?.amount || 0) - (a.quote?.amount || 0);
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  const statusCounts = {};
  state.leads.forEach((l) => {
    statusCounts[l.status] = (statusCounts[l.status] || 0) + 1;
  });

  const page = Math.max(1, Number(params.get('page') || 1));
  const limit = Math.min(200, Math.max(1, Number(params.get('limit') || 20)));
  const total = items.length;

  return {
    items: items.slice((page - 1) * limit, page * limit),
    page,
    limit,
    total,
    pages: Math.max(1, Math.ceil(total / limit)),
    statusCounts,
  };
}

/* -------------------------------------------------------------- mutations */

function applyPatch(state, lead, body, user) {
  const now = iso(new Date());

  if (body.status && body.status !== lead.status) {
    if (body.status === 'lost' && !body.lostReason) {
      fail('Please pick a reason before marking the lead as lost.');
    }
    lead.status = body.status;
    lead.statusChangedAt = now;
    if (body.status === 'lost') lead.lostReason = body.lostReason;
    else if (body.status !== 'lost') lead.lostReason = '';
    lead.events.push({
      type: 'status',
      message: `Status changed to ${body.status}`,
      author: user.name,
      createdAt: now,
    });
  }
  if (body.lostReason && lead.status === 'lost') lead.lostReason = body.lostReason;

  if (body.assignedTo !== undefined) {
    lead.assignedTo = body.assignedTo;
    lead.assignedToName =
      state.users.find((u) => u.id === body.assignedTo)?.name || body.assignedToName || 'Unassigned';
    lead.events.push({
      type: 'assign',
      message: `Assigned to ${lead.assignedToName}`,
      author: user.name,
      createdAt: now,
    });
  }

  if (body.followUpAt !== undefined) {
    lead.followUpAt = body.followUpAt ? iso(body.followUpAt) : null;
    lead.events.push({
      type: 'follow_up',
      message: lead.followUpAt
        ? `Follow-up set for ${lead.followUpAt.slice(1, 10)}`
        : 'Follow-up cleared',
      author: user.name,
      createdAt: now,
    });
  }

  if (body.vehicle) {
    lead.vehicle = { ...lead.vehicle, ...body.vehicle };
    if (body.vehicle.weightKg) lead.vehicle.weightKg = Number(body.vehicle.weightKg);
  }

  if (body.quote) {
    const next = {
      ...lead.quote,
      ...body.quote,
      amount: Number(body.quote.amount) || 0,
      ratePerKg: Number(body.quote.ratePerKg) || 0,
      weightKg: Number(body.quote.weightKg) || lead.vehicle.weightKg,
    };
    if (next.amount > 0) next.sentAt = body.quote.sentAt || next.sentAt || now;
    lead.quote = next;
    if (next.amount > 0 && ['new', 'contacted'].includes(lead.status)) {
      lead.status = 'quoted';
      lead.statusChangedAt = now;
    }
    lead.events.push({
      type: 'quote',
      message: `Quote of ₹${next.amount.toLocaleString('en-IN')} saved`,
      author: user.name,
      createdAt: now,
    });
  }

  if (body.pickup) {
    lead.pickup = { ...lead.pickup, ...body.pickup };
    if (body.pickup.scheduledDate) {
      lead.pickup.scheduledDate = iso(body.pickup.scheduledDate);
      if (['new', 'contacted', 'quoted'].includes(lead.status)) {
        lead.status = 'pickup_scheduled';
        lead.statusChangedAt = now;
      }
      lead.events.push({
        type: 'pickup',
        message: `Pickup scheduled for ${lead.pickup.scheduledDate.slice(0, 10)} (${lead.pickup.slot || 'slot TBD'})`,
        author: user.name,
        createdAt: now,
      });
    }
    if (body.pickup.noShow) {
      lead.events.push({
        type: 'pickup',
        message: 'Customer not available — marked as no-show',
        author: user.name,
        createdAt: now,
      });
    }
  }

  if (body.documents) {
    lead.documents = { ...lead.documents, ...body.documents };
    const label = Object.keys(body.documents)[0];
    const value = body.documents[label];
    lead.events.push({
      type: 'documents',
      message: `${label.toUpperCase()} ${value ? 'received' : 'marked missing'}`,
      author: user.name,
      createdAt: now,
    });
  }

  if (body.cd) {
    lead.cd = {
      ...lead.cd,
      ...body.cd,
      rtoSubmittedAt: body.cd.rtoSubmittedAt ? iso(body.cd.rtoSubmittedAt) : lead.cd.rtoSubmittedAt,
      rtoApprovedAt: body.cd.rtoApprovedAt ? iso(body.cd.rtoApprovedAt) : lead.cd.rtoApprovedAt,
      cdDate: body.cd.cdDate ? iso(body.cd.cdDate) : lead.cd.cdDate,
    };
    lead.events.push({
      type: 'cd',
      message: body.cd.cdNumber ? `CD number ${body.cd.cdNumber} recorded` : 'CD details updated',
      author: user.name,
      createdAt: now,
    });
  }

  if (body.payout) {
    lead.payout = {
      ...lead.payout,
      ...body.payout,
      amount: Number(body.payout.amount) || 0,
      paidAt: body.payout.paidAt ? iso(body.payout.paidAt) : lead.payout.paidAt,
    };
    if (body.payout.paidAt) {
      lead.events.push({
        type: 'payout',
        message: `₹${lead.payout.amount.toLocaleString('en-IN')} paid via ${lead.payout.mode || 'cash'}`,
        author: user.name,
        createdAt: now,
      });
    }
  }

  if (body.status === 'vehicle_received' && !lead.pickup.completedAt) {
    lead.pickup.completedAt = now;
    lead.pickup.noShow = false;
    lead.events.push({
      type: 'received',
      message: `Vehicle received at yard · ${lead.vehicle.weightKg} kg`,
      author: user.name,
      createdAt: now,
    });
  }

  if (!lead.firstContactedAt && ['contacted', 'quoted', 'pickup_scheduled'].includes(lead.status)) {
    lead.firstContactedAt = now;
  }

  lead.updatedAt = now;
  return lead;
}

function createLead(state, body, user) {
  const key = phoneKey(body.phone);
  if (!body.name || String(body.name).trim().length < 2) fail('Please enter the customer name.');
  if (key.length !== 10) fail('Enter a valid 10-digit mobile number.', 400, { phone: 'Invalid phone' });

  const category = body.vehicle?.category || 'hatchback';
  const weightKg = Number(body.vehicle?.weightKg) || WEIGHT[category] || 1000;
  const now = iso(new Date());
  const duplicateCount = state.leads.filter((l) => l.phoneKey === key).length;

  const lead = {
    _id: uid('ld'),
    name: String(body.name).trim(),
    phone: prettyPhone(key),
    phoneKey: key,
    email: body.email || '',
    whatsappConsent: body.whatsappConsent !== false,
    vehicle: {
      make: body.vehicle?.make || '',
      model: body.vehicle?.model || '',
      year: body.vehicle?.year ? Number(body.vehicle.year) : null,
      fuel: body.vehicle?.fuel || 'petrol',
      condition: body.vehicle?.condition || 'running',
      rcStatus: body.vehicle?.rcStatus || 'original',
      registrationNumber: body.vehicle?.registrationNumber || '',
      category,
      weightKg,
      state: 'Uttar Pradesh',
      rto: 'Lucknow RTO',
    },
    photos: [],
    pickup: {
      pincode: body.pickup?.pincode || '',
      city: body.pickup?.city || '',
      address: body.pickup?.address || '',
      needsTowing: body.pickup?.needsTowing ?? true,
      scheduledDate: null,
      slot: '',
      vendor: '',
      driver: '',
      completedAt: null,
      noShow: false,
    },
    outOfArea: false,
    quote: {
      amount: Number(body.quoteAmount) || 0,
      ratePerKg: 0,
      weightKg: 0,
      expectedAmount: Number(body.expectedPrice) || 0,
      sentAt: null,
    },
    payout: { amount: 0, paidAt: null, mode: '', reference: '' },
    documents: { rc: false, insurance: false, pan: false, aadhaar: false, noc: false, form2628: false },
    cd: { rtoSubmittedAt: null, rtoApprovedAt: null, cdNumber: '', cdDate: null, deliveredAt: null },
    status: body.status || 'new',
    statusChangedAt: now,
    lostReason: '',
    assignedTo: body.assignedTo || user.id,
    assignedToName:
      state.users.find((u) => u.id === (body.assignedTo || user.id))?.name || user.name,
    followUpAt: body.followUpAt ? iso(body.followUpAt) : null,
    firstContactedAt: null,
    source: body.source || 'walkin',
    formSlug: 'main',
    campaign: body.campaign || {
      source: body.source || 'walkin',
      medium: '',
      name: '',
      content: '',
      term: '',
      clickId: '',
      clickIdType: '',
    },
    duplicateOf: null,
    duplicateCount,
    tags: [],
    notes: [],
    events: [
      {
        type: 'created',
        message: `Lead added manually · ${body.vehicle?.make || ''} ${body.vehicle?.model || ''}`.trim(),
        author: user.name,
        createdAt: now,
      },
    ],
    pageUrl: '',
    referrer: '',
    userAgent: '',
    ip: '',
    createdAt: now,
    updatedAt: now,
    __v: 0,
  };
  if (lead.quote.amount > 0) {
    lead.quote.sentAt = now;
    lead.status = lead.status === 'new' ? 'quoted' : lead.status;
  }
  state.leads.unshift(lead);
  return lead;
}

/* -------------------------------------------------------------------- csv */

const CSV_COLUMNS = [
  ['Lead ID', (l) => l._id],
  ['Created', (l) => new Date(l.createdAt).toLocaleString('en-IN')],
  ['Customer', (l) => l.name],
  ['Phone', (l) => l.phone],
  ['Email', (l) => l.email],
  ['Vehicle', (l) => `${l.vehicle.make} ${l.vehicle.model}`.trim()],
  ['Year', (l) => l.vehicle.year || ''],
  ['Category', (l) => l.vehicle.category],
  ['Fuel', (l) => l.vehicle.fuel],
  ['Condition', (l) => l.vehicle.condition],
  ['RC status', (l) => l.vehicle.rcStatus],
  ['Registration no.', (l) => l.vehicle.registrationNumber],
  ['Weight (kg)', (l) => l.vehicle.weightKg],
  ['Stage', (l) => l.status],
  ['Lost reason', (l) => l.lostReason],
  ['Quote (₹)', (l) => l.quote.amount || 0],
  ['Expected (₹)', (l) => l.quote.expectedAmount || 0],
  ['Payout (₹)', (l) => l.payout.amount || 0],
  ['Paid on', (l) => (l.payout.paidAt ? new Date(l.payout.paidAt).toLocaleDateString('en-IN') : '')],
  ['City', (l) => l.pickup.city],
  ['Pincode', (l) => l.pickup.pincode],
  ['Pickup date', (l) => (l.pickup.scheduledDate ? new Date(l.pickup.scheduledDate).toLocaleDateString('en-IN') : '')],
  ['Documents', (l) => Object.keys(l.documents).filter((k) => l.documents[k]).length + '/6'],
  ['CD number', (l) => l.cd.cdNumber],
  ['Follow-up', (l) => (l.followUpAt ? new Date(l.followUpAt).toLocaleDateString('en-IN') : '')],
  ['Source', (l) => l.source],
  ['Campaign', (l) => l.campaign.name],
  ['Owner', (l) => l.assignedToName || ''],
];

const csvCell = (value) => {
  const s = String(value ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/* ----------------------------------------------------------------- router */

async function handle(path, { method = 'GET', body } = {}, state, user) {
  const [rawPath, rawQuery = ''] = path.split('?');
  const params = new URLSearchParams(rawQuery);
  const p = rawPath.replace(/\/$/, '');

  /* auth */
  if (p === '/auth/login' && method === 'POST') {
    const email = String(body?.email || '').trim() || 'admin@leadflow.dev';
    const name =
      email.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || 'Admin';
    const account = state.users[0];
    const loggedIn = {
      id: account.id,
      name: email === account.email ? account.name : name,
      email,
      phone: account.phone,
      role: 'admin',
      active: true,
      lastLoginAt: iso(new Date()),
    };
    state.session = loggedIn;
    saveState(state);
    return { token: 'demo-token', user: loggedIn };
  }

  if (p === '/auth/me') return { user: getSession(state) };

  if (p === '/auth/password' && method === 'PATCH') {
    if (!body?.currentPassword) fail('Enter your current password.');
    return { message: 'Password updated.' };
  }

  if (p === '/health') return { ok: true, db: 'demo', uptime: 0, time: iso(new Date()) };

  /* public form */
  if (p === '/leads/public/config') {
    return {
      brand: {
        name: 'Sharma Autoscrap',
        rvsfNumber: 'RVSF/UP/2024/0000',
        phone: '+91 90000 00000',
        whatsapp: '919000000000',
      },
      scrapRate: 20,
      serviceAreas: [],
      categories: [
        { id: 'hatchback', label: 'Hatchback (Alto, Swift, i10…)', defaultWeight: 900 },
        { id: 'sedan', label: 'Sedan (Dzire, City, Verna…)', defaultWeight: 1150 },
        { id: 'suv', label: 'SUV / MUV (Bolero, Innova, Scorpio…)', defaultWeight: 1700 },
        { id: 'luxury', label: 'Luxury (Audi, BMW, Mercedes…)', defaultWeight: 1600 },
        { id: 'commercial', label: 'Commercial / Van / Pickup', defaultWeight: 2100 },
        { id: 'other', label: 'Other / Not sure', defaultWeight: 1000 },
      ],
    };
  }

  if (p === '/leads/public' && method === 'POST') {
    if (String(body?.honeypot || '').trim()) return { message: 'Thanks! Your details have been received.' };
    const lead = createLead(
      state,
      {
        ...body,
        source: body?.campaign?.source || body?.source || 'website',
        status: 'new',
        assignedTo: state.users[1].id,
      },
      { id: 'website', name: 'Website' }
    );
    saveState(state);
    return {
      message: 'Thanks! Your details have been received.',
      lead: { id: lead._id, name: lead.name, source: lead.source },
    };
  }

  /* today */
  if (p === '/leads/today') return todayPayload(state);

  /* stats */
  if (p === '/stats') return computeStats(state);

  /* users */
  if (p === '/users' && method === 'GET') return { users: state.users };
  if (p === '/users' && method === 'POST') {
    if (!body?.name || !body?.email) fail('Name and email are required.');
    if (state.users.some((u) => u.email.toLowerCase() === String(body.email).toLowerCase())) {
      fail('A user with that email already exists.');
    }
    const created = {
      id: uid('us'),
      name: body.name,
      email: body.email,
      phone: body.phone || '',
      role: body.role || 'telecaller',
      active: true,
      lastLoginAt: null,
    };
    state.users.push(created);
    saveState(state);
    return { user: created };
  }
  if (p.startsWith('/users/') && method === 'PATCH') {
    const id = p.split('/')[2];
    const target = state.users.find((u) => u.id === id);
    if (!target) fail('User not found.', 404);
    Object.assign(target, body);
    saveState(state);
    return { user: target };
  }

  /* spend */
  if (p === '/spend' && method === 'GET') {
    return {
      items: [...state.spend].sort((a, b) =>
        a.month === b.month ? b.amount - a.amount : b.month.localeCompare(a.month)
      ),
    };
  }
  if (p === '/spend' && method === 'POST') {
    if (!body?.campaignName) fail('Campaign name is required.');
    if (!Number(body?.amount)) fail('Enter the amount spent.');
    const created = {
      _id: uid('sp'),
      id: uid('sp'),
      campaignName: body.campaignName,
      source: body.source || 'other',
      month: body.month || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
      amount: Number(body.amount),
      notes: body.notes || '',
      createdBy: user.name,
      createdAt: iso(new Date()),
      updatedAt: iso(new Date()),
    };
    state.spend.unshift(created);
    saveState(state);
    return { item: created };
  }
  if (p.startsWith('/spend/') && method === 'DELETE') {
    const id = p.split('/')[2];
    state.spend = state.spend.filter((s) => s._id !== id && s.id !== id);
    saveState(state);
    return { message: 'Spend entry deleted.' };
  }

  /* leads collection */
  if (p === '/leads' && method === 'GET') return listPayload(state, params);
  if (p === '/leads' && method === 'POST') {
    const lead = createLead(state, body || {}, user);
    saveState(state);
    return { lead };
  }

  /* export */
  if (p === '/leads/export.csv') {
    const rows = listPayload(state, new URLSearchParams(`${rawQuery}&limit=200`)).items;
    const csv = [
      CSV_COLUMNS.map(([label]) => label).join(','),
      ...rows.map((l) => CSV_COLUMNS.map(([, get]) => csvCell(get(l))).join(',')),
    ].join('\n');
    return { csv, filename: `leads-${iso(new Date()).slice(0, 10)}.csv`, rows: rows.length };
  }

  /* single lead */
  const leadMatch = p.match(/^\/leads\/([^/]+)(\/.*)?$/);
  if (leadMatch) {
    const [, id, rest = ''] = leadMatch;
    const lead = state.leads.find((l) => l._id === id || l.id === id);
    if (!lead) fail('Lead not found.', 404);

    if (!rest && method === 'GET') {
      const duplicates = state.leads.filter((l) => l.phoneKey === lead.phoneKey && l._id !== lead._id);
      return { lead, duplicates };
    }
    if (!rest && method === 'PATCH') {
      applyPatch(state, lead, body || {}, user);
      saveState(state);
      return { lead };
    }
    if (!rest && method === 'DELETE') {
      state.leads = state.leads.filter((l) => l._id !== lead._id);
      saveState(state);
      return { message: 'Lead deleted.' };
    }
    if (rest === '/notes' && method === 'POST') {
      const text = String(body?.text || '').trim();
      if (!text) fail('Write something first.');
      lead.notes.unshift({
        _id: uid('nt'),
        text,
        author: user.name,
        createdAt: iso(new Date()),
      });
      lead.events.push({
        type: 'note',
        message: 'Note added',
        author: user.name,
        createdAt: iso(new Date()),
      });
      saveState(state);
      return { lead };
    }
    if (rest === '/photos' && method === 'POST') {
      const incoming = (body?.photos || []).slice(0, 3);
      lead.photos = [...lead.photos, ...incoming].slice(0, 3);
      saveState(state);
      return { lead };
    }
    const photoMatch = rest.match(/^\/photos\/(\d+)$/);
    if (photoMatch && method === 'DELETE') {
      lead.photos.splice(Number(photoMatch[1]), 1);
      saveState(state);
      return { lead };
    }
  }

  fail(`Demo API has no route for ${method} ${p}`, 404);
  return null;
}

function getSession(state) {
  if (state.session) return state.session;
  try {
    const stored = JSON.parse(localStorage.getItem('leadflow.user') || 'null');
    if (stored) return stored;
  } catch {
    /* ignore */
  }
  return state.users[0];
}

export async function mockApi(path, opts = {}) {
  const state = loadState();
  const user = getSession(state);
  await delay(90);
  return handle(path, opts, state, user);
}

export async function mockCsv(params = {}) {
  const state = loadState();
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') query.set(k, v);
  });
  const { csv, filename, rows } = await handle(
    `/leads/export.csv?${query.toString()}`,
    { method: 'GET' },
    state,
    getSession(state)
  );
  return { csv, filename, rows };
}

export { resetState };
