import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { dueLabel, formatDate } from '../lib/format';
import { STATUSES, WA_TEMPLATES, waLink } from '../lib/meta';
import { useToast } from '../lib/toast';
import { usePageHeader } from '../components/PageHeader';
import LeadDrawer from '../components/LeadDrawer';
import { Chip, StatusBadge, VehicleLine } from '../components/Badges';
import Icon from '../components/Icon';

export default function Today() {
  const [data, setData] = useState({ pickups: [], followUps: [] });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await api('/leads/today'));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  usePageHeader(
    {
      title: 'Today',
      subtitle: 'Pickups scheduled and calls you owe customers',
      actions: (
        <button className="btn" onClick={load}>
          <Icon name="refresh" size={14} /> Refresh
        </button>
      ),
    },
    []
  );

  const patch = async (id, payload, message) => {
    try {
      await api(`/leads/${id}`, { method: 'PATCH', body: payload });
      toast.success(message);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const overdueCount = data.followUps.filter((l) => new Date(l.followUpAt) < new Date(new Date().setHours(0, 0, 0, 0))).length;

  return (
    <div className="page-section">
      <div className="split-even">
        <div className="card">
          <div className="card-head">
            <div>
              <h3>Pickups today</h3>
              <div className="sub">{data.pickups.length} vehicle(s) scheduled</div>
            </div>
            <div className="spacer" />
            <span className="pill" style={{ background: '#e0f2fe', color: '#0369a1' }}>
              <Icon name="truck" size={12} /> {formatDate(new Date(), false)}
            </span>
          </div>
          <div className="list-pad">
            {loading && <div className="skeleton" style={{ height: 120, margin: 10 }} />}
            {!loading && data.pickups.length === 0 && (
              <div className="empty">
                <div className="emoji">🚚</div>
                <h4>No pickups today</h4>
                <p>Schedule a pickup from a lead’s drawer and it will appear here.</p>
              </div>
            )}
            {data.pickups.map((lead) => (
              <div className="pickup-card" key={lead._id}>
                <div className="pickup-card-head">
                  <div style={{ minWidth: 0, flex: 1 }} onClick={() => setSelected(lead._id)}>
                    <div className="task-title">{lead.name}</div>
                    <div className="task-sub">
                      <VehicleLine lead={lead} />
                    </div>
                  </div>
                  <StatusBadge status={lead.status} small />
                </div>
                <div className="pickup-meta">
                  <span>
                    🕘 {lead.pickup?.slot || 'any time'} · {lead.pickup?.needsTowing ? 'Towing' : 'Drive-in'}
                  </span>
                  {lead.pickup?.driver && <span>👤 {lead.pickup.driver}</span>}
                  {lead.pickup?.vendor && <span>🚛 {lead.pickup.vendor}</span>}
                </div>
                <div className="pickup-address">
                  {lead.pickup?.address || '—'}
                  {lead.pickup?.pincode ? `, ${lead.pickup.city || ''} ${lead.pickup.pincode}` : ''}
                </div>
                <div className="pickup-actions">
                  <a className="btn btn-sm btn-wa" href={waLink(lead.phone, WA_TEMPLATES.pickup(lead))} target="_blank" rel="noreferrer">
                    <Icon name="whatsapp" size={12} /> Confirm
                  </a>
                  <a className="btn btn-sm" href={`tel:${lead.phone.replace(/[^\d+]/g, '')}`}>
                    <Icon name="phone" size={12} /> Call
                  </a>
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => patch(lead._id, { status: 'vehicle_received' }, 'Vehicle received')}
                  >
                    Mark received
                  </button>
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={() => patch(lead._id, { pickup: { noShow: true } }, 'Marked as no-show')}
                    title="Customer was not available"
                  >
                    No-show
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <h3>Follow-ups due</h3>
              <div className="sub">
                {data.followUps.length} call(s){overdueCount > 0 ? ` · ${overdueCount} overdue` : ''}
              </div>
            </div>
            <div className="spacer" />
            {overdueCount > 0 && <Chip color="#b91c1c">{overdueCount} overdue</Chip>}
          </div>
          <div className="list-pad">
            {loading && <div className="skeleton" style={{ height: 120, margin: 10 }} />}
            {!loading && data.followUps.length === 0 && (
              <div className="empty">
                <div className="emoji">☕</div>
                <h4>All caught up</h4>
                <p>No follow-ups due today. Set a follow-up date on a lead to see it here.</p>
              </div>
            )}
            {data.followUps.map((lead) => {
              const overdue = new Date(lead.followUpAt) < new Date(new Date().setHours(0, 0, 0, 0));
              return (
                <div className={`follow-row ${overdue ? 'overdue' : ''}`} key={lead._id}>
                  <label className="follow-check" title="Mark as done">
                    <input
                      type="checkbox"
                      onChange={() =>
                        patch(
                          lead._id,
                          {
                            followUpAt: null,
                            ...(lead.status === 'new' ? { status: 'contacted' } : {}),
                          },
                          'Follow-up closed'
                        )
                      }
                    />
                  </label>
                  <div style={{ minWidth: 0, flex: 1 }} onClick={() => setSelected(lead._id)}>
                    <div className="task-title">{lead.name}</div>
                    <div className="task-sub">
                      <VehicleLine lead={lead} /> · {lead.phone}
                    </div>
                    <div className="follow-meta">
                      <Chip color={overdue ? '#b91c1c' : '#1d4ed8'}>{dueLabel(lead.followUpAt)}</Chip>
                      <span>{STATUSES.find((s) => s.id === lead.status)?.label}</span>
                      {lead.assignedToName && <span>· {lead.assignedToName}</span>}
                    </div>
                  </div>
                  <div className="follow-actions">
                    <a
                      className="icon-btn wa"
                      href={waLink(lead.phone, WA_TEMPLATES.followup(lead))}
                      target="_blank"
                      rel="noreferrer"
                      title="WhatsApp"
                    >
                      <Icon name="whatsapp" size={13} />
                    </a>
                    <a className="icon-btn" href={`tel:${lead.phone.replace(/[^\d+]/g, '')}`} title="Call">
                      <Icon name="phone" size={13} />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {selected && (
        <LeadDrawer
          leadId={selected}
          onClose={() => setSelected(null)}
          onChanged={load}
          onDeleted={() => {
            setSelected(null);
            load();
          }}
        />
      )}
    </div>
  );
}
