import { Router } from 'express';
import { AdSpend } from '../models/AdSpend.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';

const router = Router();
router.use(requireAuth);

// GET /api/spend?month=YYYY-MM
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const filter = {};
    if (req.query.month) filter.month = req.query.month;
    const rows = await AdSpend.find(filter).sort({ month: -1, createdAt: -1 }).lean();
    res.json({ items: rows.map((r) => ({ ...r, id: r._id.toString() })) });
  })
);

// POST /api/spend
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { campaignName, source = 'other', month, amount, notes = '' } = req.body || {};
    if (!campaignName || !month || !/^\d{4}-\d{2}$/.test(String(month))) {
      return res.status(400).json({ message: 'Campaign name and month (YYYY-MM) are required.' });
    }
    if (!(Number(amount) > 0)) {
      return res.status(400).json({ message: 'Enter the amount spent (greater than 0).' });
    }

    const row = await AdSpend.create({
      campaignName: String(campaignName).trim(),
      source,
      month,
      amount: Number(amount),
      notes,
      createdBy: req.user.name,
    });
    res.status(201).json({ item: { ...row.toObject(), id: row._id.toString() } });
  })
);

// DELETE /api/spend/:id (admin)
router.delete(
  '/:id',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const deleted = await AdSpend.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Spend entry not found.' });
    res.json({ message: 'Deleted.', id: req.params.id });
  })
);

export default router;
