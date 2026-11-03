import { env } from '../config/env.js';

/**
 * Fire-and-forget alerts when a new lead arrives.
 * Configure either a Telegram bot, a generic webhook (Zapier / Make / Slack), or both.
 * Nothing breaks when they are not configured.
 */
export async function notifyNewLead(lead) {
  const vehicle = lead.vehicleLabel || 'Vehicle not specified';
  const text = [
    `🚗 New scrap lead — ${lead.source}`,
    `${vehicle}`,
    `${lead.name} · ${lead.phone}`,
    `${[lead.pickup?.city, lead.pickup?.pincode].filter(Boolean).join(' ') || 'No pickup location'}`,
    lead.campaign?.name ? `Campaign: ${lead.campaign.name}` : '',
    lead.duplicateCount > 0 ? '⚠️ Repeat enquiry from this number' : '',
    lead.outOfArea ? '⚠️ Outside service area' : '',
  ]
    .filter(Boolean)
    .join('\n');

  const jobs = [];

  if (env.telegram.token && env.telegram.chatId) {
    jobs.push(
      fetch(`https://api.telegram.org/bot${env.telegram.token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: env.telegram.chatId, text, disable_web_page_preview: true }),
      })
    );
  }

  if (env.alertWebhookUrl) {
    jobs.push(
      fetch(env.alertWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'lead.created',
          lead: {
            id: lead._id,
            name: lead.name,
            phone: lead.phone,
            vehicle,
            status: lead.status,
            source: lead.source,
            campaign: lead.campaign?.name || '',
            city: lead.pickup?.city || '',
            pincode: lead.pickup?.pincode || '',
            expectedPrice: lead.quote?.expectedAmount || 0,
            duplicateCount: lead.duplicateCount || 0,
            createdAt: lead.createdAt,
          },
        }),
      })
    );
  }

  if (!jobs.length) return { sent: false, reason: 'no alert channel configured' };

  const results = await Promise.allSettled(jobs);
  results
    .filter((r) => r.status === 'rejected')
    .forEach((r) => console.warn('⚠️  Lead alert failed:', r.reason?.message || r.reason));

  return { sent: true, channels: jobs.length };
}
