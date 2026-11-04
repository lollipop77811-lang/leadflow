/**
 * DEMO DATA STORE
 * -----------------------------------------------------------------------------
 * A self-contained, in-browser copy of what the API returns, used when the
 * dashboard runs in demo mode (VITE_DEMO_MODE !== 'false').
 *
 * Why this exists: the client demo is a static Netlify build with no backend,
 * and we want to show the real screens with realistic data — not empty states.
 * Everything the API can do (create, quote, schedule, mark received, add notes,
 * mark paid, delete, add ad spend…) works here and is saved in localStorage,
 * so the demo behaves like the product during a walkthrough.
 *
 * Toggle off with VITE_DEMO_MODE=false to go back to the real JWT + MongoDB API.
 */

const STORE_KEY = 'leadflow.demo.v2';

/* ------------------------------------------------------------------ helpers */

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
const at = (offsetDays, hour = 10, minute = 0) => {
  const d = startOfToday();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hour, minute, 0, 0);
  return d;
};
const iso = (d) => (d ? new Date(d).toISOString() : null);
const phoneKey = (phone) => String(phone || '').replace(/\D/g, '').slice(-10);
const prettyPhone = (key) => (key.length === 10 ? `+91 ${key.slice(0, 5)} ${key.slice(5)}` : key);
const uid = (prefix) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

const WEIGHT = {
  hatchback: 900,
  sedan: 1150,
  suv: 1700,
  luxury: 1600,
  commercial: 2100,
  other: 1000,
};

/* ------------------------------------------------------------------- users */

const demoUsers = () => [
  {
    id: 'us_admin',
    name: 'Admin',
    email: 'admin@leadflow.dev',
    phone: '+91 98110 24411',
    role: 'admin',
    active: true,
    lastLoginAt: iso(new Date()),
  },
  {
    id: 'us_ravi',
    name: 'Ravi Kumar',
    email: 'ravi@leadflow.dev',
    phone: '+91 90000 12345',
    role: 'telecaller',
    active: true,
    lastLoginAt: iso(at(0, 9, 12)),
  },
  {
    id: 'us_sunil',
    name: 'Sunil Yadav',
    email: 'sunil@leadflow.dev',
    phone: '+91 90000 55112',
    role: 'telecaller',
    active: true,
    lastLoginAt: iso(at(-1, 18, 4)),
  },
  {
    id: 'us_yard',
    name: 'Yard Desk',
    email: 'yard@leadflow.dev',
    phone: '+91 90000 77881',
    role: 'yard',
    active: true,
    lastLoginAt: null,
  },
];

const OWNER = { us_admin: 'Admin', us_ravi: 'Ravi Kumar', us_sunil: 'Sunil Yadav', us_yard: 'Yard Desk' };

/* ------------------------------------------------------------------- leads */

function lead(cfg) {
  const weightKg = cfg.weightKg || WEIGHT[cfg.category || 'hatchback'] || 1000;
  const rate = cfg.rate ?? 20;
  const quoteAmount = cfg.quoteAmount ?? (cfg.hasQuote ? weightKg * rate : 0);
  const createdAt = cfg.createdAt || at(-2, 11, 30);
  const statusChangedAt = cfg.statusChangedAt || at(-1, 12, 0);
  const id = cfg.id || uid('ld');

  const events = [
    {
      type: 'created',
      message: `Lead captured from ${cfg.source} · ${cfg.make} ${cfg.model}`,
      author: 'Website',
      createdAt: iso(createdAt),
    },
  ];
  if (cfg.hasQuote) {
    events.push({
      type: 'quote',
      message: `Quote of ₹${quoteAmount.toLocaleString('en-IN')} sent on WhatsApp`,
      author: OWNER[cfg.assignedTo] || 'Ravi Kumar',
      createdAt: iso(new Date(createdAt.getTime() + 3 * 3600 * 1000)),
    });
  }
  if (cfg.scheduledDate) {
    events.push({
      type: 'pickup',
      message: `Pickup scheduled for ${iso(cfg.scheduledDate).slice(0, 10)} (${cfg.slot})`,
      author: OWNER[cfg.assignedTo] || 'Ravi Kumar',
      createdAt: iso(new Date(createdAt.getTime() + 26 * 3600 * 1000)),
    });
  }
  if (cfg.completedAt) {
    events.push({
      type: 'received',
      message: `Vehicle received at yard · ${weightKg} kg`,
      author: 'Yard Desk',
      createdAt: iso(cfg.completedAt),
    });
  }
  if (cfg.status === 'lost') {
    events.push({
      type: 'status',
      message: 'Marked as lost',
      author: OWNER[cfg.assignedTo] || 'Ravi Kumar',
      createdAt: iso(statusChangedAt),
    });
  }

  return {
    _id: id,
    id,
    name: cfg.name,
    phone: prettyPhone(cfg.phone),
    phoneKey: cfg.phone,
    email: cfg.email || '',
    whatsappConsent: cfg.whatsappConsent !== false,
    vehicle: {
      make: cfg.make,
      model: cfg.model,
      year: cfg.year,
      fuel: cfg.fuel || 'petrol',
      condition: cfg.condition || 'running',
      rcStatus: cfg.rcStatus || 'original',
      registrationNumber: cfg.registrationNumber,
      category: cfg.category || 'hatchback',
      weightKg,
      state: 'Uttar Pradesh',
      rto: cfg.rto || 'Lucknow RTO',
    },
    photos: [],
    pickup: {
      pincode: cfg.pincode,
      city: cfg.city,
      address: cfg.address || '',
      needsTowing: cfg.needsTowing ?? true,
      scheduledDate: iso(cfg.scheduledDate),
      slot: cfg.slot || '',
      vendor: cfg.vendor || '',
      driver: cfg.driver || '',
      completedAt: iso(cfg.completedAt),
      noShow: false,
    },
    outOfArea: cfg.outOfArea || false,
    quote: {
      amount: quoteAmount,
      ratePerKg: cfg.hasQuote ? rate : 0,
      weightKg: cfg.hasQuote ? weightKg : 0,
      expectedAmount: cfg.expectedAmount || 0,
      sentAt: cfg.hasQuote ? iso(new Date(createdAt.getTime() + 3 * 3600 * 1000)) : null,
    },
    payout: {
      amount: cfg.payoutAmount || 0,
      paidAt: iso(cfg.paidAt),
      mode: cfg.payoutMode || '',
      reference: cfg.payoutRef || '',
    },
    documents: {
      rc: cfg.docs?.includes('rc') ?? false,
      insurance: cfg.docs?.includes('insurance') ?? false,
      pan: cfg.docs?.includes('pan') ?? false,
      aadhaar: cfg.docs?.includes('aadhaar') ?? false,
      noc: cfg.docs?.includes('noc') ?? false,
      form2628: cfg.docs?.includes('form2628') ?? false,
    },
    cd: {
      rtoSubmittedAt: iso(cfg.rtoSubmittedAt),
      rtoApprovedAt: iso(cfg.rtoApprovedAt),
      cdNumber: cfg.cdNumber || '',
      cdDate: iso(cfg.cdDate),
      deliveredAt: iso(cfg.cdDeliveredAt),
    },
    status: cfg.status,
    statusChangedAt: iso(statusChangedAt),
    lostReason: cfg.lostReason || '',
    assignedTo: cfg.assignedTo || 'us_ravi',
    assignedToName: OWNER[cfg.assignedTo || 'us_ravi'],
    followUpAt: iso(cfg.followUpAt),
    firstContactedAt: iso(cfg.firstContactedAt),
    source: cfg.source,
    formSlug: 'main',
    campaign: {
      source: cfg.source,
      medium: cfg.source === 'google' ? 'cpc' : 'paid_social',
      name: cfg.campaign || '',
      content: cfg.campaignContent || '',
      term: '',
      clickId: '',
      clickIdType: '',
    },
    duplicateOf: null,
    duplicateCount: cfg.duplicateCount || 0,
    tags: [],
    notes: cfg.notes || [],
    events,
    pageUrl: 'https://sharmaautoscrap.in/f/main',
    referrer: '',
    userAgent: '',
    ip: '103.21.58.4',
    createdAt: iso(createdAt),
    updatedAt: iso(new Date()),
    __v: 0,
  };
}

const demoLeads = () => [
  /* ---- new ---------------------------------------------------------------- */
  lead({
    name: 'Aarav Sharma', phone: '9811024411', city: 'Lucknow', pincode: '226001',
    address: 'Hazratganj, near Sahara Ganj', make: 'Maruti Suzuki', model: 'Swift', year: 2011,
    category: 'hatchback', registrationNumber: 'UP32AB1234', source: 'instagram',
    campaign: 'IG_Reels_Scrap', campaignContent: 'reel_swift', status: 'new',
    expectedAmount: 25000, createdAt: at(0, 8, 42), statusChangedAt: at(0, 8, 42),
  }),
  lead({
    name: 'Priya Verma', phone: '9839012211', city: 'Lucknow', pincode: '226010',
    address: 'Gomti Nagar, Vibhuti Khand', make: 'Hyundai', model: 'i10', year: 2013,
    category: 'hatchback', registrationNumber: 'UP32CX7788', source: 'facebook',
    campaign: 'FB_LeadGen_Scrap', status: 'new', expectedAmount: 28000,
    createdAt: at(0, 7, 15), statusChangedAt: at(0, 7, 15), docs: ['rc'],
  }),
  lead({
    name: 'Mohit Agarwal', phone: '9005512233', city: 'Kanpur', pincode: '208001',
    make: 'Tata', model: 'Indica', year: 2009, category: 'hatchback', registrationNumber: 'UP78BG4412',
    source: 'google', campaign: 'Search_Scrap_Near_Me', status: 'new', expectedAmount: 18000,
    createdAt: at(-1, 19, 5), statusChangedAt: at(-1, 19, 5),
  }),
  lead({
    name: 'Neha Gupta', phone: '9918877665', city: 'Lucknow', pincode: '226004',
    make: 'Honda', model: 'City', year: 2012, category: 'sedan', registrationNumber: 'UP32DE9021',
    source: 'justdial', status: 'new', expectedAmount: 42000, needsTowing: false,
    createdAt: at(-1, 16, 40), statusChangedAt: at(-1, 16, 40),
  }),

  /* ---- contacted ---------------------------------------------------------- */
  lead({
    name: 'Rohit Srivastava', phone: '9876543210', city: 'Lucknow', pincode: '226016',
    address: 'Indira Nagar, Sector 14', make: 'Maruti Suzuki', model: 'Alto', year: 2010,
    category: 'hatchback', registrationNumber: 'UP32AF3311', source: 'instagram',
    campaign: 'IG_Reels_Scrap', status: 'contacted', expectedAmount: 17000,
    assignedTo: 'us_ravi', createdAt: at(-3, 10, 12), statusChangedAt: at(-3, 11, 5),
    firstContactedAt: at(-3, 10, 48), followUpAt: at(-1, 11, 0),
    notes: [{ _id: 'n1', text: 'Customer is moving to Delhi, wants pickup next week.', author: 'Ravi Kumar', createdAt: iso(at(-1, 11, 20)) }],
  }),
  lead({
    name: 'Anita Mishra', phone: '9765410033', city: 'Lucknow', pincode: '226021',
    make: 'Chevrolet', model: 'Beat', year: 2011, category: 'hatchback', registrationNumber: 'UP32HB5566',
    source: 'facebook', campaign: 'FB_LeadGen_Scrap', status: 'contacted', expectedAmount: 19000,
    assignedTo: 'us_ravi', createdAt: at(-2, 14, 0), statusChangedAt: at(-2, 14, 30),
    firstContactedAt: at(-2, 14, 25), followUpAt: at(0, 12, 0),
  }),
  lead({
    name: 'Imran Khan', phone: '9935507788', city: 'Barabanki', pincode: '225001',
    make: 'Maruti Suzuki', model: 'Omni', year: 2008, category: 'commercial', registrationNumber: 'UP41AC8899',
    source: 'olx', status: 'contacted', expectedAmount: 22000, assignedTo: 'us_sunil',
    createdAt: at(-4, 9, 10), statusChangedAt: at(-4, 9, 40), firstContactedAt: at(-4, 9, 35),
    followUpAt: at(1, 11, 0), outOfArea: true,
  }),

  /* ---- quoted ------------------------------------------------------------- */
  lead({
    name: 'Sunita Rani', phone: '9990011223', city: 'Lucknow', pincode: '226003',
    address: 'Alambagh, near Phoenix Mall', make: 'Hyundai', model: 'Santro', year: 2009,
    category: 'hatchback', registrationNumber: 'UP32JA1010', source: 'instagram',
    campaign: 'IG_Reels_Scrap', status: 'quoted', expectedAmount: 20000, hasQuote: true,
    rate: 21, assignedTo: 'us_ravi', createdAt: at(-5, 12, 20), statusChangedAt: at(-4, 10, 0),
    firstContactedAt: at(-5, 12, 55), followUpAt: at(0, 15, 30), docs: ['rc', 'insurance'],
  }),
  lead({
    name: 'Deepak Chaurasia', phone: '9807700456', city: 'Lucknow', pincode: '226022',
    make: 'Tata', model: 'Sumo', year: 2007, category: 'suv', registrationNumber: 'UP32KB4455',
    source: 'google', campaign: 'Search_Scrap_Near_Me', status: 'quoted', expectedAmount: 45000,
    hasQuote: true, rate: 19, assignedTo: 'us_sunil', createdAt: at(-6, 11, 0),
    statusChangedAt: at(-5, 16, 0), firstContactedAt: at(-6, 11, 30), followUpAt: at(-1, 10, 0),
    notes: [{ _id: 'n2', text: 'Wants ₹40k. Explained weight-based pricing. Call again Friday.', author: 'Sunil Yadav', createdAt: iso(at(-2, 17, 10)) }],
  }),
  lead({
    name: 'Kavita Singh', phone: '9455512009', city: 'Unnao', pincode: '209801',
    make: 'Maruti Suzuki', model: 'WagonR', year: 2012, category: 'hatchback',
    registrationNumber: 'UP35AB1122', source: 'whatsapp', campaign: 'WA_Broadcast_Scrap',
    status: 'quoted', expectedAmount: 26000, hasQuote: true, rate: 22, assignedTo: 'us_yard',
    createdAt: at(-3, 17, 45), statusChangedAt: at(-2, 10, 15), firstContactedAt: at(-3, 18, 10),
    followUpAt: at(2, 11, 0), docs: ['rc'],
  }),

  /* ---- pickup scheduled --------------------------------------------------- */
  lead({
    name: 'Meera Joshi', phone: '9871109988', city: 'Lucknow', pincode: '226005',
    address: 'Rajajipuram, E-Block, house 214', make: 'Mahindra', model: 'Bolero', year: 2008,
    category: 'suv', registrationNumber: 'UP32LM7788', source: 'instagram',
    campaign: 'IG_Reels_Scrap', status: 'pickup_scheduled', expectedAmount: 55000, hasQuote: true,
    rate: 20, assignedTo: 'us_ravi', createdAt: at(-8, 10, 0), statusChangedAt: at(-2, 12, 0),
    firstContactedAt: at(-8, 10, 40), scheduledDate: at(0, 11, 0), slot: 'morning',
    vendor: 'Gupta Towing', driver: 'Rakesh (Towing)', docs: ['rc', 'insurance', 'aadhaar'],
  }),
  lead({
    name: 'Pankaj Tiwari', phone: '9936604411', city: 'Lucknow', pincode: '226012',
    address: 'Krishna Nagar, near police chowki', make: 'Ford', model: 'Figo', year: 2011,
    category: 'hatchback', registrationNumber: 'UP32NC3344', source: 'facebook',
    campaign: 'FB_LeadGen_Scrap', status: 'pickup_scheduled', expectedAmount: 30000,
    hasQuote: true, rate: 23, assignedTo: 'us_sunil', createdAt: at(-7, 9, 30),
    statusChangedAt: at(-1, 15, 0), firstContactedAt: at(-7, 10, 0), scheduledDate: at(1, 16, 0),
    slot: 'evening', vendor: 'Gupta Towing', driver: 'Sunil (Driver)', docs: ['rc', 'pan'],
  }),

  /* ---- vehicle received --------------------------------------------------- */
  lead({
    name: 'Vikas Pandey', phone: '9005511777', city: 'Lucknow', pincode: '226020',
    make: 'Chevrolet', model: 'Tavera', year: 2009, category: 'suv', registrationNumber: 'UP32PD6611',
    source: 'google', campaign: 'Search_Scrap_Near_Me', status: 'vehicle_received',
    expectedAmount: 48000, hasQuote: true, rate: 20, assignedTo: 'us_ravi',
    createdAt: at(-12, 11, 0), statusChangedAt: at(-4, 13, 0), firstContactedAt: at(-12, 11, 35),
    scheduledDate: at(-4, 11, 0), slot: 'afternoon', vendor: 'Gupta Towing',
    completedAt: at(-4, 13, 0), docs: ['rc', 'insurance', 'pan', 'aadhaar', 'noc'],
    payoutAmount: 34000, rtoSubmittedAt: at(-3, 11, 0),
  }),
  lead({
    name: 'Shalini Dubey', phone: '9415500223', city: 'Lucknow', pincode: '226008',
    make: 'Maruti Suzuki', model: 'Estilo', year: 2010, category: 'hatchback',
    registrationNumber: 'UP32RE8899', source: 'instagram', campaign: 'IG_Reels_Scrap',
    status: 'vehicle_received', expectedAmount: 21000, hasQuote: true, rate: 21,
    assignedTo: 'us_sunil', createdAt: at(-10, 16, 0), statusChangedAt: at(-2, 12, 30),
    firstContactedAt: at(-10, 16, 25), scheduledDate: at(-2, 12, 0), slot: 'morning',
    completedAt: at(-2, 12, 30), docs: ['rc', 'aadhaar'], payoutAmount: 18900,
  }),

  /* ---- deregistered / CD -------------------------------------------------- */
  lead({
    name: 'Karthik Raman', phone: '9889900112', city: 'Lucknow', pincode: '226024',
    make: 'Toyota', model: 'Innova', year: 2010, category: 'suv', registrationNumber: 'UP32TS2211',
    source: 'google', campaign: 'Search_Scrap_Near_Me', status: 'deregistered',
    expectedAmount: 85000, hasQuote: true, rate: 20, assignedTo: 'us_ravi',
    createdAt: at(-20, 10, 0), statusChangedAt: at(-6, 12, 0), firstContactedAt: at(-20, 10, 30),
    scheduledDate: at(-9, 11, 0), slot: 'morning', completedAt: at(-9, 12, 0),
    docs: ['rc', 'insurance', 'pan', 'aadhaar', 'noc', 'form2628'], payoutAmount: 68000,
    rtoSubmittedAt: at(-8, 11, 0), rtoApprovedAt: at(-3, 16, 0), cdNumber: 'CD/UP/2026/00412',
    cdDate: at(-3, 16, 0), cdDeliveredAt: at(-2, 11, 30),
    notes: [{ _id: 'n3', text: 'CD dispatched by courier, tracking shared on WhatsApp.', author: 'Ravi Kumar', createdAt: iso(at(-2, 11, 40)) }],
  }),

  /* ---- paid --------------------------------------------------------------- */
  lead({
    name: 'Sunil Bhatt', phone: '9822211004', city: 'Lucknow', pincode: '226014',
    make: 'Honda', model: 'Amaze', year: 2013, category: 'sedan', registrationNumber: 'UP32YT5544',
    source: 'facebook', campaign: 'FB_LeadGen_Scrap', status: 'paid', expectedAmount: 52000,
    hasQuote: true, rate: 20, assignedTo: 'us_ravi', createdAt: at(-25, 9, 0),
    statusChangedAt: at(-12, 15, 0), firstContactedAt: at(-25, 9, 40), scheduledDate: at(-13, 11, 0),
    completedAt: at(-13, 12, 0), docs: ['rc', 'insurance', 'pan', 'aadhaar', 'noc', 'form2628'],
    rtoSubmittedAt: at(-12, 10, 0), rtoApprovedAt: at(-8, 12, 0), cdNumber: 'CD/UP/2026/00317',
    cdDate: at(-8, 12, 0), cdDeliveredAt: at(-7, 10, 0), payoutAmount: 46000,
    paidAt: at(-7, 17, 0), payoutMode: 'bank', payoutRef: 'NEFT/ICIC/889201',
  }),
  lead({
    name: 'Ritu Saxena', phone: '9755500311', city: 'Lucknow', pincode: '226006',
    make: 'Maruti Suzuki', model: 'Dzire', year: 2012, category: 'sedan', registrationNumber: 'UP32GH9900',
    source: 'instagram', campaign: 'IG_Reels_Scrap', status: 'paid', expectedAmount: 48000,
    hasQuote: true, rate: 21, assignedTo: 'us_sunil', createdAt: at(-18, 13, 0),
    statusChangedAt: at(-5, 14, 0), firstContactedAt: at(-18, 13, 30), scheduledDate: at(-7, 11, 0),
    completedAt: at(-7, 12, 0), docs: ['rc', 'insurance', 'pan', 'aadhaar', 'noc', 'form2628'],
    rtoSubmittedAt: at(-6, 10, 0), rtoApprovedAt: at(-4, 12, 0), cdNumber: 'CD/UP/2026/00405',
    cdDate: at(-4, 12, 0), payoutAmount: 40000, paidAt: at(-1, 16, 30), payoutMode: 'upi',
    payoutRef: 'UPI/rittu@okhdfc', cdDeliveredAt: at(-1, 17, 0),
  }),

  /* ---- lost --------------------------------------------------------------- */
  lead({
    name: 'Ajay Yadav', phone: '9918800112', city: 'Lucknow', pincode: '226017',
    make: 'Tata', model: 'Nano', year: 2012, category: 'hatchback', registrationNumber: 'UP32NN1234',
    source: 'olx', status: 'lost', lostReason: 'price_low', expectedAmount: 22000,
    hasQuote: true, rate: 20, assignedTo: 'us_ravi', createdAt: at(-15, 10, 0),
    statusChangedAt: at(-13, 12, 0), firstContactedAt: at(-15, 10, 20),
  }),
  lead({
    name: 'Farhan Ali', phone: '9001100223', city: 'Sitapur', pincode: '261001',
    make: 'Maruti Suzuki', model: '800', year: 2006, category: 'hatchback', registrationNumber: 'UP34AC7788',
    source: 'facebook', campaign: 'FB_LeadGen_Scrap', status: 'lost', lostReason: 'out_of_area',
    expectedAmount: 15000, assignedTo: 'us_sunil', createdAt: at(-9, 15, 0),
    statusChangedAt: at(-9, 15, 30), outOfArea: true,
  }),
  lead({
    name: 'Sanjay Kapoor', phone: '9876001234', city: 'Lucknow', pincode: '226010',
    make: 'Hyundai', model: 'Verna', year: 2010, category: 'sedan', registrationNumber: 'UP32VK4321',
    source: 'justdial', status: 'lost', lostReason: 'unreachable', expectedAmount: 40000,
    hasQuote: true, rate: 20, assignedTo: 'us_admin', createdAt: at(-11, 12, 0),
    statusChangedAt: at(-6, 12, 0), firstContactedAt: at(-11, 12, 30), duplicateCount: 2,
  }),
];

/* ------------------------------------------------------------------- spend */

const monthKey = (offset) => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const demoSpend = () =>
  [0, -1].flatMap((offset) =>
    [
      { campaignName: 'IG_Reels_Scrap', source: 'instagram', amount: 2800, notes: 'Meta Ads Manager' },
      { campaignName: 'FB_LeadGen_Scrap', source: 'facebook', amount: 2100, notes: 'Meta Ads Manager' },
      { campaignName: 'Search_Scrap_Near_Me', source: 'google', amount: 2400, notes: 'Google Ads' },
      { campaignName: 'WA_Broadcast_Scrap', source: 'whatsapp', amount: 500, notes: 'WhatsApp broadcast tool' },
    ].map((row) => ({
      _id: uid('sp'),
      id: uid('sp'),
      ...row,
      month: monthKey(offset),
      createdBy: 'Admin',
      createdAt: iso(at(-20)),
      updatedAt: iso(at(-20)),
    }))
  );

/* ------------------------------------------------------------------- store */

export function freshState() {
  return {
    version: 2,
    users: demoUsers(),
    leads: demoLeads(),
    spend: demoSpend(),
    session: null,
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.version === 2 && Array.isArray(parsed.leads)) return parsed;
    }
  } catch {
    /* corrupted store → rebuild */
  }
  const state = freshState();
  saveState(state);
  return state;
}

export function saveState(state) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch {
    /* private mode / quota — demo still works in memory for this page */
  }
}

export function resetState() {
  localStorage.removeItem(STORE_KEY);
  return loadState();
}

export { WEIGHT, phoneKey, prettyPhone, uid, iso, at, startOfToday, OWNER };
