import mongoose from 'mongoose';
import { SOURCES, STATUSES } from '../config/env.js';

const noteSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true, maxlength: 2000 },
    author: { type: String, default: 'Admin' },
  },
  { timestamps: true }
);

const eventSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['created', 'status', 'note', 'update'], default: 'update' },
    message: { type: String, required: true },
    author: { type: String, default: 'System' },
  },
  { timestamps: true }
);

const leadSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 120 },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, 'Please enter a valid email'],
    },
    phone: { type: String, trim: true, maxlength: 32, default: '' },
    company: { type: String, trim: true, maxlength: 160, default: '' },
    message: { type: String, trim: true, maxlength: 2000, default: '' },

    // Where the lead came from
    source: { type: String, enum: SOURCES, default: 'other', index: true },
    formSlug: { type: String, default: 'main', index: true },

    // Ad / UTM attribution
    campaign: {
      source: { type: String, default: '' }, // utm_source  e.g. instagram
      medium: { type: String, default: '' }, // utm_medium  e.g. paid_social
      name: { type: String, default: '' }, // utm_campaign
      content: { type: String, default: '' }, // utm_content / ad variant
      term: { type: String, default: '' }, // utm_term
      clickId: { type: String, default: '' }, // fbclid / gclid / ttclid
      clickIdType: { type: String, default: '' },
    },

    status: { type: String, enum: STATUSES, default: 'new', index: true },
    value: { type: Number, default: 0, min: 0 }, // estimated deal value
    tags: [{ type: String, trim: true }],
    owner: { type: String, default: 'Unassigned', trim: true },

    // Technical attribution captured at submit time
    pageUrl: { type: String, default: '' },
    referrer: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    ip: { type: String, default: '' },

    notes: [noteSchema],
    events: [eventSchema],
    lastContactedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

leadSchema.index({ createdAt: -1 });
leadSchema.index({ name: 'text', email: 'text', company: 'text', phone: 'text' });

leadSchema.virtual('displaySource').get(function () {
  return this.campaign?.source || this.source;
});

export const Lead = mongoose.model('Lead', leadSchema);
