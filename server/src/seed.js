import { env } from './config/env.js';
import { User } from './models/User.js';
import { Lead } from './models/Lead.js';

const DEMO = [
  { name: 'Aarav Sharma', email: 'aarav.sharma@gmail.com', phone: '+91 98110 24411', company: 'Sharma Interiors', source: 'instagram', campaign: { source: 'instagram', medium: 'paid_social', name: 'IG_Reels_Q4', content: 'reel_design_v2' }, status: 'new', value: 48000, message: 'Saw the reel about modular kitchens — need a quote for a 3BHK.', daysAgo: 0, tags: ['hot'] },
  { name: 'Priya Nair', email: 'priya.nair@outlook.com', phone: '+91 90045 78120', company: 'Bloom Studio', source: 'facebook', campaign: { source: 'facebook', medium: 'paid_social', name: 'FB_LeadGen_Retarget', content: 'carousel_a' }, status: 'contacted', value: 32000, message: 'Interested in the starter plan for my design studio.', daysAgo: 1, tags: ['retarget'] },
  { name: 'Rohit Verma', email: 'rohit.verma@yahoo.com', phone: '+91 88234 55901', company: 'Verma Traders', source: 'instagram', campaign: { source: 'instagram', medium: 'paid_social', name: 'IG_Reels_Q4', content: 'story_b' }, status: 'qualified', value: 125000, message: 'Need bulk pricing, 40+ units. Please call after 4pm.', daysAgo: 2, tags: ['bulk'] },
  { name: 'Sneha Kulkarni', email: 'sneha.k@zoho.com', phone: '+91 97300 11245', company: 'Pixel & Co', source: 'google', campaign: { source: 'google', medium: 'cpc', name: 'Search_Brand_Exact', content: 'ad_1' }, status: 'converted', value: 75000, message: 'Signed up after the search ad. Great onboarding call.', daysAgo: 3 },
  { name: 'Imran Qureshi', email: 'imran.q@gmail.com', phone: '+91 99887 23410', company: 'Qure Clinic', source: 'facebook', campaign: { source: 'facebook', medium: 'paid_social', name: 'FB_LeadGen_Retarget', content: 'video_c' }, status: 'new', value: 0, message: 'Please share the clinic package details.', daysAgo: 3 },
  { name: 'Meera Iyer', email: 'meera.iyer@gmail.com', phone: '+91 90000 55671', company: 'Fable Foods', source: 'linkedin', campaign: { source: 'linkedin', medium: 'paid_social', name: 'LI_B2B_Founders', content: 'single_image' }, status: 'qualified', value: 210000, message: 'We are a 12-person team, looking for annual billing.', daysAgo: 4, tags: ['enterprise'] },
  { name: 'Karthik Reddy', email: 'karthik.reddy@gmail.com', phone: '+91 80880 44120', company: 'Reddy Motors', source: 'youtube', campaign: { source: 'youtube', medium: 'paid_social', name: 'YT_Spark_Test', content: 'shorts_1' }, status: 'lost', value: 18000, message: 'Budget too low right now, follow up next quarter.', daysAgo: 5 },
  { name: 'Ananya Bose', email: 'ananya.bose@gmail.com', phone: '+91 98300 77145', company: 'Bose Legal', source: 'instagram', campaign: { source: 'instagram', medium: 'paid_social', name: 'IG_Story_Offer', content: 'story_offer_1' }, status: 'contacted', value: 26000, message: 'Downloaded the checklist, want a walkthrough.', daysAgo: 6 },
  { name: 'Dev Malhotra', email: 'dev.malhotra@proton.me', phone: '+91 96500 33218', company: 'Malhotra Realty', source: 'facebook', campaign: { source: 'facebook', medium: 'paid_social', name: 'FB_OpenHouse', content: 'carousel_b' }, status: 'converted', value: 340000, message: 'Closed 2 listings this month. Excellent service.', daysAgo: 8 },
  { name: 'Ishita Rao', email: 'ishita.rao@gmail.com', phone: '+91 78990 12340', company: 'Rao EdTech', source: 'youtube', campaign: { source: 'youtube', medium: 'video', name: 'YT_Demo_Drive', content: 'pre_roll' }, status: 'new', value: 0, message: 'Came from the YouTube demo, want a trial link.', daysAgo: 9 },
  { name: 'Vikram Singh', email: 'vikram.singh@gmail.com', phone: '+91 94150 88712', company: 'Singh Logistics', source: 'whatsapp', campaign: { source: 'whatsapp', medium: 'broadcast', name: 'WA_Broadcast_1', content: '' }, status: 'qualified', value: 95000, message: 'Referred by Dev. Needs a custom quote.', daysAgo: 10 },
  { name: 'Nikita Joshi', email: 'nikita.joshi@gmail.com', phone: '+91 90110 66554', company: 'Joshi Boutique', source: 'instagram', campaign: { source: 'instagram', medium: 'paid_social', name: 'IG_Story_Offer', content: 'story_offer_2' }, status: 'new', value: 15000, message: 'Is there a monthly payment option?', daysAgo: 11 },
  { name: 'Arjun Menon', email: 'arjun.menon@gmail.com', phone: '+91 90880 44556', company: 'Menon Fitness', source: 'facebook', campaign: { source: 'facebook', medium: 'paid_social', name: 'FB_LeadGen_Retarget', content: 'carousel_a' }, status: 'contacted', value: 42000, message: 'Following up on the pricing PDF.', daysAgo: 12 },
  { name: 'Tara Kapoor', email: 'tara.kapoor@gmail.com', phone: '+91 98730 22114', company: 'Kapoor Events', source: 'website', campaign: {}, status: 'new', value: 0, message: 'Friend suggested I fill this form.', daysAgo: 13 },
  { name: 'Sameer Khan', email: 'sameer.khan@gmail.com', phone: '+91 99900 77881', company: 'Khan Auto Works', source: 'google', campaign: { source: 'google', medium: 'cpc', name: 'Search_HighIntent', content: 'ad_2' }, status: 'qualified', value: 68000, message: 'Comparing two vendors, need pricing today.', daysAgo: 1 },
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
  if (!force && (await Lead.countDocuments()) > 0) return { inserted: 0 };

  if (force) await Lead.deleteMany({});
  const docs = DEMO.map(({ daysAgo, ...lead }) => {
    const created = new Date();
    created.setDate(created.getDate() - daysAgo);
    created.setHours(9 + (daysAgo % 8), 15 + (daysAgo % 40), 0, 0);
    return {
      ...lead,
      formSlug: 'main',
      owner: daysAgo % 3 === 0 ? 'Admin' : 'Unassigned',
      createdAt: created,
      updatedAt: created,
      events: [
        { type: 'created', message: `Lead captured from ${lead.source} form`, author: 'Website', createdAt: created },
      ],
      notes:
        lead.status === 'qualified'
          ? [{ text: 'Spoke on call — needs pricing by Friday.', author: 'Admin', createdAt: created }]
          : [],
      lastContactedAt: lead.status === 'new' ? null : created,
    };
  });

  await Lead.insertMany(docs);
  return { inserted: docs.length };
}
