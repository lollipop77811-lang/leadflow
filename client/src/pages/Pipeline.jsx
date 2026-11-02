import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, qs } from '../lib/api';
import { compactCurrency, currency, relativeTime } from '../lib/format';
import { SOURCES, sourceMeta, STATUSES } from '../lib/meta';
import { useToast } from '../lib/toast';
import { usePageHeader } from '../components/PageHeader';
import LeadDrawer from '../components/LeadDrawer';
import AddLeadModal from '../components/AddLeadModal';
import Icon from '../components/Icon';

export default function Pipeline() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [source, setSource] = useState('');
  const [dragId, setDragId] = useState(null);
  const [overCol, setOverCol] = useState(null);
  const [selected, setSelected] = useState(null);
  const [adding, setAdding] = useState(false);
  const toast = useToast();

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
      [l.name, l.email, l.company, l.campaign?.name].join(' ').toLowerCase().includes(q)
    );
  }, [leads, search]);

  const grouped = useMemo(() => {
    const map = Object.fromEntries(STATUSES.map((s) => [s.id, []]));
    filtered.forEach((l) => {
      (map[l.status] || map.new).push(l);
    });
    return map;
  }, [filtered]);

  const moveLead = async (id, status) => {
    const lead = leads.find((l) => l._id === id);
    if (!lead || lead.status === status) return;
    const prev = lead.status;
    setLeads((all) => all.map((l) => (l._id === id ? { ...l, status } : l)));
    try {
      await api(`/leads/${id}`, { method: 'PATCH', body: { status } });
      toast.success(`Moved to ${status}`);
    } catch (err) {
      setLeads((all) => all.map((l) => (l._id === id ? { ...l, status: prev } : l)));
      toast.error(err.message);
    }
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
      subtitle: 'Drag a card to move a lead through your sales stages',
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
              placeholder="Filter cards by name, email, campaign…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="select"
            style={{ width: 160 }}
            value={source}
            onChange={(e) => setSource(e.target.value)}
          >
            <option value="">All platforms</option>
            {SOURCES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <span className="filter-count">
            {filtered.length} of last 100 leads shown
          </span>
        </div>

        <div style={{ padding: 12, overflowX: 'auto' }}>
          <div className="board">
            {STATUSES.map((status) => {
              const items = grouped[status.id] || [];
              const value = items.reduce((a, b) => a + (Number(b.value) || 0), 0);
              return (
                <div
                  key={status.id}
                  className={`column ${overCol === status.id ? 'drag-over' : ''}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setOverCol(status.id);
                  }}
                  onDragLeave={() => setOverCol((c) => (c === status.id ? null : c))}
                  onDrop={(e) => {
                    e.preventDefault();
                    setOverCol(null);
                    if (dragId) moveLead(dragId, status.id);
                    setDragId(null);
                  }}
                >
                  <div className="column-head">
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: status.color,
                      }}
                    />
                    <span className="name" style={{ color: status.color }}>
                      {status.label}
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
                        <span
                          className="src-dot"
                          style={{
                            width: 14,
                            height: 14,
                            borderRadius: 4,
                            fontSize: 8,
                            background: sourceMeta(lead.source).color,
                          }}
                        >
                          {sourceMeta(lead.source).letter}
                        </span>
                        <span
                          style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: 130,
                          }}
                        >
                          {lead.campaign?.name || lead.company || 'Direct'}
                        </span>
                      </div>
                      {lead.tags?.length > 0 && (
                        <div className="ktags">
                          {lead.tags.slice(0, 3).map((t) => (
                            <span className="tag" key={t}>
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="kvalue">
                        {lead.value ? currency(lead.value) : '— value'}
                        <span style={{ marginLeft: 'auto', color: 'var(--muted)', fontWeight: 500 }}>
                          {relativeTime(lead.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))}

                  {items.length === 0 && (
                    <div
                      style={{
                        fontSize: 11.5,
                        color: '#94a3b8',
                        textAlign: 'center',
                        padding: '16px 6px',
                        border: '1px dashed #d5daeb',
                        borderRadius: 9,
                      }}
                    >
                      {loading ? 'Loading…' : 'Drop leads here'}
                    </div>
                  )}

                  {items.length > 0 && (
                    <div
                      style={{
                        fontSize: 11,
                        color: 'var(--muted)',
                        padding: '4px 4px 0',
                        fontWeight: 600,
                        display: 'flex',
                        justifyContent: 'space-between',
                      }}
                    >
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
