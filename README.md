# LeadFlow — MERN Lead Dashboard

A complete lead-capture system for social media ads. Someone clicks your Instagram / Facebook / Google /
LinkedIn ad CTA → lands on your hosted form → submits it → the lead appears instantly in the dashboard with
its platform, campaign and ad variant attached.

**Stack:** React 18 + Vite (frontend) · Node/Express (API) · MongoDB + Mongoose (database) · JWT auth

---

## ✨ What's inside

**Public side (what your ads point to)**

- Hosted lead form at `/f/main` (any slug works: `/f/diwali-offer`, `/f/landing-2`)
- Auto-captures `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`
- Auto-captures click IDs: `fbclid`, `gclid`, `ttclid`, `li_fat_id`, `msclkid`
- Saves referrer, landing URL, IP, user agent
- Friendly "You came from Instagram · IG_Reels_Q4" attribution chip
- Client + server validation, spam rate-limiting (60 submissions / 10 min / IP)
- Mobile-first responsive layout

**Dashboard (JWT protected)**

- **Overview** — KPI cards (total, new, open pipeline value, conversion rate), 14-day trend chart, source
  breakdown, pipeline-by-stage, latest leads
- **Leads** — searchable/filterable/sortable table, date range, pagination, CSV export, delete, row → detail drawer
- **Lead drawer** — inline edit, status change, notes, full activity timeline, attribution details
- **Pipeline** — drag-and-drop kanban across New → Contacted → Qualified → Converted → Lost, with stage values
- **Ad Links** — UTM link builder with platform presets, one-click copy, campaign performance and per-platform share
- **Settings** — account, password change, public form link, DB status, developer API example

---

## 🚀 Quick start (2 commands)

```bash
cd leadflow
npm run install:all     # installs server + client deps
npm run dev             # API :5000 + Vite :5173
```

Open **http://localhost:5173**

**Demo login:** `admin@leadflow.dev` / `admin123`

> No database configured? The API automatically boots an **in-memory MongoDB** with 15 demo leads, so the app
> works immediately. Data resets when the server restarts.

---

## 🍃 Connect MongoDB Atlas (production data)

1. Create a free cluster at [cloud.mongodb.com](https://cloud.mongodb.com).
2. **Database Access** → add a user (username + password).
3. **Network Access** → add IP `0.0.0.0/0` (or your server IP).
4. **Connect → Drivers** → copy the connection string.
5. Put it in `server/.env`:

```env
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/leadflow?retryWrites=true&w=majority
ALLOW_MEMORY_DB=true      # keep as fallback, or set false to fail loudly
SEED_DEMO=false           # stop inserting demo leads
JWT_SECRET=some-long-random-string
ADMIN_NAME=Admin
ADMIN_EMAIL=you@yourdomain.com
ADMIN_PASSWORD=change-this-now
CLIENT_ORIGIN=https://yourdomain.com
```

6. Restart the API. You should see `✅ MongoDB connected (external URI)`.
   The admin account is created on first boot only — change the credentials in `.env` **before** the first run,
   or update them via Settings → Change password.

Copy `server/.env.example` → `server/.env` if you don't have one.

---

## 📣 How to connect your ads

1. In the dashboard open **Ad Links**.
2. Pick a platform preset (Instagram, Facebook, Google, LinkedIn, WhatsApp) and type the campaign + ad variant.
3. Copy the generated URL, e.g.

```
https://yourdomain.com/f/main?utm_source=instagram&utm_medium=paid_social&utm_campaign=IG_Reels_Q4&utm_content=reel_design_v2
```

4. Paste it as the **Destination/Website URL** of your ad (Meta Ads Manager, Google Ads, etc.).
5. Submit the form once yourself — the lead appears in the dashboard with the platform and campaign filled in.

Meta and Google append `fbclid` / `gclid` automatically; those are stored on the lead for offline conversion
upload later. If the ad platform only lets you use a short link, point it at the tracked URL — the params pass
through.

### Domain note for production

Replace `window.location.origin` based links by deploying the app so that the API and the React build are served
from the same domain (`npm run build` → Express serves `client/dist`). See below.

---

## 🧱 Production build

```bash
npm run build      # builds client/dist
npm start          # Express serves API + the built React app on PORT
```

Single process, single origin — no CORS or proxy setup needed. Set `PORT`, `MONGODB_URI`, `JWT_SECRET`,
`ADMIN_*`, `CLIENT_ORIGIN` in `server/.env`.

Deploy options: Render / Railway / Fly.io / a VPS with PM2 + Nginx. Point the health check at `/api/health`.

---

## 🔌 API reference

| Method | Endpoint | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/api/leads/public` | public | Create a lead from any landing page / form |
| GET | `/api/leads/public/config` | public | Form options (sources, statuses) |
| POST | `/api/auth/login` | public | Returns JWT |
| GET | `/api/auth/me` | JWT | Current user |
| PATCH | `/api/auth/password` | JWT | Change password |
| GET | `/api/leads` | JWT | List — `q, status, source, formSlug, from, to, sort, page, limit` |
| POST | `/api/leads` | JWT | Add a lead manually |
| GET | `/api/leads/:id` | JWT | Single lead |
| PATCH | `/api/leads/:id` | JWT | Update fields / status / value / tags |
| DELETE | `/api/leads/:id` | JWT | Delete lead |
| POST | `/api/leads/:id/notes` | JWT | Add note |
| DELETE | `/api/leads/:id/notes/:noteId` | JWT | Delete note |
| GET | `/api/leads/export.csv` | JWT | CSV of the current filters |
| GET | `/api/stats` | JWT | Dashboard aggregates |
| GET | `/api/health` | public | Uptime + DB mode |

**Create a lead from anything (Zapier, Webflow, custom site):**

```bash
curl -X POST https://yourdomain.com/api/leads/public \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Aarav Sharma",
    "email": "aarav@company.com",
    "phone": "+91 98765 43210",
    "company": "Sharma Interiors",
    "message": "Need a quote for a 3BHK",
    "source": "instagram",
    "formSlug": "main",
    "campaign": {
      "source": "instagram",
      "medium": "paid_social",
      "name": "IG_Reels_Q4",
      "content": "reel_design_v2",
      "clickId": "IwAR0abc"
    }
  }'
```

---

## 📁 Project structure

```
leadflow/
├── package.json              # root scripts (dev / build / start)
├── server/
│   ├── .env.example
│   └── src/
│       ├── index.js          # Express app + startup
│       ├── config/           # env + Mongo connection (Atlas → in-memory fallback)
│       ├── models/           # User, Lead (UTM + notes + activity timeline)
│       ├── routes/           # auth, leads, stats
│       ├── middleware/       # JWT guard, error handling, async wrapper
│       ├── utils/            # attribution detection, CSV writer
│       └── seed.js           # admin + demo leads
└── client/
    └── src/
        ├── pages/            # Login, Overview, Leads, Pipeline, Campaigns, Settings, PublicForm
        ├── components/       # Layout, PageHeader, LeadDrawer, TrendChart, Badges, Modal, …
        ├── lib/              # api client, auth context, toast, formatting, source/status meta
        └── styles/index.css  # design system (no CSS framework needed)
```

---

## 🔐 Security notes before going live

- Change `ADMIN_PASSWORD` and `JWT_SECRET` — the defaults are for local demo only.
- Serve over HTTPS (JWT is sent as a bearer header).
- The public lead endpoint is intentionally open + rate-limited so ad landing pages can post to it. If you see
  spam, tighten `submitLimiter` in `server/src/routes/leads.js` or add a CAPTCHA/honeypot.
- `ALLOW_MEMORY_DB=false` in production so a misconfigured URI fails loudly instead of silently losing data.

## 🧭 Ideas for next iterations

Email/SMS notification on new lead · team members with per-owner assignment · webhook to Meta Conversions API
for offline conversion upload · source-level cost & CPL (needs ad spend import) · saved filter views.
