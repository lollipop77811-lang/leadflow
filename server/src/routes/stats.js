import { Router } from 'express';
import { Lead } from '../models/Lead.js';
import { AdSpend } from '../models/AdSpend.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';
import { LOST_REASONS, STATUSES } from '../config/env.js';

const router = Router();
router.use(requireAuth);

const startOfDay = (d = new Date()) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const monthKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

const RECEIVED = ['vehicle_received', 'deregistered', 'paid'];

/** Monthly ad spend, prorated onto an arbitrary [start, end] window. */
function spendInWindow(rows, start, end) {
  const map = new Map();
  const MS_DAY = 86400000;
  rows.forEach((r) => {
    const [y, m] = String(r.month).split('-').map(Number);
    if (!y || !m) return;
    const monthStart = new Date(y, m - 1, 1);
    const monthEnd = new Date(y, m, 0, 23, 59, 59, 999);
    const daysInMonth = monthEnd.getDate();
    const from = Math.max(monthStart.getTime(), start.getTime());
    const to = Math.min(monthEnd.getTime(), end.getTime());
    if (to < from) return;
    const days = Math.round((to - from) / MS_DAY) + 1;
    map.set(r._id, (map.get(r._id) || 0) + r.spend * (days / daysInMonth));
  });
  return map;
}
const OPEN = ['new', 'contacted', 'quoted', 'pickup_scheduled'];

// GET /api/stats
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const now = new Date();
    const today = startOfDay(now);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 6);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthAgo = new Date(today);
    monthAgo.setDate(monthAgo.getDate() - 29);
    const timelineStart = new Date(today);
    timelineStart.setDate(timelineStart.getDate() - 13);
    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);

    const scope = req.user.role === 'admin' ? {} : { assignedTo: req.user._id };
    const scoped = (extra = {}) => ({ $match: { ...scope, ...extra } });

    const [
      byStatus,
      bySource,
      lostReasons,
      timelineRaw,
      totalsRaw,
      todayCount,
      weekCount,
      last30Count,
      responseRaw,
      followUpCounts,
      pickupsToday,
      recent,
      leadCampaigns,
      spendRows,
    ] = await Promise.all([
      Lead.aggregate([
        scoped(),
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            quote: { $sum: '$quote.amount' },
          },
        },
      ]),
      Lead.aggregate([scoped(), { $group: { _id: '$source', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      Lead.aggregate([
        scoped({ status: 'lost', lostReason: { $nin: [null, ''] } }),
        { $group: { _id: '$lostReason', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Lead.aggregate([
        scoped({ createdAt: { $gte: timelineStart } }),
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      ]),
      Lead.aggregate([
        scoped(),
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            openLeads: { $sum: { $cond: [{ $in: ['$status', OPEN] }, 1, 0] } },
            quotesOut: { $sum: { $cond: [{ $gt: ['$quote.amount', 0] }, 1, 0] } },
            receivedMonth: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $in: ['$status', RECEIVED] },
                      { $gte: ['$statusChangedAt', monthStart] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            received30: {
              $sum: {
                $cond: [
                  { $and: [{ $in: ['$status', RECEIVED] }, { $gte: ['$statusChangedAt', monthAgo] }] },
                  1,
                  0,
                ],
              },
            },
            tonnageMonth: {
              $sum: {
                $cond: [
                  { $and: [{ $in: ['$status', RECEIVED] }, { $gte: ['$statusChangedAt', monthStart] }] },
                  { $ifNull: ['$vehicle.weightKg', 0] },
                  0,
                ],
              },
            },
            pendingPayout: {
              $sum: {
                $cond: [
                  { $in: ['$status', ['vehicle_received', 'deregistered']] },
                  { $ifNull: ['$payout.amount', 0] },
                  0,
                ],
              },
            },
            paidMonth: {
              $sum: {
                $cond: [{ $eq: ['$status', 'paid'] }, { $ifNull: ['$payout.amount', 0] }, 0],
              },
            },
            openQuoteValue: {
              $sum: { $cond: [{ $in: ['$status', OPEN] }, '$quote.amount', 0] },
            },
            lost: { $sum: { $cond: [{ $eq: ['$status', 'lost'] }, 1, 0] } },
          },
        },
      ]),
      Lead.countDocuments({ ...scope, createdAt: { $gte: today } }),
      Lead.countDocuments({ ...scope, createdAt: { $gte: weekAgo } }),
      Lead.countDocuments({ ...scope, createdAt: { $gte: monthAgo } }),
      Lead.aggregate([
        scoped({ firstContactedAt: { $ne: null } }),
        {
          $project: {
            mins: {
              $divide: [{ $subtract: ['$firstContactedAt', '$createdAt'] }, 60000],
            },
          },
        },
        { $group: { _id: null, avg: { $avg: '$mins' } } },
      ]),
      Promise.all([
        Lead.countDocuments({
          ...scope,
          status: { $nin: ['paid', 'lost'] },
          followUpAt: { $lt: today },
        }),
        Lead.countDocuments({
          ...scope,
          status: { $nin: ['paid', 'lost'] },
          followUpAt: { $gte: today, $lte: endOfToday },
        }),
      ]),
      Lead.countDocuments({
        ...scope,
        status: { $in: ['pickup_scheduled', 'vehicle_received', 'deregistered'] },
        'pickup.scheduledDate': { $gte: today, $lte: endOfToday },
      }),
      Lead.find(scope).sort({ createdAt: -1 }).limit(6).lean(),
      Lead.aggregate([
        scoped({ createdAt: { $gte: monthAgo }, 'campaign.name': { $nin: [null, ''] } }),
        {
          $group: {
            _id: { name: '$campaign.name', source: '$campaign.source' },
            leads: { $sum: 1 },
            received: { $sum: { $cond: [{ $in: ['$status', RECEIVED] }, 1, 0] } },
          },
        },
        { $sort: { leads: -1 } },
        { $limit: 12 },
      ]),
      AdSpend.find().lean(),
    ]);

    const totals = totalsRaw[0] || {};

    // Prorate each monthly spend entry onto the last-30-days window.
    const spendMap = new Map();
    spendRows.forEach((row) => {
      const parts = spendInWindow([{ _id: row._id, month: row.month, spend: row.amount }], monthAgo, now);
      parts.forEach((value) => {
        spendMap.set(row.campaignName, (spendMap.get(row.campaignName) || 0) + value);
      });
    });

    // Fill every day in the window so the chart has no gaps.
    const dayMap = new Map(timelineRaw.map((r) => [r._id, r.count]));
    const timeline = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(timelineStart);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      return { date: key, count: dayMap.get(key) || 0 };
    });

    const statusMap = Object.fromEntries(byStatus.map((s) => [s._id, s.count]));

    const byCampaign = leadCampaigns.map((c) => {
      const spend = Math.round(spendMap.get(c._id.name) || 0);
      return {
        name: c._id.name,
        source: c._id.source || 'other',
        leads: c.leads,
        received: c.received,
        spend,
        cpl: spend && c.leads ? Math.round(spend / c.leads) : 0,
        costPerPickup: spend && c.received ? Math.round(spend / c.received) : 0,
      };
    });

    // Campaigns that have spend but no leads yet still deserve a row.
    spendMap.forEach((spend, name) => {
      if (!byCampaign.some((c) => c.name === name) && spend > 0) {
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
    byCampaign.sort((a, b) => b.leads - a.leads || b.spend - a.spend);

    const totalSpend = Math.round([...spendMap.values()].reduce((a, b) => a + b, 0));
    const receivedMonth = totals.receivedMonth || 0;

    res.json({
      totals: {
        total: totals.total || 0,
        today: todayCount,
        week: weekCount,
        openLeads: totals.openLeads || 0,
        quotesOut: totals.quotesOut || 0,
        receivedMonth,
        received30: totals.received30 || 0,
        tonnageMonth: Math.round(totals.tonnageMonth || 0),
        pendingPayout: totals.pendingPayout || 0,
        paidMonth: totals.paidMonth || 0,
        openQuoteValue: totals.openQuoteValue || 0,
        lost: totals.lost || 0,
        conversionRate: totals.total
          ? Math.round(((totals.received30 || 0) / totals.total) * 1000) / 10
          : 0,
        avgResponseMins: Math.round(responseRaw[0]?.avg || 0),
        last30: last30Count,
        cpl: totalSpend && last30Count ? Math.round(totalSpend / last30Count) : 0,
        totalSpend,
        costPerPickup: totalSpend && (totals.received30 || 0)
          ? Math.round(totalSpend / totals.received30)
          : 0,
      },
      byStatus: STATUSES.map((s) => ({
        status: s,
        count: statusMap[s] || 0,
        quote: byStatus.find((x) => x._id === s)?.quote || 0,
      })),
      bySource: bySource.map((s) => ({ source: s._id || 'other', count: s.count })),
      lostReasons: LOST_REASONS.map((r) => {
        const hit = lostReasons.find((x) => x._id === r);
        return { reason: r, count: hit?.count || 0 };
      }),
      byCampaign,
      timeline,
      followUps: { overdue: followUpCounts[0], today: followUpCounts[1] },
      pickupsToday,
      recent: recent.map((l) => ({ ...l, id: l._id.toString() })),
      month: monthKey(now),
      generatedAt: now.toISOString(),
    });
  })
);

export default router;
