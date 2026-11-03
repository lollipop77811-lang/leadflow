import 'dotenv/config';

const bool = (v, fallback = false) =>
  v === undefined ? fallback : String(v).toLowerCase() === 'true';

const list = (v, fallback = []) =>
  v === undefined || v === ''
    ? fallback
    : String(v)
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);

export const env = {
  port: Number(process.env.PORT || 5000),
  mongoUri: process.env.MONGODB_URI?.trim() || '',
  allowMemoryDb: bool(process.env.ALLOW_MEMORY_DB, true),
  seedDemo: bool(process.env.SEED_DEMO, true),
  jwtSecret: process.env.JWT_SECRET || 'dev-only-insecure-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  admin: {
    name: process.env.ADMIN_NAME || 'Admin',
    email: (process.env.ADMIN_EMAIL || 'admin@leadflow.dev').toLowerCase(),
    password: process.env.ADMIN_PASSWORD || 'admin123',
  },
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',

  // Scrapping defaults
  scrapRate: Number(process.env.SCRAP_RATE_PER_KG || 20), // ₹ per kg
  // Empty list = serve everywhere. e.g. SERVICE_PINCODES=226001,226002,226010
  servicePincodes: list(process.env.SERVICE_PINCODES, []),
  // Instant new-lead alerts (optional)
  telegram: {
    token: process.env.TELEGRAM_BOT_TOKEN || '',
    chatId: process.env.TELEGRAM_CHAT_ID || '',
  },
  alertWebhookUrl: process.env.ALERT_WEBHOOK_URL || '',

  brand: {
    name: process.env.BRAND_NAME || 'LeadFlow Autoscrap',
    rvsfNumber: process.env.RVSF_NUMBER || 'RVSF/UP/2024/0000',
    phone: process.env.BRAND_PHONE || '+91 90000 00000',
    whatsapp: process.env.BRAND_WHATSAPP || '919000000000',
  },
};

/* ------------------------------------------------------------------ */
/* Shared enums (mirrored in client/src/lib/meta.js)                   */
/* ------------------------------------------------------------------ */

export const SOURCES = [
  'instagram',
  'facebook',
  'google',
  'whatsapp',
  'justdial',
  'olx',
  'walkin',
  'youtube',
  'linkedin',
  'website',
  'other',
];

export const STATUSES = [
  'new',
  'contacted',
  'quoted',
  'pickup_scheduled',
  'vehicle_received',
  'deregistered',
  'paid',
  'lost',
];

export const LOST_REASONS = [
  'price_low',
  'out_of_area',
  'sold_elsewhere',
  'unreachable',
  'not_eligible',
  'rc_stuck',
  'not_ready',
  'other',
];

export const FUELS = ['petrol', 'diesel', 'cng', 'ev', 'hybrid', 'other'];

export const CONDITIONS = ['running', 'non_running', 'accident', 'fire', 'flood'];

export const RC_STATUSES = ['original', 'duplicate', 'lost', 'financed'];

export const VEHICLE_CATEGORIES = [
  { id: 'hatchback', label: 'Hatchback (Alto, Swift, i10…)', defaultWeight: 900 },
  { id: 'sedan', label: 'Sedan (Dzire, City, Verna…)', defaultWeight: 1150 },
  { id: 'suv', label: 'SUV / MUV (Bolero, Innova, Scorpio…)', defaultWeight: 1700 },
  { id: 'luxury', label: 'Luxury (Audi, BMW, Mercedes…)', defaultWeight: 1600 },
  { id: 'commercial', label: 'Commercial / Van / Pickup', defaultWeight: 2100 },
  { id: 'other', label: 'Other / Not sure', defaultWeight: 1000 },
];

export const DOCUMENTS = ['rc', 'insurance', 'pan', 'aadhaar', 'noc', 'form2628'];

export const SLOTS = ['morning', 'afternoon', 'evening'];
