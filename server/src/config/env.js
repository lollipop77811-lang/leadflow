import 'dotenv/config';

const bool = (v, fallback = false) =>
  v === undefined ? fallback : String(v).toLowerCase() === 'true';

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
};

export const SOURCES = [
  'instagram',
  'facebook',
  'google',
  'linkedin',
  'youtube',
  'whatsapp',
  'website',
  'other',
];

export const STATUSES = ['new', 'contacted', 'qualified', 'converted', 'lost'];
