import { env } from './config/env.js';
import { User } from './models/User.js';
import { Lead, phoneKey } from './models/Lead.js';
import { AdSpend } from './models/AdSpend.js';

const daysAgo = (n, hour = 11) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, 15, 0, 0);
  return d;
};
const daysAhead = (n, hour = 11) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(hour, 0, 0, 0);
  return d;
};

/* Demo leads shaped like a real car-scrapping pipeline. */
const DEMO = [
  {
    name: 'Aarav Sharma', phone: '+91 98110 24411', vehicle: { make: 'Maruti Suzuki', model: 'Swift', year: 2011, fuel: 'petrol', condition: 'running', rcStatus: 'original', category: 'hatchback', weightKg: 900, rto: 'Lucknow RTO', state: 'Uttar Pradesh', registrationNumber: 'UP32AB1234' },
    pickup: { pincode: '226001', city: 'Lucknow', address: 'Hazratganj, near Sahara Ganj' },
    status: 'new', source: 'instagram', campaign: { source: 'instagram', medium: 'paid_social', name: 'IG_Reels_Scrap', content: 'reel_swift' },
    quote: { expectedAmount: 25000 }, createdAt: daysAgo(0, 9), assignee: 'Ravi Kumar',
  },
  {
    name: 'Priya Nair', phone: '+91 90045 78120', vehicle: { make: 'Hyundai', model: 'i10', year: 2009, fuel: 'petrol', condition: 'non_running', rcStatus: 'original', category: 'hatchback', weightKg: 900, rto: 'Kanpur RTO' },
    pickup: { pincode: '208001', city: 'Kanpur', address: 'Civil Lines, block C' },
    status: 'contacted', source: 'facebook', campaign: { source: 'facebook', medium: 'paid_social', name: 'FB_LeadGen_Scrap', content: 'carousel_a' },
    quote: { expectedAmount: 18000 }, followUpAt: daysAhead(0, 16), createdAt: daysAgo(1), assignee: 'Ravi Kumar',
    notes: [{ text: 'Call back after 4pm — customer at work.', author: 'Ravi Kumar' }],
  },
  {
    name: 'Rohit Verma', phone: '+91 88234 55901', vehicle: { make: 'Honda', model: 'City', year: 2008, fuel: 'petrol', condition: 'running', rcStatus: 'financed', category: 'sedan', weightKg: 1150, rto: 'Lucknow RTO' },
    pickup: { pincode: '226010', city: 'Lucknow', address: 'Gomti Nagar, Vibhuti Khand' },
    status: 'quoted', source: 'google', campaign: { name: 'Search_Scrap_Near_Me', source: 'google', medium: 'cpc' },
    quote: { amount: 25300, ratePerKg: 22, weightKg: 1150, expectedAmount: 30000, sentAt: daysAgo(1) },
    followUpAt: daysAgo(1), createdAt: daysAgo(2), assignee: 'Ravi Kumar',
    notes: [{ text: 'Bank NOC pending — customer will share by Friday.', author: 'Ravi Kumar' }],
  },
  {
    name: 'Sneha Kulkarni', phone: '+91 97300 11245', vehicle: { make: 'Maruti Suzuki', model: 'Alto', year: 2010, fuel: 'petrol', condition: 'running', rcStatus: 'original', category: 'hatchback', weightKg: 800, rto: 'Pune RTO' },
    pickup: { pincode: '411001', city: 'Pune', address: 'Camp, MG Road' },
    status: 'quoted', source: 'instagram', campaign: { source: 'instagram', medium: 'paid_social', name: 'IG_Reels_Scrap', content: 'story_offer' },
    quote: { amount: 16000, ratePerKg: 20, weightKg: 800, sentAt: daysAgo(2) },
    followUpAt: daysAhead(1, 12), createdAt: daysAgo(3), assignee: 'Admin',
  },
  {
    name: 'Imran Qureshi', phone: '+91 99887 23410', vehicle: { make: 'Toyota', model: 'Innova', year: 2007, fuel: 'diesel', condition: 'running', rcStatus: 'original', category: 'suv', weightKg: 1700, rto: 'Lucknow RTO' },
    pickup: { pincode: '226004', city: 'Lucknow', address: 'Alambagh, sector 4', needsTowing: true, scheduledDate: daysAhead(0, 11), slot: 'morning', vendor: 'Yadav Towing', driver: 'Suresh' },
    status: 'pickup_scheduled', source: 'whatsapp', campaign: { source: 'whatsapp', medium: 'broadcast', name: 'WA_Broadcast_Scrap' },
    quote: { amount: 35700, ratePerKg: 21, weightKg: 1700, sentAt: daysAgo(1) },
    documents: { rc: true, insurance: true, pan: true, aadhaar: false, noc: false, form2628: false },
    createdAt: daysAgo(4), assignee: 'Ravi Kumar',
  },
  {
    name: 'Meera Iyer', phone: '+91 90000 55671', vehicle: { make: 'Mahindra', model: 'Bolero', year: 2006, fuel: 'diesel', condition: 'non_running', rcStatus: 'original', category: 'suv', weightKg: 1700, rto: 'Sitapur RTO' },
    pickup: { pincode: '261001', city: 'Sitapur', address: 'Bus stand road', completedAt: daysAgo(2) },
    status: 'vehicle_received', source: 'facebook', campaign: { source: 'facebook', medium: 'paid_social', name: 'FB_LeadGen_Scrap', content: 'video_b' },
    quote: { amount: 34000, ratePerKg: 20, weightKg: 1700, sentAt: daysAgo(6) },
    payout: { amount: 34000, mode: 'upi' },
    documents: { rc: true, insurance: true, pan: true, aadhaar: true, noc: true, form2628: false },
    cd: { rtoSubmittedAt: daysAgo(1) },
    createdAt: daysAgo(7), assignee: 'Admin',
  },
  {
    name: 'Karthik Reddy', phone: '+91 80880 44120', vehicle: { make: 'Tata', model: 'Indica', year: 2005, fuel: 'diesel', condition: 'running', rcStatus: 'original', category: 'hatchback', weightKg: 1050, rto: 'Hyderabad RTO' },
    pickup: { pincode: '500001', city: 'Hyderabad', address: 'Abids main road', completedAt: daysAgo(9) },
    status: 'deregistered', source: 'google', campaign: { name: 'Search_Scrap_Near_Me', source: 'google', medium: 'cpc' },
    quote: { amount: 21000, ratePerKg: 20, weightKg: 1050, sentAt: daysAgo(12) },
    payout: { amount: 21000, mode: 'bank', reference: 'NEFT-88213' },
    documents: { rc: true, insurance: true, pan: true, aadhaar: true, noc: true, form2628: true },
    cd: { rtoSubmittedAt: daysAgo(8), rtoApprovedAt: daysAgo(5), cdNumber: 'CD/UP/2024/88231', cdDate: daysAgo(5) },
    createdAt: daysAgo(13), assignee: 'Admin',
  },
  {
    name: 'Ananya Bose', phone: '+91 98300 77145', vehicle: { make: 'Hyundai', model: 'Santro', year: 2004, fuel: 'petrol', condition: 'running', rcStatus: 'original', category: 'hatchback', weightKg: 850, rto: 'Kolkata RTO' },
    pickup: { pincode: '700001', city: 'Kolkata', address: 'BBD Bagh', completedAt: daysAgo(15) },
    status: 'paid', source: 'justdial', campaign: {},
    quote: { amount: 17000, ratePerKg: 20, weightKg: 850, sentAt: daysAgo(18) },
    payout: { amount: 17500, paidAt: daysAgo(14), mode: 'upi', reference: 'UPI-772901' },
    documents: { rc: true, insurance: true, pan: true, aadhaar: true, noc: true, form2628: true },
    cd: { rtoSubmittedAt: daysAgo(13), rtoApprovedAt: daysAgo(10), cdNumber: 'CD/UP/2024/88190', cdDate: daysAgo(10), deliveredAt: daysAgo(9) },
    createdAt: daysAgo(19), assignee: 'Admin',
  },
  {
    name: 'Dev Malhotra', phone: '+91 96500 33218', vehicle: { make: 'Ford', model: 'Figo', year: 2012, fuel: 'diesel', condition: 'running', rcStatus: 'original', category: 'hatchback', weightKg: 1100, rto: 'Delhi RTO' },
    pickup: { pincode: '110001', city: 'New Delhi', address: 'Connaught Place' },
    status: 'lost', lostReason: 'price_low', source: 'facebook', campaign: { source: 'facebook', medium: 'paid_social', name: 'FB_LeadGen_Scrap' },
    quote: { amount: 22000, ratePerKg: 20, weightKg: 1100, expectedAmount: 45000, sentAt: daysAgo(5) },
    createdAt: daysAgo(6), assignee: 'Ravi Kumar',
    notes: [{ text: 'Wanted ₹45k, would not move. Sold to a local dealer.', author: 'Ravi Kumar' }],
  },
  {
    name: 'Ishita Rao', phone: '+91 78990 12340', vehicle: { make: 'Chevrolet', model: 'Beat', year: 2011, fuel: 'petrol', condition: 'accident', rcStatus: 'original', category: 'hatchback', weightKg: 950, rto: 'Bengaluru RTO' },
    pickup: { pincode: '560001', city: 'Bengaluru', address: 'MG Road' },
    status: 'lost', lostReason: 'unreachable', source: 'instagram', campaign: { source: 'instagram', medium: 'paid_social', name: 'IG_Reels_Scrap' },
    createdAt: daysAgo(8), assignee: 'Ravi Kumar',
    notes: [{ text: 'Called 4 times over 3 days, number switched off.', author: 'Ravi Kumar' }],
  },
  {
    name: 'Vikram Singh', phone: '+91 94150 88712', vehicle: { make: 'Renault', model: 'Duster', year: 2013, fuel: 'diesel', condition: 'running', rcStatus: 'original', category: 'suv', weightKg: 1600, rto: 'Jaipur RTO' },
    pickup: { pincode: '302001', city: 'Jaipur', address: 'MI Road' },
    status: 'lost', lostReason: 'out_of_area', source: 'google', campaign: { name: 'Search_Scrap_Near_Me', source: 'google', medium: 'cpc' },
    createdAt: daysAgo(9), assignee: 'Admin',
  },
  {
    name: 'Nikita Joshi', phone: '+91 90110 66554', vehicle: { make: 'Maruti Suzuki', model: 'WagonR', year: 2009, fuel: 'cng', condition: 'non_running', rcStatus: 'lost', category: 'hatchback', weightKg: 880, rto: 'Lucknow RTO' },
    pickup: { pincode: '226016', city: 'Lucknow', address: 'Indira Nagar, sector 14' },
    status: 'contacted', source: 'olx', campaign: {},
    followUpAt: daysAgo(2), createdAt: daysAgo(10), assignee: 'Ravi Kumar',
    notes: [{ text: 'RC lost — will need duplicate RC from RTO before we can pick up.', author: 'Ravi Kumar' }],
  },
  {
    name: 'Arjun Menon', phone: '+91 90880 44556', vehicle: { make: 'Honda', model: 'Civic', year: 2008, fuel: 'petrol', condition: 'accident', rcStatus: 'original', category: 'sedan', weightKg: 1250, rto: 'Lucknow RTO' },
    pickup: { pincode: '226021', city: 'Lucknow', address: 'Jankipuram extension' },
    status: 'quoted', source: 'instagram', campaign: { source: 'instagram', medium: 'paid_social', name: 'IG_Reels_Scrap', content: 'reel_civic' },
    quote: { amount: 27500, ratePerKg: 22, weightKg: 1250, expectedAmount: 35000, sentAt: daysAgo(0) },
    followUpAt: daysAhead(0, 18), createdAt: daysAgo(11), assignee: 'Admin',
  },
  {
    name: 'Tara Kapoor', phone: '+91 98730 22114', vehicle: { make: 'Maruti Suzuki', model: '800', year: 2003, fuel: 'petrol', condition: 'running', rcStatus: 'original', category: 'hatchback', weightKg: 650, rto: 'Barabanki RTO' },
    pickup: { pincode: '225001', city: 'Barabanki', address: 'Station road' },
    status: 'new', source: 'walkin', campaign: {},
    createdAt: daysAgo(12), assignee: 'Unassigned',
  },
  {
    name: 'Sameer Khan', phone: '+91 99900 77881', vehicle: { make: 'Tata', model: 'Nano', year: 2012, fuel: 'petrol', condition: 'running', rcStatus: 'duplicate', category: 'hatchback', weightKg: 600, rto: 'Kanpur RTO' },
    pickup: { pincode: '208012', city: 'Kanpur', address: 'Kidwai Nagar' },
    status: 'contacted', source: 'olx', campaign: {},
    followUpAt: daysAhead(2, 11), createdAt: daysAgo(5), assignee: 'Ravi Kumar',
  },
];

export async function seedAdmin() {
  const existing = await User.findOne({ email: env.admin.email });
  if (existing) return { created: false, email: existing.email };

  await User.create({
    name: env.admin.name,
    email: env.admin.email,
    passwordHash: await User.hashPassword(env.admin.password),
    role: 'admin',
  });
  return { created: true, email: env.admin.email };
}

export async function seedDemoLeads({ force = false } = {}) {
  if (!force && (await Lead.countDocuments()) > 0) return { inserted: 0, telecaller: null };

  if (force) {
    await Lead.deleteMany({});
    await AdSpend.deleteMany({});
  }

  // Demo telecaller so role-based access can be tried out.
  let telecaller = null;
  const existingTele = await User.findOne({ email: 'ravi@leadflow.dev' });
  if (!existingTele) {
    await User.create({
      name: 'Ravi Kumar',
      email: 'ravi@leadflow.dev',
      phone: '+91 90000 12345',
      role: 'telecaller',
      passwordHash: await User.hashPassword('ravi123'),
    });
    telecaller = 'ravi@leadflow.dev / ravi123';
  }

  const admin = await User.findOne({ email: env.admin.email }).lean();
  const tele = await User.findOne({ email: 'ravi@leadflow.dev' }).lean();
  const userFor = (name) => (name === 'Ravi Kumar' ? tele : admin);

  const docs = DEMO.map((d) => {
    const assignee = userFor(d.assignee);
    const createdAt = d.createdAt || new Date();
    return {
      name: d.name,
      phone: d.phone,
      phoneKey: phoneKey(d.phone),
      email: `${d.name.split(' ')[0].toLowerCase()}@example.com`,
      whatsappConsent: true,
      vehicle: d.vehicle,
      pickup: d.pickup || {},
      quote: d.quote || {},
      payout: d.payout || {},
      documents: d.documents || {},
      cd: d.cd || {},
      status: d.status,
      statusChangedAt: d.status === 'new' ? createdAt : daysAgo(1),
      lostReason: d.lostReason || '',
      assignedTo: assignee?._id || null,
      assignedToName: assignee?.name || 'Unassigned',
      followUpAt: d.followUpAt || null,
      firstContactedAt: d.status === 'new' ? null : new Date(createdAt.getTime() + 42 * 60000),
      source: d.source,
      formSlug: 'main',
      campaign: d.campaign || {},
      tags: d.vehicle.rcStatus === 'financed' ? ['financed'] : d.vehicle.condition === 'accident' ? ['accident'] : [],
      notes: d.notes || [],
      events: [
        { type: 'created', message: `Lead captured from ${d.source} · ${d.vehicle.make} ${d.vehicle.model}`, author: 'Website', createdAt },
      ],
      createdAt,
      updatedAt: createdAt,
      pageUrl: 'https://example.com/f/main',
      ip: '127.0.0.1',
    };
  });

  await Lead.insertMany(docs);

  // Spend for the current and previous month, so 30-day reports have data.
  const now = new Date();
  const monthOf = (offset) => {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };
  const budgets = [
    { campaignName: 'IG_Reels_Scrap', source: 'instagram', amount: 2800, notes: 'Meta ads manager' },
    { campaignName: 'FB_LeadGen_Scrap', source: 'facebook', amount: 2100, notes: 'Meta ads manager' },
    { campaignName: 'Search_Scrap_Near_Me', source: 'google', amount: 2400, notes: 'Google Ads' },
    { campaignName: 'WA_Broadcast_Scrap', source: 'whatsapp', amount: 500, notes: 'WhatsApp broadcast tool' },
  ];
  await AdSpend.insertMany(
    [0, -1].flatMap((offset) =>
      budgets.map((b) => ({ ...b, month: monthOf(offset) }))
    )
  );

  return { inserted: docs.length, telecaller };
}
