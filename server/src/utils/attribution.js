import { SOURCES } from '../config/env.js';

const ALIASES = {
  ig: 'instagram',
  insta: 'instagram',
  instagram_ads: 'instagram',
  fb: 'facebook',
  meta: 'facebook',
  fbclid: 'facebook',
  googleads: 'google',
  adwords: 'google',
  gclid: 'google',
  yt: 'youtube',
  li: 'linkedin',
  wa: 'whatsapp',
  whatsapp_business: 'whatsapp',
};

/** Map any free-text source value onto one of our canonical sources. */
export function normalizeSource(raw) {
  if (!raw) return 'other';
  const key = String(raw).toLowerCase().trim().replace(/[\s-]+/g, '_');
  if (SOURCES.includes(key)) return key;
  if (ALIASES[key]) return ALIASES[key];
  const hit = SOURCES.find((s) => key.includes(s));
  return hit || 'other';
}

/** Best-effort source detection from URL params, referrer and click ids. */
export function detectSource({ source, campaign = {}, referrer = '', pageUrl = '' }) {
  if (source) return normalizeSource(source);

  const fromUtm = campaign.source || campaign.medium;
  if (fromUtm) {
    const mapped = normalizeSource(fromUtm);
    if (mapped !== 'other') return mapped;
  }

  const haystack = `${referrer} ${pageUrl}`.toLowerCase();
  for (const platform of ['instagram', 'facebook', 'linkedin', 'youtube', 'google']) {
    if (haystack.includes(platform)) return platform;
  }
  if (haystack.includes('wa.me') || haystack.includes('whatsapp')) return 'whatsapp';
  if (referrer) return 'website';
  return 'other';
}

export function detectClickId({ campaign = {}, pageUrl = '' }) {
  if (campaign.clickId) {
    return { clickId: campaign.clickId, clickIdType: campaign.clickIdType || '' };
  }
  try {
    const url = new URL(pageUrl || 'http://x');
    for (const key of ['fbclid', 'gclid', 'ttclid', 'li_fat_id', 'msclkid']) {
      const v = url.searchParams.get(key);
      if (v) return { clickId: v, clickIdType: key };
    }
  } catch {
    /* ignore malformed urls */
  }
  return { clickId: '', clickIdType: '' };
}

export function sanitizeCampaign(c = {}) {
  const pick = (v, max = 200) => String(v ?? '').slice(0, max);
  return {
    source: pick(c.source, 60),
    medium: pick(c.medium, 60),
    name: pick(c.name || c.campaign, 120),
    content: pick(c.content, 120),
    term: pick(c.term, 120),
    clickId: pick(c.clickId, 300),
    clickIdType: pick(c.clickIdType, 40),
  };
}
