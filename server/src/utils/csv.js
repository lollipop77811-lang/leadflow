const COLUMNS = [
  ['Name', (l) => l.name],
  ['Email', (l) => l.email],
  ['Phone', (l) => l.phone],
  ['Company', (l) => l.company],
  ['Status', (l) => l.status],
  ['Source', (l) => l.source],
  ['Campaign', (l) => l.campaign?.name],
  ['Ad variant', (l) => l.campaign?.content],
  ['Medium', (l) => l.campaign?.medium],
  ['Click ID', (l) => l.campaign?.clickId],
  ['Value', (l) => l.value ?? 0],
  ['Owner', (l) => l.owner],
  ['Tags', (l) => (Array.isArray(l.tags) ? l.tags.join('; ') : '')],
  ['Message', (l) => l.message],
  ['Landing page', (l) => l.pageUrl],
  ['Referrer', (l) => l.referrer],
  ['Notes', (l) => (l.notes || []).map((n) => n.text).join(' | ')],
  ['Created at', (l) => (l.createdAt ? new Date(l.createdAt).toISOString() : '')],
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
