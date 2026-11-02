import { Router } from 'express';
import { Lead } from '../models/Lead.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';
import { STATUSES } from '../config/env.js';

const router = Router();
router.use(requireAuth);

const startOfDay = (d = new Date()) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

// GET /api/stats
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const now = new Date();
    const today = startOfDay(now);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 6);
    const monthAgo = new Date(today);
    monthAgo.setDate(monthAgo.getDate() - 29);
    const timelineStart = new Date(today);
    timelineStart.setDate(timelineStart.getDate() - 13);

    const [byStatus, bySource, byCampaign, timelineRaw, totalsRaw, todayCount, weekCount, monthCount, recent] =
      await Promise.all([
        Lead.aggregate([{ $group: { _id: '$status', count: { $sum: 1 }, value: { $sum: '$value' } } }]),
        Lead.aggregate([{ $group: { _id: '$source', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
        Lead.aggregate([
          { $match: { 'campaign.name': { $nin: [null, ''] } } },
          {
            $group: {
              _id: { name: '$campaign.name', source: '$campaign.source' },
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1 } },
          { $limit: 6 },
        ]),
        Lead.aggregate([
          { $match: { createdAt: { $gte: timelineStart } } },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              count: { $sum: 1 },
            },
          },
        ]),
        Lead.aggregate([
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              pipelineValue: {
                $sum: {
                  $cond: [{ $in: ['$status', ['new', 'contacted', 'qualified']] }, '$value', 0],
                },
              },
              wonValue: {
                $sum: { $cond: [{ $eq: ['$status', 'converted'] }, '$value', 0] },
              },
              converted: { $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] } },
              lost: { $sum: { $cond: [{ $eq: ['$status', 'lost'] }, 1, 0] } },
            },
          },
        ]),
        Lead.countDocuments({ createdAt: { $gte: today } }),
        Lead.countDocuments({ createdAt: { $gte: weekAgo } }),
        Lead.countDocuments({ createdAt: { $gte: monthAgo } }),
        Lead.find().sort({ createdAt: -1 }).limit(6).lean(),
      ]);

    const totals = totalsRaw[0] || { total: 0, pipelineValue: 0, wonValue: 0, converted: 0, lost: 0 };

    // Fill every day in the window so the chart has no gaps.
    const map = new Map(timelineRaw.map((r) => [r._id, r.count]));
    const timeline = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(timelineStart);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      return { date: key, count: map.get(key) || 0 };
    });

    const statusMap = Object.fromEntries(byStatus.map((s) => [s._id, s.count]));

    res.json({
      totals: {
        total: totals.total,
        today: todayCount,
        week: weekCount,
        month: monthCount,
        converted: totals.converted,
        lost: totals.lost,
        conversionRate: totals.total ? Math.round((totals.converted / totals.total) * 1000) / 10 : 0,
        pipelineValue: totals.pipelineValue,
        wonValue: totals.wonValue,
        avgValue: totals.total ? Math.round(totals.wonValue / Math.max(1, totals.converted)) : 0,
      },
      byStatus: STATUSES.map((s) => ({ status: s, count: statusMap[s] || 0 })),
      bySource: bySource.map((s) => ({ source: s._id || 'other', count: s.count })),
      byCampaign: byCampaign.map((c) => ({
        name: c._id.name,
        source: c._id.source || 'other',
        count: c.count,
      })),
      timeline,
      recent: recent.map((l) => ({ ...l, id: l._id.toString() })),
      generatedAt: now.toISOString(),
    });
  })
);

export default router;
