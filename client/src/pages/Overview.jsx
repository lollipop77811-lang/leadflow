import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { compactCurrency, currency, relativeTime, tonnes } from '../lib/format';
import { LOST_REASONS, STATUSES, statusMeta } from '../lib/meta';
import { useToast } from '../lib/toast';
import { usePageHeader } from '../components/PageHeader';
import StatCard from '../components/StatCard';
import TrendChart from '../components/TrendChart';
import SourceBreakdown from '../components/SourceBreakdown';
import LeadDrawer from '../components/LeadDrawer';
import AddLeadModal from '../components/AddLeadModal';
import { Chip, FollowUpChip, StatusBadge, VehicleLine } from '../components/Badges';
import Icon from '../components/Icon';

export default function Overview() {
  const [stats, setStats] = useState(null);
  const [today, setToday] = useState({ pickups: [], followUps: [] });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [adding, setAdding] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [s, t] = await Promise.all([api('/stats'), api('/leads/today').catch(() => null)]);
      setStats(s);
      if (t) setToday(t);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totals = stats?.totals || {};
  const newCount = stats?.byStatus?.find((s) => s.status === 'new')?.count || 0;

  const actions = useMemo(
    () => (
      <>
        <button className="btn" onClick={() => load(true)} title="Refresh">
          <Icon name="refresh" size={14} /> Refresh
        </button>
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
      subtitle: 'Leads, quotes, pickups and paperwork — at a glance',
      actions,
    },
    [actions]
  );

  const maxStatus = Math.max(1, ...(stats?.byStatus || []).map((s) => s.count));
  const maxLost = Math.max(1, ...(stats?.lostReasons || []).map((l) => l.count));
  const overdue = stats?.followUps?.overdue || 0;

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
              label="New leads today"
              value={totals.today ?? 0}
              icon="leads"
              tone="brand"
              trend={{ dir: 'up', value: `${newCount} waiting` }}
              foot="· first call pending"
            />
            <StatCard
              label="Vehicles picked up (month)"
              value={totals.receivedMonth ?? 0}
              icon="truck"
              tone="green"
              foot={`· ${tonnes(totals.tonnageMonth)} scrapped`}
            />
            <StatCard
              label="Quotes out"
              value={totals.quotesOut ?? 0}
              icon="rupee"
              tone="violet"
              foot={`· ${compactCurrency(totals.openQuoteValue)} in play`}
            />
            <StatCard
              label="Payout pending"
              value={compactCurrency(totals.pendingPayout)}
              icon="clock"
              tone="amber"
              foot={`· ${compactCurrency(totals.paidMonth)} paid`}
            />
          </>
        )}
      </div>

      <div className="mini-stats">
        <button className="mini-stat" onClick={() => navigate('/today')}>
          <span className="mini-label">Pickups today</span>
          <b>{stats?.pickupsToday ?? 0}</b>
        </button>
        <button className="mini-stat" onClick={() => navigate('/today')}>
          <span className="mini-label">Follow-ups due</span>
          <b>
            {(stats?.followUps?.today || 0) + overdue}
            {overdue > 0 && <em className="mini-danger"> · {overdue} overdue</em>}
          </b>
        </button>
        <div className="mini-stat">
          <span className="mini-label">Lead → pickup</span>
          <b>{totals.conversionRate ?? 0}%</b>
        </div>
        <div className="mini-stat">
          <span className="mini-label">Avg. first response</span>
          <b>{totals.avgResponseMins ? `${totals.avgResponseMins} min` : '—'}</b>
        </div>
        <div className="mini-stat">
          <span className="mini-label">Cost per lead</span>
          <b>{totals.cpl ? currency(totals.cpl) : '—'}</b>
        </div>
        <div className="mini-stat">
          <span className="mini-label">Cost per pickup</span>
          <b>{totals.costPerPickup ? currency(totals.costPerPickup) : '—'}</b>
        </div>
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
              {(stats?.timeline || []).reduce((a, b) => a + b.count, 0)} in window
            </span>
          </div>
          {stats ? <TrendChart data={stats.timeline} /> : <div className="skeleton" style={{ height: 190, margin: 14 }} />}
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <h3>Where leads come from</h3>
              <div className="sub">Attribution by platform</div>
            </div>
            <div className="spacer" />
            <button className="btn btn-sm btn-ghost" onClick={() => navigate('/campaigns')}>
              Ads <Icon name="arrowUpRight" size={12} />
            </button>
          </div>
          <SourceBreakdown items={stats?.bySource || []} total={totals.total || 0} />
        </div>
      </div>

      <div className="split-even">
        <div className="card">
          <div className="card-head">
            <div>
              <h3>Today’s priorities</h3>
              <div className="sub">Pickups scheduled and calls due</div>
            </div>
            <div className="spacer" />
            <button className="btn btn-sm btn-ghost" onClick={() => navigate('/today')}>
              Open <Icon name="right" size={12} />
            </button>
          </div>
          <div className="list-pad">
            {today.pickups.slice(0, 3).map((lead) => (
              <div className="task-row" key={lead._id} onClick={() => setSelected(lead._id)}>
                <span className="task-icon pickup">🚚</span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="task-title">{lead.name}</div>
                  <div className="task-sub">
                    <VehicleLine lead={lead} showMeta={false} /> · {lead.pickup?.slot || 'any time'}
                  </div>
                </div>
                <StatusBadge status={lead.status} small />
              </div>
            ))}

            {today.followUps.slice(0, 4).map((lead) => (
              <div className="task-row" key={lead._id} onClick={() => setSelected(lead._id)}>
                <span className="task-icon call">☎</span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="task-title">{lead.name}</div>
                  <div className="task-sub">
                    <VehicleLine lead={lead} showMeta={false} /> · {lead.phone}
                  </div>
                </div>
                <FollowUpChip date={lead.followUpAt} status={lead.status} />
              </div>
            ))}

            {today.pickups.length === 0 && today.followUps.length === 0 && (
              <div className="empty" style={{ padding: '26px 10px' }}>
                <div className="emoji">☕</div>
                <h4>Nothing due today</h4>
                <p>Schedule follow-ups from a lead to see them here.</p>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <h3>Latest enquiries</h3>
              <div className="sub">Fresh submissions from your form</div>
            </div>
            <div className="spacer" />
            <button className="btn btn-sm btn-ghost" onClick={() => navigate('/leads')}>
              View all <Icon name="right" size={12} />
            </button>
          </div>
          <div style={{ padding: '6px 8px 10px' }}>
            {(stats?.recent || []).map((lead) => (
              <div key={lead._id} className="recent-row" onClick={() => setSelected(lead._id)}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="recent-name">
                    {lead.name}
                    {lead.duplicateCount > 0 && <Chip color="#b45309">↺</Chip>}
                  </div>
                  <div className="lead-sub">
                    <VehicleLine lead={lead} /> · {relativeTime(lead.createdAt)}
                  </div>
                </div>
                {lead.quote?.amount > 0 && (
                  <span style={{ fontSize: 12, fontWeight: 650 }}>{currency(lead.quote.amount)}</span>
                )}
                <StatusBadge status={lead.status} small />
              </div>
            ))}
            {!loading && (stats?.recent || []).length === 0 && (
              <div className="empty">
                <div className="emoji">🌱</div>
                <h4>No leads yet</h4>
                <p>Submit your public form to see the first one arrive.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="split-even">
        <div className="card">
          <div className="card-head">
            <div>
              <h3>Pipeline by stage</h3>
              <div className="sub">Where the enquiries are sitting</div>
            </div>
            <div className="spacer" />
            <button className="btn btn-sm btn-ghost" onClick={() => navigate('/pipeline')}>
              Board <Icon name="right" size={12} />
            </button>
          </div>
          <div style={{ padding: '14px 18px 18px', display: 'grid', gap: 11 }}>
            {STATUSES.map((s) => {
              const count = stats?.byStatus?.find((x) => x.status === s.id)?.count || 0;
              return (
                <div key={s.id} onClick={() => navigate(`/pipeline?status=${s.id}`)} style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 5 }}>
                    <span style={{ fontWeight: 600, color: statusMeta(s.id).color }}>{s.label}</span>
                    <span style={{ color: 'var(--muted)', fontWeight: 550 }}>{count}</span>
                  </div>
                  <div className="bar-track" style={{ height: 7 }}>
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
              <h3>Why leads are lost</h3>
              <div className="sub">Lost reasons recorded by the team</div>
            </div>
          </div>
          <div style={{ padding: '14px 18px 18px', display: 'grid', gap: 10 }}>
            {(stats?.lostReasons || []).filter((l) => l.count > 0).length === 0 && (
              <div className="empty" style={{ padding: '22px 8px' }}>
                <div className="emoji">🎯</div>
                <h4>No lost leads</h4>
                <p>Lost reasons will show up here once recorded.</p>
              </div>
            )}
            {(stats?.lostReasons || [])
              .filter((l) => l.count > 0)
              .map((l) => (
                <div key={l.reason}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
                    <span>{LOST_REASONS.find((r) => r.id === l.reason)?.label || l.reason}</span>
                    <span style={{ color: 'var(--muted)', fontWeight: 600 }}>{l.count}</span>
                  </div>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{ width: `${Math.max(4, (l.count / maxLost) * 100)}%`, background: '#ef4444', opacity: 0.75 }}
                    />
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {selected && (
        <LeadDrawer leadId={selected} onClose={() => setSelected(null)} onChanged={() => load(true)} />
      )}
      {adding && <AddLeadModal onClose={() => setAdding(false)} onCreated={() => load(true)} />}
    </div>
  );
}
