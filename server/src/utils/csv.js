const fmtDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');

const COLUMNS = [
  ['Name', (l) => l.name],
  ['Phone', (l) => l.phone],
  ['Email', (l) => l.email],
  ['Vehicle', (l) => [l.vehicle?.make, l.vehicle?.model].filter(Boolean).join(' ')],
  ['Year', (l) => l.vehicle?.year || ''],
  ['Fuel', (l) => l.vehicle?.fuel || ''],
  ['Condition', (l) => l.vehicle?.condition || ''],
  ['RC status', (l) => l.vehicle?.rcStatus || ''],
  ['Registration no.', (l) => l.vehicle?.registrationNumber || ''],
  ['Category', (l) => l.vehicle?.category || ''],
  ['Weight (kg)', (l) => l.vehicle?.weightKg || ''],
  ['Quote (₹)', (l) => l.quote?.amount || 0],
  ['Final payout (₹)', (l) => l.payout?.amount || 0],
  ['Paid on', (l) => fmtDate(l.payout?.paidAt)],
  ['Status', (l) => l.status],
  ['Lost reason', (l) => l.lostReason || ''],
  ['Assigned to', (l) => l.assignedToName || 'Unassigned'],
  ['Follow-up', (l) => fmtDate(l.followUpAt)],
  ['Pickup date', (l) => fmtDate(l.pickup?.scheduledDate)],
  ['Pickup slot', (l) => l.pickup?.slot || ''],
  ['Pincode', (l) => l.pickup?.pincode || ''],
  ['City', (l) => l.pickup?.city || ''],
  ['Docs done', (l) => `${Object.values(l.documents || {}).filter(Boolean).length}/6`],
  ['CD number', (l) => l.cd?.cdNumber || ''],
  ['Source', (l) => l.source],
  ['Campaign', (l) => l.campaign?.name || ''],
  ['Created at', (l) => (l.createdAt ? new Date(l.createdAt).toISOString() : '')],
  ['Notes', (l) => (l.notes || []).map((n) => n.text).join(' | ')],
];

const esc = (val) => {
  const s = val === null || val === undefined ? '' : String(val);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function leadsToCsv(leads) {
  const header = COLUMNS.map(([h]) => esc(h)).join(',');
  const rows = leads.map((l) => COLUMNS.map(([, get]) => esc(get(l))).join(','));
  return [header, ...rows].join('\r\n');
}
