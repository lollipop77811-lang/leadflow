import mongoose from 'mongoose';
import {
  CONDITIONS,
  DOCUMENTS,
  FUELS,
  LOST_REASONS,
  RC_STATUSES,
  SLOTS,
  SOURCES,
  STATUSES,
  VEHICLE_CATEGORIES,
} from '../config/env.js';

const CATEGORY_IDS = VEHICLE_CATEGORIES.map((c) => c.id);

const noteSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true, maxlength: 2000 },
    author: { type: String, default: 'Admin' },
  },
  { timestamps: true }
);

const eventSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['created', 'status', 'note', 'update', 'quote', 'pickup', 'documents', 'cd', 'assign', 'duplicate'],
      default: 'update',
    },
    message: { type: String, required: true },
    author: { type: String, default: 'System' },
  },
  { timestamps: true }
);

const vehicleSchema = new mongoose.Schema(
  {
    make: { type: String, trim: true, maxlength: 60, default: '' },
    model: { type: String, trim: true, maxlength: 60, default: '' },
    year: { type: Number, min: 1950, max: new Date().getFullYear() + 1, default: null },
    fuel: { type: String, enum: FUELS, default: 'petrol' },
    condition: { type: String, enum: CONDITIONS, default: 'running' },
    rcStatus: { type: String, enum: RC_STATUSES, default: 'original' },
    registrationNumber: { type: String, uppercase: true, trim: true, maxlength: 16, default: '' },
    category: { type: String, enum: CATEGORY_IDS, default: 'hatchback' },
    weightKg: { type: Number, default: 0, min: 0 },
    state: { type: String, trim: true, maxlength: 60, default: '' },
    rto: { type: String, trim: true, maxlength: 80, default: '' },
  },
  { _id: false }
);

const pickupSchema = new mongoose.Schema(
  {
    pincode: { type: String, trim: true, maxlength: 10, default: '' },
    city: { type: String, trim: true, maxlength: 80, default: '' },
    address: { type: String, trim: true, maxlength: 400, default: '' },
    needsTowing: { type: Boolean, default: true },
    scheduledDate: { type: Date, default: null },
    slot: { type: String, enum: [...SLOTS, ''], default: '' },
    vendor: { type: String, trim: true, maxlength: 80, default: '' },
    driver: { type: String, trim: true, maxlength: 80, default: '' },
    completedAt: { type: Date, default: null },
    noShow: { type: Boolean, default: false },
  },
  { _id: false }
);

const quoteSchema = new mongoose.Schema(
  {
    amount: { type: Number, default: 0, min: 0 },
    ratePerKg: { type: Number, default: 0, min: 0 },
    weightKg: { type: Number, default: 0, min: 0 },
    expectedAmount: { type: Number, default: 0, min: 0 }, // what the customer asked for
    sentAt: { type: Date, default: null },
  },
  { _id: false }
);

const payoutSchema = new mongoose.Schema(
  {
    amount: { type: Number, default: 0, min: 0 },
    paidAt: { type: Date, default: null },
    mode: { type: String, enum: ['cash', 'upi', 'bank', ''], default: '' },
    reference: { type: String, trim: true, maxlength: 80, default: '' },
  },
  { _id: false }
);

const cdSchema = new mongoose.Schema(
  {
    rtoSubmittedAt: { type: Date, default: null },
    rtoApprovedAt: { type: Date, default: null },
    cdNumber: { type: String, trim: true, maxlength: 60, default: '' },
    cdDate: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
  },
  { _id: false }
);

const documentsSchema = new mongoose.Schema(
  Object.fromEntries(DOCUMENTS.map((d) => [d, { type: Boolean, default: false }])),
  { _id: false }
);

const leadSchema = new mongoose.Schema(
  {
    // Contact
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 120 },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      maxlength: 20,
      index: true,
    },
    phoneKey: { type: String, index: true, default: '' }, // last 10 digits, for dedupe
    email: { type: String, lowercase: true, trim: true, default: '' },
    whatsappConsent: { type: Boolean, default: true },

    // Vehicle
    vehicle: { type: vehicleSchema, default: () => ({}) },
    photos: { type: [String], default: [] },

    // Where it is
    pickup: { type: pickupSchema, default: () => ({}) },
    outOfArea: { type: Boolean, default: false },

    // Money
    quote: { type: quoteSchema, default: () => ({}) },
    payout: { type: payoutSchema, default: () => ({}) },

    // Paperwork
    documents: { type: documentsSchema, default: () => ({}) },
    cd: { type: cdSchema, default: () => ({}) },

    // Pipeline
    status: { type: String, enum: STATUSES, default: 'new', index: true },
    statusChangedAt: { type: Date, default: Date.now },
    lostReason: { type: String, enum: [...LOST_REASONS, ''], default: '' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    assignedToName: { type: String, default: 'Unassigned', trim: true },
    followUpAt: { type: Date, default: null },
    firstContactedAt: { type: Date, default: null },

    // Attribution
    source: { type: String, enum: SOURCES, default: 'other', index: true },
    formSlug: { type: String, default: 'main', index: true },
    campaign: {
      source: { type: String, default: '' },
      medium: { type: String, default: '' },
      name: { type: String, default: '' },
      content: { type: String, default: '' },
      term: { type: String, default: '' },
      clickId: { type: String, default: '' },
      clickIdType: { type: String, default: '' },
    },

    // Dedupe
    duplicateOf: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', default: null },
    duplicateCount: { type: Number, default: 0 }, // how many times this phone has submitted

    // Meta
    tags: [{ type: String, trim: true }],
    notes: [noteSchema],
    events: [eventSchema],
    pageUrl: { type: String, default: '' },
    referrer: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    ip: { type: String, default: '' },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

leadSchema.index({ createdAt: -1 });
leadSchema.index({ followUpAt: 1 });
leadSchema.index({ 'pickup.scheduledDate': 1 });
leadSchema.index({ name: 'text', phone: 'text', 'vehicle.make': 'text', 'vehicle.model': 'text' });

leadSchema.virtual('vehicleLabel').get(function () {
  const v = this.vehicle || {};
  const parts = [v.make, v.model].filter(Boolean).join(' ');
  if (!parts) return 'Vehicle not specified';
  return [parts, v.year].filter(Boolean).join(' · ');
});

leadSchema.virtual('followUpOverdue').get(function () {
  if (!this.followUpAt) return false;
  if (['paid', 'lost'].includes(this.status)) return false;
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  return new Date(this.followUpAt) < endOfToday;
});

leadSchema.virtual('documentsDone').get(function () {
  const d = this.documents || {};
  return DOCUMENTS.filter((k) => d[k]).length;
});

/** Last 10 digits of an Indian phone number, for duplicate detection. */
export function phoneKey(phone = '') {
  const digits = String(phone).replace(/\D/g, '');
  return digits.slice(-10);
}

/** 10-digit Indian number -> +91 format for wa.me links. */
export function normalizePhone(phone = '') {
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  return digits ? `+${digits}` : '';
}

export const Lead = mongoose.model('Lead', leadSchema);
