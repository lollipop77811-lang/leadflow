import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { num } from '../lib/format';
import { AD_PRESETS, sourceMeta } from '../lib/meta';
import { useToast } from '../lib/toast';
import { usePageHeader } from '../components/PageHeader';
import Icon from '../components/Icon';

const EMPTY = { source: 'instagram', medium: 'paid_social', campaign: '', content: '', term: '' };

export default function Campaigns() {
  const [utm, setUtm] = useState(EMPTY);
  const [base, setBase] = useState(`${window.location.origin}/f/main`);
  const [stats, setStats] = useState(null);
  const toast = useToast();

  const loadStats = useCallback(async () => {
    try {
      setStats(await api('/stats'));
    } catch (err) {
      toast.error(err.message);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  usePageHeader(
    {
      title: 'Ad Links',
      subtitle: 'Build tracked form links for every ad so each lead is attributed correctly',
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
      if (utm.source === 'facebook') u.searchParams.set('fbclid', '{FB_CLICK_ID}');
      if (utm.source === 'google') u.searchParams.set('gclid', '{GCLID}');
      return u.toString();
    } catch {
      return base;
    }
  }, [base, utm]);

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
    } catch {
      window.prompt('Copy this link', text);
    }
  };

  const set = (key) => (e) => setUtm((u) => ({ ...u, [key]: e.target.value }));

  const byCampaign = stats?.byCampaign || [];
  const maxCampaign = Math.max(1, ...byCampaign.map((c) => c.count));
  const total = stats?.totals?.total || 0;

  return (
    <div className="page-section">
      <div className="split">
        <div className="card">
          <div className="card-head">
            <div>
              <h3>Tracked form link builder</h3>
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
                      setUtm({
                        source: p.source,
                        medium: p.medium,
                        campaign: p.campaign,
                        content: p.content,
                        term: '',
                      })
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
                <input className="input" value={utm.campaign} onChange={set('campaign')} placeholder="IG_Reels_Q4" />
              </div>
              <div className="field">
                <label>utm_content</label>
                <input className="input" value={utm.content} onChange={set('content')} placeholder="reel_design_v2" />
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
              <span className="hint">
                Click IDs like <code>fbclid</code> are captured automatically when Meta / Google append them.
              </span>
            </div>

            <div className="alert alert-info">
              <Icon name="spark" size={14} style={{ marginTop: 2 }} />
              <span>
                Every submission lands in the dashboard with its platform, campaign and ad variant attached — no
                manual tagging needed.
              </span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <h3>Performance by campaign</h3>
              <div className="sub">Leads captured per campaign name</div>
            </div>
          </div>
          <div className="card-pad" style={{ paddingTop: 8 }}>
            {byCampaign.length === 0 && (
              <div className="empty" style={{ padding: '26px 8px' }}>
                <div className="emoji">📈</div>
                <h4>No campaign data yet</h4>
                <p>Once tracked links get submissions, they show up here.</p>
              </div>
            )}
            {byCampaign.map((c) => (
              <div className="campaign-row" key={`${c.name}-${c.source}`}>
                <span
                  className="src-dot"
                  style={{ background: sourceMeta(c.source).color }}
                >
                  {sourceMeta(c.source).letter}
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="campaign-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.name}
                  </div>
                  <div className="campaign-sub">{sourceMeta(c.source).label}</div>
                </div>
                <div className="meter">
                  <div style={{ width: `${Math.max(6, (c.count / maxCampaign) * 100)}%` }} />
                </div>
                <span style={{ fontSize: 12.5, fontWeight: 700, minWidth: 22, textAlign: 'right' }}>
                  {c.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <h3>Leads by platform</h3>
            <div className="sub">Where every submission came from</div>
          </div>
          <div className="spacer" />
          <span className="filter-count">{num(total)} total</span>
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
                const share = total ? Math.round((row.count / total) * 100) : 0;
                const link = `${window.location.origin}/f/main?utm_source=${row.source}&utm_medium=paid_social`;
                return (
                  <tr key={row.source}>
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
                      <button className="btn btn-sm btn-ghost" onClick={() => copy(link)}>
                        <Icon name="copy" size={12} /> Copy link
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!stats && (
                <tr>
                  <td colSpan={4}>
                    <div className="skeleton" style={{ height: 60, margin: 10 }} />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
