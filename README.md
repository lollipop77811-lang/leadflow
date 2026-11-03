# LeadFlow — Car Scrapping CRM (MERN)

A lead-to-pickup system for a vehicle scrapping business (RVSF / ELV). The client runs ads on Instagram,
Facebook, Google, Justdial and OLX; an owner clicks the ad, fills a short 3-step form about their car, and the
enquiry lands in this dashboard with the vehicle, quote, pickup and RTO paperwork workflow attached.

**Stack:** React 18 + Vite · Node/Express · MongoDB + Mongoose · JWT · role-based access

---

## The workflow this app supports

```
Ad click → 3-step car form → Lead (new)
   ↓ telecaller calls
Contacted → Quote sent (₹/kg calculator) → Pickup scheduled (date, slot, towing vendor)
   ↓ vehicle reaches the yard
Vehicle received → Documents checklist → RTO deregistration → Certificate of Deposit → Paid
                                                                                  ↘ Lost (with a reason)
```

---

## Modules

### 1. Public lead form — `/f/main` (what your ads point to)

- **3 steps:** vehicle → contact → pickup, so it feels short on mobile
- Captures **car make, model, year, category, fuel, condition, RC status, registration number**
- Pickup pincode, city, address, towing required, expected price
- **Optional vehicle photos** (up to 3, compressed in the browser)
- **Hindi / English toggle** for the whole form
- Auto-captures UTM (`source/medium/campaign/content/term`) + `fbclid`, `gclid`, `ttclid`, `li_fat_id`, `msclkid`
- **Honeypot** field, rate limiting (40 submissions / 10 min / IP), phone validation
- Trust block with RVSF number, free towing, CD benefits
- WhatsApp-first fallback: "Rather not fill a form?" → prefilled WhatsApp chat
- Pincode outside your service area is accepted but **flagged**, not silently dropped

### 2. Leads

- Table shows **customer + vehicle** in one line, stage, quote, **document progress (x/6)**, follow-up status,
  platform and campaign
- Filters: search (name, phone, car, RC number, city, campaign), stage, platform, follow-up due/overdue,
  assigned owner (admin), sort
- **Repeat-enquiry badge** — the same phone submitting again (common with retargeting ads) is flagged, with the
  other submissions listed in the drawer
- One-tap **WhatsApp** (prefilled templates) and **call** on every row
- CSV export honours the active filters (28 columns incl. vehicle, quote, docs, CD number, lost reason)

### 3. Lead drawer

Inline tools, no page reloads:

| Block | What you can do |
| --- | --- |
| Contact & owner | assign to a telecaller (admin), set the **next follow-up date** |
| Vehicle | specs + photos (add/remove) |
| Quote | ₹/kg × weight **calculator**, expected-price comparison, "Send quote on WhatsApp" |
| Pickup | date, slot, towing vendor, driver, mark received, WhatsApp confirmation |
| Documents | 6-item checklist: RC, insurance, PAN, Aadhaar, bank NOC, Form 26/28 + "request pending docs" message |
| CD | RTO submitted / approved, CD number, CD date, "send CD to customer" |
| Payout | final amount, mode (cash/UPI/bank), reference, one-click **Mark paid** |
| Activity | full audit trail of every change, plus free-text notes |

### 4. Pipeline

8-stage kanban with drag & drop: **New → Contacted → Quote sent → Pickup scheduled → Vehicle received →
Deregistered/CD → Paid → Lost**. Dropping onto *Lost* asks for a reason (mandatory). Cards show vehicle, quote,
follow-up chip and document progress.

### 5. Today

The operational screen: **pickups scheduled today** (slot, towing vendor, driver, address, Confirm / Call /
Mark received / No-show) and **calls due** (overdue first, tick to close, WhatsApp/call inline).

### 6. Ads & reports

- **Tracked link builder** with platform presets + copy
- **QR code** of the form for yard boards, receipts and visiting cards, plus a WhatsApp share link
- **Ad spend entry** per campaign per month → **CPL**, **cost per pickup** and per-campaign lead counts
  (monthly spend is prorated onto a rolling 30-day window so the numbers stay honest mid-month)
- Leads-by-platform share with copyable tracked links

### 7. Settings

Account & password, **team management** (add/enable/disable admin, telecaller, yard user), form link, database
status, developer API example.

---

## Roles

| Role | Sees | Can do |
| --- | --- | --- |
| **admin** | everything | assign leads, delete, manage team, ad spend |
| **telecaller** | only leads assigned to them (server-enforced) | call, quote, schedule pickup, update docs/CD, notes |
| **yard** | assigned leads | pickup operations |

---

## Quick start

```bash
cd leadflow
npm run install:all     # server + client dependencies
npm run dev             # API :5000 + Vite :5173
```

Open **http://localhost:5173**

| Login | Credentials |
| --- | --- |
| Admin | `admin@leadflow.dev` / `admin123` |
| Telecaller | `ravi@leadflow.dev` / `ravi123` |

> No database configured? The API boots an **in-memory MongoDB** with 15 realistic demo leads, 2 months of ad
> spend and a demo telecaller. Data resets on restart. Change the admin credentials in `server/.env` before
> going live.

---

## Connect MongoDB Atlas

1. Create a free cluster at [cloud.mongodb.com](https://cloud.mongodb.com)
2. **Database Access** → add a user · **Network Access** → allow your server IP (`0.0.0.0/0` for a quick start)
3. **Connect → Drivers** → copy the connection string into `server/.env`:

```env
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/leadflow?retryWrites=true&w=majority
ALLOW_MEMORY_DB=true        # keep as a fallback, or false to fail loudly
SEED_DEMO=false             # never seed demo cars in production
JWT_SECRET=some-long-random-string
ADMIN_NAME=Owner
ADMIN_EMAIL=you@yourdomain.com
ADMIN_PASSWORD=change-this-now
CLIENT_ORIGIN=https://yourdomain.com
```

4. Restart the API — you should see `✅ MongoDB connected (external URI)`.

### Scrapping-specific settings

```env
SCRAP_RATE_PER_KG=20                    # default ₹/kg used by the quote calculator
SERVICE_PINCODES=226,208,261            # optional: pincode prefixes you serve (empty = everywhere)
BRAND_NAME=Sharma Autoscrap
RVSF_NUMBER=RVSF/UP/2024/0000           # shown on the public form
BRAND_PHONE=+91 90000 00000
BRAND_WHATSAPP=919000000000             # wa.me number for the "Chat on WhatsApp" button
```

---

## Connecting the ads

1. **Ads & reports → Tracked form link** → pick a platform preset, set the campaign + ad variant, copy the URL.

```
https://yourdomain.com/f/main?utm_source=instagram&utm_medium=paid_social
  &utm_campaign=IG_Reels_Scrap&utm_content=reel_swift
```

2. Paste it as the **destination URL** in Meta Ads Manager / Google Ads / Justdial.
3. Print the **QR code** on the yard board — walk-ins scan it and get the same attributed form.
4. Submit one test enquiry; it should appear instantly with the platform and campaign attached.

Meta appends `fbclid`, Google appends `gclid` — both are stored on the lead for offline conversion uploads later.

---

## Production build

```bash
npm run build      # builds client/dist
npm start          # Express serves the API + the React build on PORT
```

Single process, single origin — no CORS or proxy configuration. Point the health check at `/api/health`.
Deploy to Render / Railway / Fly.io / a VPS with PM2 + Nginx + HTTPS.

---

## API reference

| Method | Endpoint | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/leads/public/config` | public | brand, rate, categories, service areas |
| POST | `/api/leads/public` | public | create a lead from any landing page |
| POST | `/api/auth/login` | public | returns JWT |
| GET | `/api/auth/me` | JWT | current user |
| PATCH | `/api/auth/password` | JWT | change password |
| GET | `/api/leads` | JWT | list — `q, status, source, lostReason, assignedTo, due, from, to, sort, page, limit` |
| GET | `/api/leads/today` | JWT | today's pickups + due follow-ups |
| GET | `/api/leads/:id` | JWT | lead + other enquiries from the same number |
| POST | `/api/leads` | JWT | manual entry (walk-in / phone) |
| PATCH | `/api/leads/:id` | JWT | status, quote, pickup, documents, CD, payout, follow-up, assignee |
| DELETE | `/api/leads/:id` | admin | delete |
| POST | `/api/leads/:id/notes` | JWT | add note |
| POST / DELETE | `/api/leads/:id/photos` | JWT | add / remove vehicle photos |
| GET | `/api/leads/export.csv` | JWT | filtered CSV |
| GET | `/api/stats` | JWT | dashboard aggregates |
| GET / POST | `/api/users` | admin | team management |
| PATCH | `/api/users/:id` | admin | role, active flag, password |
| GET / POST | `/api/spend` | JWT | ad spend entries |
| DELETE | `/api/spend/:id` | admin | remove a spend entry |
| GET | `/api/health` | public | uptime + DB mode |

**Create a lead from Zapier / IVR / any landing page:**

```bash
curl -X POST https://yourdomain.com/api/leads/public \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Aarav Sharma",
    "phone": "9811024411",
    "whatsappConsent": true,
    "vehicle": {
      "make": "Maruti Suzuki", "model": "Swift", "year": 2011,
      "fuel": "petrol", "condition": "running", "rcStatus": "original",
      "category": "hatchback", "registrationNumber": "UP32AB1234"
    },
    "pickup": { "pincode": "226001", "city": "Lucknow", "needsTowing": true },
    "expectedPrice": 25000,
    "source": "instagram",
    "campaign": { "source": "instagram", "medium": "paid_social", "name": "IG_Reels_Scrap" }
  }'
```

---

## Project structure

```
leadflow/
├── server/
│   └── src/
│       ├── config/       env + Mongo connection (Atlas → in-memory fallback) + shared enums
│       ├── models/       Lead (vehicle, quote, pickup, documents, CD, payout, attribution)
│       │                 User (admin/telecaller/yard) · AdSpend
│       ├── routes/       auth · leads · stats · users · spend
│       ├── middleware/   JWT guard, role guard, error handling
│       ├── utils/        attribution detection, CSV writer
│       └── seed.js       admin + demo telecaller + 15 car leads + ad spend
└── client/
    └── src/
        ├── pages/        Login · Overview · Leads · Pipeline · Today · Campaigns · Settings · PublicForm
        ├── components/   Layout · PageHeader · LeadDrawer · Badges · TrendChart · Modal …
        ├── lib/          api · auth · meta (statuses, sources, WA templates) · format · image
        └── styles/       design system (no CSS framework)
```

---

## Before the client sees it

- Set `SEED_DEMO=false` and start with a clean Atlas database
- Change `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `JWT_SECRET`
- Add the real **RVSF number**, brand name and WhatsApp number to `.env`
- Set `SERVICE_PINCODES` if he only picks up in certain cities
- Revoke any personal access tokens used for deployment

## Known limitations / next steps

- **No phone OTP yet** — social ads attract fake numbers. Add Msg91/Twilio OTP, or make WhatsApp the primary
  CTA (also planned: WhatsApp Cloud API for two-way chat inside the drawer).
- **Photos are stored as compressed data URLs in MongoDB** — fine at this scale; move to S3 with signed URLs
  before volume grows. RC/Aadhaar scans are PII: keep them private and add a consent line.
- No automatic lead assignment or round-robin yet (manual assignment + follow-ups today).
- No push/SMS alert on a new lead — the toast badge is the current signal.
- CD delivery and payout receipts are tracked by date/notes, not uploaded documents.
