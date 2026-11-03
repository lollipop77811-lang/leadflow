import { useCallback, useEffect, useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { currency, num } from '../lib/format';
import { AD_PRESETS, SOURCES, sourceMeta } from '../lib/meta';
import { useToast } from '../lib/toast';
import { usePageHeader } from '../components/PageHeader';
import { Chip } from '../components/Badges';
import Icon from '../components/Icon';

const EMPTY = { source: 'instagram', medium: 'paid_social', campaign: '', content: '', term: '' };
const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export default function Campaigns() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const toast = useToast();
  const [utm, setUtm] = useState(EMPTY);
  const [base, setBase] = useState(`${window.location.origin}/f/main`);
  const [stats, setStats] = useState(null);
  const [spends, setSpends] = useState([]);
  const [spendForm, setSpendForm] = useState({
    campaignName: 'IG_Reels_Scrap',
    source: 'instagram',
    month: currentMonth(),
    amount: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, sp] = await Promise.all([api('/stats'), api('/spend')]);
      setStats(s);
      setSpends(sp.items || []);
    } catch (err) {
      toast.error(err.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  usePageHeader(
    {
      title: 'Ads & reports',
      subtitle: 'Tracked form links, ad spend and cost per pickup',
      actions: (
        <a className="btn" href="/f/main" target="_blank" rel="noreferrer">
          <Icon name="external" size={14} /> Open form
        </a>
      ),
    },
    []
  );

  const url = useMemo(() => {
    try {
      const u = new URL(base || 'http://localhost/f/main', window.location.origin);
      const map = {
        utm_source: utm.source,
        utm_medium: utm.medium,
        utm_campaign: utm.campaign,
        utm_content: utm.content,
        utm_term: utm.term,
      };
      Object.entries(map).forEach(([k, v]) => (v ? u.searchParams.set(k, v) : u.searchParams.delete(k)));
      return u.toString();
    } catch {
      return base;
    }
  }, [base, utm]);

  const copy = async (text, label = 'Copied to clipboard') => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(label);
    } catch {
      window.prompt('Copy this', text);
    }
  };

  const set = (key) => (e) => setUtm((u) => ({ ...u, [key]: e.target.value }));

  const addSpend = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api('/spend', { method: 'POST', body: { ...spendForm, amount: Number(spendForm.amount) } });
      toast.success('Ad spend saved');
      setSpendForm({ ...spendForm, amount: '', notes: '' });
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const removeSpend = async (id) => {
    try {
      await api(`/spend/${id}`, { method: 'DELETE' });
      toast.success('Removed');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const totals = stats?.totals || {};
  const campaigns = stats?.byCampaign || [];

  return (
    <div className="page-section">
      <div className="split">
        <div className="card">
          <div className="card-head">
            <div>
              <h3>Tracked form link</h3>
              <div className="sub">Paste this as the destination URL of your ad</div>
            </div>
            <div className="spacer" />
            <span className="pill" style={{ background: 'var(--brand-soft)', color: 'var(--brand-ink)' }}>
              UTM
            </span>
          </div>
          <div className="card-pad link-card">
            <div className="field">
              <label>Start from a preset</label>
              <div className="preset-row">
                {AD_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    className="preset"
                    onClick={() =>
                      setUtm({ source: p.source, medium: p.medium, campaign: p.campaign, content: p.content, term: '' })
                    }
                  >
                    <span
                      className="src-dot"
                      style={{ width: 14, height: 14, borderRadius: 4, fontSize: 8, background: sourceMeta(p.source).color }}
                    >
                      {sourceMeta(p.source).letter}
                    </span>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <label>Form URL</label>
              <input className="input" value={base} onChange={(e) => setBase(e.target.value)} />
              <span className="hint">Use your deployed domain, e.g. https://yourdomain.com/f/main</span>
            </div>

            <div className="utm-grid">
              <div className="field">
                <label>utm_source</label>
                <input className="input" value={utm.source} onChange={set('source')} placeholder="instagram" />
              </div>
              <div className="field">
                <label>utm_medium</label>
                <input className="input" value={utm.medium} onChange={set('medium')} placeholder="paid_social" />
              </div>
              <div className="field">
                <label>utm_campaign</label>
                <input className="input" value={utm.campaign} onChange={set('campaign')} placeholder="IG_Reels_Scrap" />
              </div>
              <div className="field">
                <label>utm_content</label>
                <input className="input" value={utm.content} onChange={set('content')} placeholder="reel_swift" />
              </div>
              <div className="field">
                <label>utm_term</label>
                <input className="input" value={utm.term} onChange={set('term')} placeholder="optional" />
              </div>
            </div>

            <div className="field">
              <label>Your tracked link</label>
              <div className="copy-field">
                <input className="input" readOnly value={url} onFocus={(e) => e.target.select()} />
                <button className="btn btn-sm" onClick={() => copy(url)}>
                  <Icon name="copy" size={13} /> Copy
                </button>
                <a className="btn btn-sm" href={url} target="_blank" rel="noreferrer">
                  <Icon name="external" size={13} />
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <h3>Share the form</h3>
              <div className="sub">QR code for the yard board, receipts and visiting cards</div>
            </div>
          </div>
          <div className="card-pad qr-card">
            <div className="qr-box">
              <QRCodeSVG value={url} size={148} bgColor="#ffffff" fgColor="#0d1327" level="M" includeMargin />
            </div>
            <div style={{ display: 'grid', gap: 8, minWidth: 0 }}>
              <div className="hint" style={{ wordBreak: 'break-all' }}>
                {url}
              </div>
              <button className="btn btn-sm" onClick={() => copy(url, 'Form link copied')}>
                <Icon name="copy" size={12} /> Copy link
              </button>
              <a
                className="btn btn-sm btn-wa"
                href={`https://wa.me/?text=${encodeURIComponent(`Get your old car scrapped free of cost — instant quote: ${url}`)}`}
                target="_blank"
                rel="noreferrer"
              >
                <Icon name="whatsapp" size={12} /> Share on WhatsApp
              </a>
            </div>
          </div>
          <div className="card-pad" style={{ paddingTop: 0 }}>
            <div className="alert alert-info">
              <Icon name="spark" size={14} style={{ marginTop: 2 }} />
              <span>
                Every submission carries its platform, campaign and ad variant — and repeats are flagged
                automatically.
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="split">
        <div className="card">
          <div className="card-head">
            <div>
              <h3>Campaign performance</h3>
              <div className="sub">Last 30 days · cost per lead and per pickup</div>
            </div>
            <div className="spacer" />
            <span className="filter-count">
              {currency(totals.totalSpend || 0)} spend · {num(totals.total || 0)} leads
            </span>
          </div>
          <div className="table-wrap">
            <table className="leads">
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Platform</th>
                  <th>Leads</th>
                  <th>Pickups</th>
                  <th>Spend</th>
                  <th>CPL</th>
                  <th>Cost / pickup</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.length === 0 && (
                  <tr>
                    <td colSpan={7}>
                      <div className="empty" style={{ padding: '24px 10px' }}>
                        <div className="emoji">📈</div>
                        <h4>No campaign data yet</h4>
                        <p>Send traffic through a tracked link to populate this.</p>
                      </div>
                    </td>
                  </tr>
                )}
                {campaigns.map((c) => (
                  <tr key={`${c.name}-${c.source}`} style={{ cursor: 'default' }}>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td>
                      <span className="source-tag">
                        <span className="src-dot" style={{ background: sourceMeta(c.source).color }}>
                          {sourceMeta(c.source).letter}
                        </span>
                        {sourceMeta(c.source).label}
                      </span>
                    </td>
                    <td style={{ fontWeight: 650 }}>{c.leads}</td>
                    <td>{c.received}</td>
                    <td>{c.spend ? currency(c.spend) : '—'}</td>
                    <td>
                      {c.cpl ? (
                        currency(c.cpl)
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>{c.costPerPickup ? currency(c.costPerPickup) : <span className="muted">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <h3>Ad spend</h3>
              <div className="sub">Enter what you spent per campaign, per month</div>
            </div>
          </div>
          <form className="card-pad" onSubmit={addSpend} style={{ display: 'grid', gap: 10 }}>
            <div className="field">
              <label>Campaign</label>
              <input
                className="input"
                value={spendForm.campaignName}
                onChange={(e) => setSpendForm({ ...spendForm, campaignName: e.target.value })}
                placeholder="IG_Reels_Scrap"
                required
              />
            </div>
            <div className="grid-2" style={{ display: 'grid', gap: 10 }}>
              <div className="field">
                <label>Platform</label>
                <select
                  className="select"
                  value={spendForm.source}
                  onChange={(e) => setSpendForm({ ...spendForm, source: e.target.value })}
                >
                  {SOURCES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Month</label>
                <input
                  className="input"
                  type="month"
                  value={spendForm.month}
                  onChange={(e) => setSpendForm({ ...spendForm, month: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="field">
              <label>Amount spent (₹)</label>
              <input
                className="input"
                type="number"
                min="1"
                value={spendForm.amount}
                onChange={(e) => setSpendForm({ ...spendForm, amount: e.target.value })}
                placeholder="25000"
                required
              />
            </div>
            <button className="btn btn-primary btn-sm" disabled={saving} style={{ justifySelf: 'end' }}>
              {saving ? 'Saving…' : 'Add spend'}
            </button>
          </form>

          <div style={{ padding: '0 18px 16px' }}>
            {spends.slice(0, 6).map((s) => (
              <div className="spend-row" key={s.id}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>{s.campaignName}</div>
                  <div className="lead-sub">
                    {s.month} · {sourceMeta(s.source).label}
                  </div>
                </div>
                <b style={{ fontSize: 12.5 }}>{currency(s.amount)}</b>
                {isAdmin && (
                  <button className="icon-btn danger" onClick={() => removeSpend(s.id)} title="Delete">
                    <Icon name="trash" size={12} />
                  </button>
                )}
              </div>
            ))}
            {spends.length === 0 && <div className="hint">No spend recorded yet.</div>}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <h3>Leads by platform</h3>
            <div className="sub">Where every enquiry came from</div>
          </div>
          <div className="spacer" />
          <Chip color="#475569">{num(totals.total || 0)} total</Chip>
        </div>
        <div className="table-wrap">
          <table className="leads">
            <thead>
              <tr>
                <th>Platform</th>
                <th>Leads</th>
                <th>Share</th>
                <th>Tracked link</th>
              </tr>
            </thead>
            <tbody>
              {(stats?.bySource || []).map((row) => {
                const meta = sourceMeta(row.source);
                const share = totals.total ? Math.round((row.count / totals.total) * 100) : 0;
                const link = `${window.location.origin}/f/main?utm_source=${row.source}&utm_medium=paid_social`;
                return (
                  <tr key={row.source} style={{ cursor: 'default' }}>
                    <td>
                      <span className="source-tag">
                        <span className="src-dot" style={{ background: meta.color }}>
                          {meta.letter}
                        </span>
                        {meta.label}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700 }}>{num(row.count)}</td>
                    <td style={{ width: 190 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="meter" style={{ flex: 1 }}>
                          <div style={{ width: `${share}%` }} />
                        </div>
                        <span style={{ fontSize: 12, color: 'var(--muted)', width: 34 }}>{share}%</span>
                      </div>
                    </td>
                    <td>
                      <button className="btn btn-sm btn-ghost" onClick={() => copy(link, 'Link copied')}>
                        <Icon name="copy" size={12} /> Copy link
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
