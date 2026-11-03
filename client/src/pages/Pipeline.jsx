import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, qs } from '../lib/api';
import { compactCurrency, currency, relativeTime } from '../lib/format';
import { LOST_REASONS, SOURCES, STATUSES, statusMeta } from '../lib/meta';
import { useToast } from '../lib/toast';
import { usePageHeader } from '../components/PageHeader';
import LeadDrawer from '../components/LeadDrawer';
import AddLeadModal from '../components/AddLeadModal';
import Modal from '../components/Modal';
import { Chip, DocProgress, FollowUpChip, VehicleLine } from '../components/Badges';
import Icon from '../components/Icon';

export default function Pipeline() {
  const [params] = useSearchParams();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [source, setSource] = useState('');
  const [dragId, setDragId] = useState(null);
  const [overCol, setOverCol] = useState(null);
  const [selected, setSelected] = useState(null);
  const [adding, setAdding] = useState(false);
  const [lostFor, setLostFor] = useState(null);
  const toast = useToast();

  const focusStage = params.get('status');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api(`/leads${qs({ limit: 100, sort: 'newest', source })}`);
      setLeads(res.items);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [source]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter((l) =>
      [l.name, l.phone, l.vehicle?.make, l.vehicle?.model, l.campaign?.name]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [leads, search]);

  const grouped = useMemo(() => {
    const map = Object.fromEntries(STATUSES.map((s) => [s.id, []]));
    filtered.forEach((l) => (map[l.status] || map.new).push(l));
    return map;
  }, [filtered]);

  const moveLead = async (id, status, lostReason) => {
    const lead = leads.find((l) => l._id === id);
    if (!lead || lead.status === status) return;
    const prev = { status: lead.status, lostReason: lead.lostReason };
    setLeads((all) => all.map((l) => (l._id === id ? { ...l, status, lostReason: lostReason || '' } : l)));
    try {
      await api(`/leads/${id}`, { method: 'PATCH', body: { status, ...(lostReason ? { lostReason } : {}) } });
      toast.success(`Moved to ${statusMeta(status).label}`);
    } catch (err) {
      setLeads((all) => all.map((l) => (l._id === id ? { ...l, ...prev } : l)));
      toast.error(err.message);
    }
  };

  const onDrop = (status) => {
    setOverCol(null);
    const id = dragId;
    setDragId(null);
    if (!id) return;
    if (status === 'lost') {
      setLostFor(id);
      return;
    }
    moveLead(id, status);
  };

  const actions = useMemo(
    () => (
      <button className="btn btn-primary" onClick={() => setAdding(true)}>
        <Icon name="plus" size={14} /> Add lead
      </button>
    ),
    []
  );

  usePageHeader(
    {
      title: 'Pipeline',
      subtitle: 'Drag a card to move the car through your stages',
      actions,
    },
    [actions]
  );

  return (
    <div className="page-section">
      <div className="card">
        <div className="toolbar">
          <div className="input-icon grow">
            <span className="ico">
              <Icon name="search" size={14} />
            </span>
            <input
              className="input"
              placeholder="Filter by name, phone, car, campaign…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select className="select" style={{ width: 160 }} value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="">All platforms</option>
            {SOURCES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <span className="filter-count">{filtered.length} of the latest 100 leads</span>
        </div>

        <div style={{ padding: 12, overflowX: 'auto' }}>
          <div className="board board-8">
            {STATUSES.map((status) => {
              const items = grouped[status.id] || [];
              const value = items.reduce((a, b) => a + (Number(b.quote?.amount) || 0), 0);
              const highlighted = focusStage === status.id;
              return (
                <div
                  key={status.id}
                  className={`column ${overCol === status.id ? 'drag-over' : ''} ${highlighted ? 'focused' : ''}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setOverCol(status.id);
                  }}
                  onDragLeave={() => setOverCol((c) => (c === status.id ? null : c))}
                  onDrop={(e) => {
                    e.preventDefault();
                    onDrop(status.id);
                  }}
                >
                  <div className="column-head">
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: status.color }} />
                    <span className="name" style={{ color: status.color }}>
                      {status.short}
                    </span>
                    <span className="n">{items.length}</span>
                  </div>

                  {items.map((lead) => (
                    <div
                      key={lead._id}
                      className={`kcard ${dragId === lead._id ? 'dragging' : ''}`}
                      draggable
                      onDragStart={() => setDragId(lead._id)}
                      onDragEnd={() => setDragId(null)}
                      onClick={() => setSelected(lead._id)}
                    >
                      <div className="kname">{lead.name}</div>
                      <div className="kmeta">
                        <VehicleLine lead={lead} />
                      </div>
                      {lead.duplicateCount > 0 && (
                        <div style={{ marginTop: 5 }}>
                          <Chip color="#b45309">↺ repeat</Chip>
                        </div>
                      )}
                      <div className="ktags">
                        {lead.followUpAt && <FollowUpChip date={lead.followUpAt} status={lead.status} />}
                        {lead.pickup?.scheduledDate && (
                          <Chip color="#0369a1">🚚 {relativeTime(lead.pickup.scheduledDate)}</Chip>
                        )}
                      </div>
                      <div className="kvalue">
                        {lead.quote?.amount ? currency(lead.quote.amount) : '— quote'}
                        <span style={{ marginLeft: 'auto' }}>
                          <DocProgress documents={lead.documents} />
                        </span>
                      </div>
                    </div>
                  ))}

                  {items.length === 0 && (
                    <div className="column-empty">{loading ? 'Loading…' : 'Drop leads here'}</div>
                  )}

                  {items.length > 0 && (
                    <div className="column-foot">
                      <span>Stage value</span>
                      <span>{compactCurrency(value)}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {lostFor && (
        <Modal
          title="Why is this lead lost?"
          subtitle="Lost reasons power your reports — pick the closest one."
          onClose={() => setLostFor(null)}
          width={430}
        >
          <div style={{ display: 'grid', gap: 8 }}>
            {LOST_REASONS.map((r) => (
              <button
                key={r.id}
                className="btn"
                style={{ justifyContent: 'flex-start' }}
                onClick={() => {
                  moveLead(lostFor, 'lost', r.id);
                  setLostFor(null);
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
        </Modal>
      )}

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
      {adding && <AddLeadModal onClose={() => setAdding(false)} onCreated={load} />}
    </div>
  );
}
