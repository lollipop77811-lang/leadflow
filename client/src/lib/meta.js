/* Shared vocabulary for the car-scrapping dashboard. */

export const STATUSES = [
  { id: 'new', label: 'New', short: 'New', color: '#3b82f6' },
  { id: 'contacted', label: 'Contacted', short: 'Contacted', color: '#f59e0b' },
  { id: 'quoted', label: 'Quote sent', short: 'Quoted', color: '#8b5cf6' },
  { id: 'pickup_scheduled', label: 'Pickup scheduled', short: 'Pickup', color: '#0ea5e9' },
  { id: 'vehicle_received', label: 'Vehicle received', short: 'Received', color: '#14b8a6' },
  { id: 'deregistered', label: 'Deregistered / CD', short: 'CD', color: '#6366f1' },
  { id: 'paid', label: 'Paid', short: 'Paid', color: '#10b981' },
  { id: 'lost', label: 'Lost', short: 'Lost', color: '#ef4444' },
];

export const statusMeta = (id) => STATUSES.find((s) => s.id === id) || STATUSES[0];
export const OPEN_STATUSES = ['new', 'contacted', 'quoted', 'pickup_scheduled'];
export const RECEIVED_STATUSES = ['vehicle_received', 'deregistered', 'paid'];

export const SOURCES = [
  { id: 'instagram', label: 'Instagram', color: '#e1306c', letter: 'IG' },
  { id: 'facebook', label: 'Facebook', color: '#1877f2', letter: 'f' },
  { id: 'google', label: 'Google Ads', color: '#ea4335', letter: 'G' },
  { id: 'whatsapp', label: 'WhatsApp', color: '#25d366', letter: 'WA' },
  { id: 'justdial', label: 'Justdial', color: '#f15b2a', letter: 'JD' },
  { id: 'olx', label: 'OLX / car portals', color: '#002f34', letter: 'O' },
  { id: 'walkin', label: 'Walk-in', color: '#64748b', letter: 'WI' },
  { id: 'youtube', label: 'YouTube', color: '#ff0000', letter: '▶' },
  { id: 'linkedin', label: 'LinkedIn', color: '#0a66c2', letter: 'in' },
  { id: 'website', label: 'Website', color: '#0ea5a4', letter: 'W' },
  { id: 'other', label: 'Other', color: '#94a3b8', letter: '•' },
];

export const sourceMeta = (id) => SOURCES.find((s) => s.id === id) || SOURCES[SOURCES.length - 1];

export const FUELS = [
  { id: 'petrol', label: 'Petrol', color: '#f97316' },
  { id: 'diesel', label: 'Diesel', color: '#475569' },
  { id: 'cng', label: 'CNG', color: '#0ea5e9' },
  { id: 'ev', label: 'Electric', color: '#10b981' },
  { id: 'hybrid', label: 'Hybrid', color: '#14b8a6' },
  { id: 'other', label: 'Other', color: '#94a3b8' },
];
export const fuelLabel = (id) => FUELS.find((f) => f.id === id)?.label || 'Petrol';

export const CONDITIONS = [
  { id: 'running', label: 'Running', color: '#10b981' },
  { id: 'non_running', label: 'Not running', color: '#f59e0b' },
  { id: 'accident', label: 'Accident', color: '#ef4444' },
  { id: 'fire', label: 'Fire damaged', color: '#b91c1c' },
  { id: 'flood', label: 'Flood damaged', color: '#0ea5e9' },
];
export const conditionLabel = (id) => CONDITIONS.find((c) => c.id === id)?.label || 'Running';

export const RC_STATUSES = [
  { id: 'original', label: 'RC original', color: '#10b981' },
  { id: 'duplicate', label: 'RC duplicate', color: '#f59e0b' },
  { id: 'lost', label: 'RC lost', color: '#ef4444' },
  { id: 'financed', label: 'Financed — NOC needed', color: '#8b5cf6' },
];
export const rcLabel = (id) => RC_STATUSES.find((r) => r.id === id)?.label || 'RC original';

export const CATEGORIES = [
  { id: 'hatchback', label: 'Hatchback', hint: 'Alto, Swift, i10…', weight: 900 },
  { id: 'sedan', label: 'Sedan', hint: 'Dzire, City, Verna…', weight: 1150 },
  { id: 'suv', label: 'SUV / MUV', hint: 'Bolero, Innova…', weight: 1700 },
  { id: 'luxury', label: 'Luxury', hint: 'Audi, BMW…', weight: 1600 },
  { id: 'commercial', label: 'Commercial / Van', hint: 'Pickup, Tempo…', weight: 2100 },
  { id: 'other', label: 'Other', hint: 'Not sure', weight: 1000 },
];
export const categoryDef = (id) => CATEGORIES.find((c) => c.id === id) || CATEGORIES[0];

export const LOST_REASONS = [
  { id: 'price_low', label: 'Price too low' },
  { id: 'out_of_area', label: 'Out of service area' },
  { id: 'sold_elsewhere', label: 'Sold elsewhere' },
  { id: 'unreachable', label: 'Unreachable / wrong number' },
  { id: 'not_eligible', label: 'Not eligible (under 15 yrs)' },
  { id: 'rc_stuck', label: 'RC / bank NOC stuck' },
  { id: 'not_ready', label: 'Customer not ready' },
  { id: 'other', label: 'Other' },
];
export const lostReasonLabel = (id) => LOST_REASONS.find((r) => r.id === id)?.label || '—';

export const DOCUMENTS = [
  { id: 'rc', label: 'RC original' },
  { id: 'insurance', label: 'Insurance' },
  { id: 'pan', label: 'PAN card' },
  { id: 'aadhaar', label: 'Aadhaar' },
  { id: 'noc', label: 'Bank NOC' },
  { id: 'form2628', label: 'Form 26 / 28' },
];

export const SLOTS = [
  { id: 'morning', label: 'Morning (9am–12pm)' },
  { id: 'afternoon', label: 'Afternoon (12pm–4pm)' },
  { id: 'evening', label: 'Evening (4pm–7pm)' },
];

export const DEFAULT_SCRAP_RATE = 20; // ₹ per kg

export const AD_PRESETS = [
  { label: 'Instagram', source: 'instagram', medium: 'paid_social', campaign: 'IG_Reels_Scrap', content: 'reel_swift' },
  { label: 'Facebook', source: 'facebook', medium: 'paid_social', campaign: 'FB_LeadGen_Scrap', content: 'carousel_a' },
  { label: 'Google Search', source: 'google', medium: 'cpc', campaign: 'Search_Scrap_Near_Me', content: 'ad_1' },
  { label: 'WhatsApp', source: 'whatsapp', medium: 'broadcast', campaign: 'WA_Broadcast_Scrap', content: '' },
  { label: 'Justdial', source: 'justdial', medium: 'listing', campaign: 'JD_Scrap_Listing', content: '' },
  { label: 'OLX', source: 'olx', medium: 'listing', campaign: 'OLX_Scrap_Listings', content: '' },
];

/* ---------------- WhatsApp helpers ---------------- */

export function waNumber(phone = '') {
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`;
  return digits;
}

export const waLink = (phone, text) =>
  `https://wa.me/${waNumber(phone)}${text ? `?text=${encodeURIComponent(text)}` : ''}`;

const firstName = (name = '') => String(name).trim().split(/\s+/)[0] || 'there';
const vehicleText = (lead) =>
  [lead?.vehicle?.make, lead?.vehicle?.model, lead?.vehicle?.year].filter(Boolean).join(' ') || 'your car';

export const WA_TEMPLATES = {
  intro: (lead) =>
    `Hi ${firstName(lead.name)}, this is ${lead.brand || 'the scrap team'}. You enquired about scrapping your ${vehicleText(
      lead
    )}. We offer free pickup, RTO deregistration and a Certificate of Deposit. When is a good time to call?`,
  quote: (lead) =>
    `Hi ${firstName(lead.name)}, for your ${vehicleText(lead)} our scrap quote is ₹${Number(
      lead?.quote?.amount || 0
    ).toLocaleString('en-IN')}. This includes free towing and RTO deregistration. Shall we schedule the pickup?`,
  pickup: (lead) => {
    const d = lead?.pickup?.scheduledDate
      ? new Date(lead.pickup.scheduledDate).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
        })
      : 'the agreed date';
    return `Hi ${firstName(lead.name)}, your pickup is confirmed for ${d} (${
      lead?.pickup?.slot || 'morning'
    }). ${lead?.pickup?.driver ? `Our driver ${lead.pickup.driver} ` : 'Our driver '}will call before arriving. Please keep the RC and insurance papers ready.`;
  },
  documents: (lead) =>
    `Hi ${firstName(lead.name)}, to complete the scrapping of your ${vehicleText(
      lead
    )} we still need: RC original, insurance, PAN, Aadhaar${
      lead?.vehicle?.rcStatus === 'financed' ? ', bank NOC' : ''
    }. You can send photos on WhatsApp and we will handle the rest.`,
  cd: (lead) =>
    `Hi ${firstName(lead.name)}, good news — your Certificate of Deposit (CD) is ready. CD No: ${
      lead?.cd?.cdNumber || '—'
    }. You can use it for a rebate on your new car registration. We can courier it or you can collect it from our yard.`,
  followup: (lead) =>
    `Hi ${firstName(lead.name)}, just following up on scrapping your ${vehicleText(
      lead
    )}. Prices for scrap are holding steady this week — would you like me to lock the quote?`,
};

export const telLink = (phone) => `tel:${String(phone).replace(/[^\d+]/g, '')}`;
