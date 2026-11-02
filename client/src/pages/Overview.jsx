import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { compactCurrency, currency, initials, num, relativeTime } from '../lib/format';
import { statusMeta, STATUSES } from '../lib/meta';
import { useToast } from '../lib/toast';
import { usePageHeader } from '../components/PageHeader';
import StatCard from '../components/StatCard';
import TrendChart from '../components/TrendChart';
import SourceBreakdown from '../components/SourceBreakdown';
import LeadDrawer from '../components/LeadDrawer';
import AddLeadModal from '../components/AddLeadModal';
import { SourceTag, StatusBadge } from '../components/Badges';
import Icon from '../components/Icon';

export default function Overview() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [adding, setAdding] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await api('/stats');
      setStats(data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totals = stats?.totals;
  const newCount = stats?.byStatus?.find((s) => s.status === 'new')?.count || 0;

  const actions = useMemo(
    () => (
      <>
        <button className="btn" onClick={() => load(true)} title="Refresh">
          <Icon name="refresh" size={14} /> Refresh
        </button>
        <a className="btn" href="/f/main" target="_blank" rel="noreferrer">
          <Icon name="form" size={14} /> Preview form
        </a>
        <button className="btn btn-primary" onClick={() => setAdding(true)}>
          <Icon name="plus" size={14} /> Add lead
        </button>
      </>
    ),
    []
  );

  usePageHeader(
    {
      title: 'Overview',
      subtitle: 'Every lead from Instagram, Facebook, Google and more — in one place',
      actions,
    },
    [actions]
  );

  const maxStatus = Math.max(1, ...(stats?.byStatus || []).map((s) => s.count));

  return (
    <div className="page-section">
      <div className="kpi-grid">
        {loading && !stats ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div className="card kpi" key={i}>
              <div className="skeleton" style={{ height: 12, width: '55%' }} />
              <div className="skeleton" style={{ height: 26, width: '40%' }} />
              <div className="skeleton" style={{ height: 11, width: '70%' }} />
            </div>
          ))
        ) : (
          <>
            <StatCard
              label="Total leads"
              value={num(totals?.total)}
              icon="leads"
              tone="brand"
              foot={`· ${num(totals?.week)} in last 7 days`}
              trend={{ dir: 'up', value: `${num(totals?.today)} today` }}
            />
            <StatCard
              label="New (to contact)"
              value={num(newCount)}
              icon="spark"
              tone="blue"
              foot="· waiting for first touch"
            />
            <StatCard
              label="Open pipeline"
              value={compactCurrency(totals?.pipelineValue)}
              icon="trend"
              tone="violet"
              foot={`· won ${compactCurrency(totals?.wonValue)}`}
            />
            <StatCard
              label="Conversion rate"
              value={`${totals?.conversionRate ?? 0}%`}
              icon="check"
              tone="green"
              foot={`· ${num(totals?.converted)} converted`}
            />
          </>
        )}
      </div>

      <div className="split">
        <div className="card">
          <div className="card-head">
            <div>
              <h3>Leads captured</h3>
              <div className="sub">Last 14 days · all platforms</div>
            </div>
            <div className="spacer" />
            <span className="pill" style={{ background: 'var(--brand-soft)', color: 'var(--brand-ink)' }}>
              {num((stats?.timeline || []).reduce((a, b) => a + b.count, 0))} in window
            </span>
          </div>
          {stats ? (
            <TrendChart data={stats.timeline} />
          ) : (
            <div className="skeleton" style={{ height: 196, margin: 14 }} />
          )}
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <h3>Where leads come from</h3>
              <div className="sub">Attributed ad platform</div>
            </div>
            <div className="spacer" />
            <button className="btn btn-sm btn-ghost" onClick={() => navigate('/campaigns')}>
              Links <Icon name="arrowUpRight" size={12} />
            </button>
          </div>
          <SourceBreakdown items={stats?.bySource || []} total={totals?.total || 0} />
        </div>
      </div>

      <div className="split-even">
        <div className="card">
          <div className="card-head">
            <div>
              <h3>Pipeline by status</h3>
              <div className="sub">Click a stage to open the board</div>
            </div>
            <div className="spacer" />
            <button className="btn btn-sm btn-ghost" onClick={() => navigate('/pipeline')}>
              Open board <Icon name="right" size={12} />
            </button>
          </div>
          <div style={{ padding: '14px 18px 18px', display: 'grid', gap: 12 }}>
            {STATUSES.map((s) => {
              const count = stats?.byStatus?.find((x) => x.status === s.id)?.count || 0;
              return (
                <div
                  key={s.id}
                  onClick={() => navigate(`/pipeline?status=${s.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 12.5,
                      marginBottom: 5,
                    }}
                  >
                    <span style={{ fontWeight: 600, color: statusMeta(s.id).color }}>{s.label}</span>
                    <span style={{ color: 'var(--muted)', fontWeight: 550 }}>{num(count)}</span>
                  </div>
                  <div className="bar-track" style={{ height: 8 }}>
                    <div
                      className="bar-fill"
                      style={{
                        width: `${Math.max(3, (count / maxStatus) * 100)}%`,
                        background: statusMeta(s.id).color,
                        opacity: 0.85,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <h3>Latest leads</h3>
              <div className="sub">Fresh submissions from your form</div>
            </div>
            <div className="spacer" />
            <button className="btn btn-sm btn-ghost" onClick={() => navigate('/leads')}>
              View all <Icon name="right" size={12} />
            </button>
          </div>
          <div style={{ padding: '6px 8px 10px' }}>
            {(stats?.recent || []).map((lead) => (
              <div
                key={lead._id}
                onClick={() => setSelected(lead._id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 10px',
                  borderRadius: 10,
                  cursor: 'pointer',
                }}
                className="recent-row"
                onMouseEnter={(e) => (e.currentTarget.style.background = '#fafbff')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <span className="avatar-sq" style={{ width: 30, height: 30, borderRadius: 9 }}>
                  {initials(lead.name)}
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {lead.name}
                  </div>
                  <div className="lead-sub">
                    <SourceTag source={lead.source} showDot={false} /> · {relativeTime(lead.createdAt)}
                  </div>
                </div>
                {lead.value > 0 && (
                  <span style={{ fontSize: 12, fontWeight: 650, color: 'var(--ink-2)' }}>
                    {currency(lead.value)}
                  </span>
                )}
                <StatusBadge status={lead.status} />
              </div>
            ))}
            {!loading && (stats?.recent || []).length === 0 && (
              <div className="empty">
                <div className="emoji">🌱</div>
                <h4>No leads yet</h4>
                <p>Submit your public form to see the first lead arrive.</p>
                <a className="btn btn-sm btn-primary" href="/f/main" target="_blank" rel="noreferrer" style={{ marginTop: 12 }}>
                  Open the form
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {selected && (
        <LeadDrawer
          leadId={selected}
          onClose={() => setSelected(null)}
          onChanged={() => load(true)}
        />
      )}
      {adding && (
        <AddLeadModal
          onClose={() => setAdding(false)}
          onCreated={() => load(true)}
        />
      )}
    </div>
  );
}
