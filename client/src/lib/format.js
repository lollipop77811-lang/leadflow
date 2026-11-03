export const currency = (n) => {
  const num = Number(n) || 0;
  return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
};

export const compactCurrency = (n) => {
  const num = Number(n) || 0;
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(1)}Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(num >= 1000000 ? 0 : 1)}L`;
  if (num >= 1000) return `₹${(num / 1000).toFixed(num >= 10000 ? 0 : 1)}k`;
  return `₹${num}`;
};

export const num = (n) => (Number(n) || 0).toLocaleString('en-IN');

export const tonnes = (kg) => {
  const value = Number(kg) || 0;
  if (value >= 1000) return `${(value / 1000).toFixed(1)} T`;
  return `${num(value)} kg`;
};

export const initials = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('') || '?';

export const relativeTime = (date) => {
  if (!date) return '—';
  const diff = Date.now() - new Date(date).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hrs = Math.round(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.round(days / 7);
  if (days < 30) return `${weeks}w ago`;
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

/** "2 days overdue" / "3h left" for a follow-up timestamp. */
export const dueLabel = (date) => {
  if (!date) return '';
  const now = Date.now();
  const diff = new Date(date).setHours(23, 59, 59, 999) - now;
  const abs = Math.abs(diff);
  const hours = Math.floor(abs / 3600000);
  if (diff < 0) {
    if (hours < 24) return `${hours || 1}h overdue`;
    return `${Math.floor(hours / 24)}d overdue`;
  }
  if (hours < 24) return `due in ${hours || 1}h`;
  return `due in ${Math.floor(hours / 24)}d`;
};

export const formatDate = (date, withTime = false) => {
  if (!date) return '—';
  const d = new Date(date);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  });
};

export const dayLabel = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

export const todayInput = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};

export const toDateInput = (date) => (date ? new Date(date).toISOString().slice(0, 10) : '');

export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || '').trim());

/** Indian mobile: 10 digits starting 6-9, optionally with +91 / 0 prefix. */
export const isPhone = (v) => {
  const digits = String(v || '').replace(/\D/g, '');
  const last10 = digits.slice(-10);
  return /^[6-9]\d{9}$/.test(last10) && digits.length <= 13;
};

export const isPincode = (v) => /^\d{6}$/.test(String(v || '').trim());
