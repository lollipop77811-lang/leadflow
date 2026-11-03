import mongoose from 'mongoose';

const adSpendSchema = new mongoose.Schema(
  {
    campaignName: { type: String, required: true, trim: true, maxlength: 120 },
    source: { type: String, default: 'other', trim: true },
    month: { type: String, required: true, match: /^\d{4}-\d{2}$/ }, // YYYY-MM
    amount: { type: Number, required: true, min: 0 },
    notes: { type: String, default: '', trim: true, maxlength: 300 },
    createdBy: { type: String, default: 'Admin' },
  },
  { timestamps: true }
);

adSpendSchema.index({ month: 1, campaignName: 1 });

export const AdSpend = mongoose.model('AdSpend', adSpendSchema);
