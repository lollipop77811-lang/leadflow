export const STATUSES = [
  { id: 'new', label: 'New', color: '#3b82f6', soft: '#eff6ff' },
  { id: 'contacted', label: 'Contacted', color: '#f59e0b', soft: '#fff7ed' },
  { id: 'qualified', label: 'Qualified', color: '#8b5cf6', soft: '#f5f3ff' },
  { id: 'converted', label: 'Converted', color: '#10b981', soft: '#ecfdf5' },
  { id: 'lost', label: 'Lost', color: '#ef4444', soft: '#fef2f2' },
];

export const statusMeta = (id) => STATUSES.find((s) => s.id === id) || STATUSES[0];

export const SOURCES = [
  { id: 'instagram', label: 'Instagram', color: '#e1306c', letter: 'IG' },
  { id: 'facebook', label: 'Facebook', color: '#1877f2', letter: 'f' },
  { id: 'google', label: 'Google Ads', color: '#ea4335', letter: 'G' },
  { id: 'linkedin', label: 'LinkedIn', color: '#0a66c2', letter: 'in' },
  { id: 'youtube', label: 'YouTube', color: '#ff0000', letter: '▶' },
  { id: 'whatsapp', label: 'WhatsApp', color: '#25d366', letter: 'WA' },
  { id: 'website', label: 'Website', color: '#0ea5a4', letter: 'W' },
  { id: 'other', label: 'Other', color: '#94a3b8', letter: '•' },
];

export const sourceMeta = (id) => SOURCES.find((s) => s.id === id) || SOURCES[SOURCES.length - 1];

export const AD_PRESETS = [
  { label: 'Instagram', source: 'instagram', medium: 'paid_social', campaign: 'IG_Reels_Q4', content: 'reel_design_v2' },
  { label: 'Facebook', source: 'facebook', medium: 'paid_social', campaign: 'FB_LeadGen_Retarget', content: 'carousel_a' },
  { label: 'Google Search', source: 'google', medium: 'cpc', campaign: 'Search_HighIntent', content: 'ad_1' },
  { label: 'LinkedIn', source: 'linkedin', medium: 'paid_social', campaign: 'LI_B2B_Founders', content: 'single_image' },
  { label: 'WhatsApp Broadcast', source: 'whatsapp', medium: 'broadcast', campaign: 'WA_Broadcast_1', content: '' },
];
