import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, downloadCsv, qs } from '../lib/api';
import { useAuth } from '../lib/auth';
import { currency, initials, num, relativeTime } from '../lib/format';
import { LOST_REASONS, SOURCES, STATUSES, WA_TEMPLATES, waLink } from '../lib/meta';
import { useToast } from '../lib/toast';
import { usePageHeader } from '../components/PageHeader';
import { Chip, DocProgress, FollowUpChip, SourceTag, StatusBadge, VehicleLine } from '../components/Badges';
import LeadDrawer from '../components/LeadDrawer';
import AddLeadModal from '../components/AddLeadModal';
import Icon from '../components/Icon';

const PAGE_SIZE = 20;

const EMPTY_FILTERS = {
  q: '',
  status: '',
  source: '',
  lostReason: '',
  assignedTo: '',
  due: '',
  sort: 'newest',
  from: '',
  to: '',
};

export default function Leads() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [search, setSearch] = useState('');
  const [data, setData] = useState({ items: [], total: 0, page: 1, pages: 1, statusCounts: {} });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [adding, setAdding] = useState(false);
  const [users, setUsers] = useState([]);
  const toast = useToast();
  const firstLoad = useRef(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setFilters((f) => (f.q === search ? f : { ...f, q: search }));
      setPage(1);
    }, 320);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!isAdmin) return;
    api('/users')
      .then((d) => setUsers(d.users || []))
      .catch(() => {});
  }, [isAdmin]);

  const load = useCallback(async () => {
    if (!firstLoad.current) setLoading(true);
    try {
      const res = await api(`/leads${qs({ ...filters, page, limit: PAGE_SIZE })}`);
      setData(res);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
      firstLoad.current = false;
    }
  }, [filters, page]);

  useEffect(() => {
    load();
  }, [load]);

  const activeFilters = Object.entries(filters).filter(
    ([k, v]) => v && !['sort'].includes(k)
  ).length;

  const exportCsv = async () => {
    try {
      await downloadCsv(filters);
      toast.success('CSV exported');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const removeLead = async (id) => {
    if (!window.confirm('Delete this lead? This cannot be undone.')) return;
    try {
      await api(`/leads/${id}`, { method: 'DELETE' });
      toast.success('Lead deleted');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const clearFilters = () => {
    setSearch('');
    setFilters(EMPTY_FILTERS);
    setPage(1);
  };

  const header = useMemo(
    () => (
      <>
        <button className="btn" onClick={exportCsv}>
          <Icon name="download" size={14} /> Export CSV
        </button>
        <button className="btn btn-primary" onClick={() => setAdding(true)}>
          <Icon name="plus" size={14} /> Add lead
        </button>
      </>
    ),
    [filters]
  );

  usePageHeader(
    {
      title: 'Leads',
      subtitle: `${num(data.total)} ${data.total === 1 ? 'lead' : 'leads'} · ${num(
        data.statusCounts?.new || 0
      )} waiting for first call`,
      actions: header,
    },
    [header, data.total, data.statusCounts]
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
              placeholder="Search name, phone, car, RC number, city, campaign…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="select"
            style={{ width: 138 }}
            value={filters.status}
            onChange={(e) => {
              setFilters({ ...filters, status: e.target.value });
              setPage(1);
            }}
          >
            <option value="">All stages</option>
            {STATUSES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>

          <select
            className="select"
            style={{ width: 148 }}
            value={filters.source}
            onChange={(e) => {
              setFilters({ ...filters, source: e.target.value });
              setPage(1);
            }}
          >
            <option value="">All platforms</option>
            {SOURCES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>

          <select
            className="select"
            style={{ width: 150 }}
            value={filters.due}
            onChange={(e) => {
              setFilters({ ...filters, due: e.target.value });
              setPage(1);
            }}
          >
            <option value="">Any follow-up</option>
            <option value="overdue">Overdue follow-up</option>
            <option value="today">Due today</option>
          </select>

          {isAdmin && (
            <select
              className="select"
              style={{ width: 145 }}
              value={filters.assignedTo}
              onChange={(e) => {
                setFilters({ ...filters, assignedTo: e.target.value });
                setPage(1);
              }}
            >
              <option value="">Anyone</option>
              <option value="unassigned">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          )}

          <select
            className="select"
            style={{ width: 140 }}
            value={filters.sort}
            onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="follow_up">Follow-up due</option>
            <option value="value_desc">Highest quote</option>
            <option value="name_asc">Name A→Z</option>
          </select>

          {activeFilters > 0 && (
            <button className="btn btn-sm btn-ghost" onClick={clearFilters}>
              Clear ({activeFilters})
            </button>
          )}
        </div>

        <div className="table-wrap">
          <table className="leads">
            <thead>
              <tr>
                <th>Customer & vehicle</th>
                <th>Stage</th>
                <th>Quote</th>
                <th>Docs</th>
                <th>Follow-up</th>
                <th>Source</th>
                {isAdmin && <th>Owner</th>}
                <th style={{ width: 84 }} />
              </tr>
            </thead>
            <tbody>
              {loading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={`sk-${i}`}>
                    <td colSpan={isAdmin ? 8 : 7}>
                      <div className="skeleton" style={{ height: 26, width: '100%' }} />
                    </td>
                  </tr>
                ))}

              {!loading && data.items.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 8 : 7}>
                    <div className="empty">
                      <div className="emoji">🚗</div>
                      <h4>No leads found</h4>
                      <p>
                        {activeFilters
                          ? 'Try clearing a filter or searching something else.'
                          : 'Once your ad form gets a submission it lands here.'}
                      </p>
                      <div style={{ marginTop: 12 }}>
                        {activeFilters ? (
                          <button className="btn btn-sm" onClick={clearFilters}>
                            Clear filters
                          </button>
                        ) : (
                          <button className="btn btn-sm btn-primary" onClick={() => setAdding(true)}>
                            Add your first lead
                          </button>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              )}

              {!loading &&
                data.items.map((lead) => (
                  <tr key={lead._id} onClick={() => setSelected(lead._id)}>
                    <td>
                      <div className="lead-name">
                        <span className="avatar-sq">{initials(lead.name)}</span>
                        <div style={{ minWidth: 0 }}>
                          <div className="row-1">
                            {lead.name}
                            {lead.duplicateCount > 0 && <Chip color="#b45309">↺ repeat</Chip>}
                            {lead.outOfArea && <Chip color="#b91c1c">out of area</Chip>}
                          </div>
                          <div className="lead-sub">
                            <VehicleLine lead={lead} /> · {lead.phone}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={lead.status} />
                      {lead.status === 'lost' && lead.lostReason && (
                        <div className="lead-sub" style={{ marginTop: 3 }}>
                          {LOST_REASONS.find((r) => r.id === lead.lostReason)?.label}
                        </div>
                      )}
                    </td>
                    <td className="cell-value">
                      {lead.quote?.amount ? currency(lead.quote.amount) : <span className="muted">—</span>}
                      {lead.payout?.amount > 0 && (
                        <div className="lead-sub">paid {currency(lead.payout.amount)}</div>
                      )}
                    </td>
                    <td>
                      <DocProgress documents={lead.documents} />
                    </td>
                    <td>
                      <FollowUpChip date={lead.followUpAt} status={lead.status} />
                      <div className="lead-sub">
                        {lead.pickup?.scheduledDate
                          ? `pickup ${relativeTime(lead.pickup.scheduledDate)}`
                          : relativeTime(lead.createdAt)}
                      </div>
                    </td>
                    <td>
                      <SourceTag source={lead.source} />
                      {lead.campaign?.name && <div className="lead-sub">{lead.campaign.name}</div>}
                    </td>
                    {isAdmin && <td className="cell-owner">{lead.assignedToName || 'Unassigned'}</td>}
                    <td>
                      <div className="row-actions">
                        <a
                          className="icon-btn wa"
                          title="WhatsApp"
                          href={waLink(lead.phone, WA_TEMPLATES.intro(lead))}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Icon name="whatsapp" size={13} />
                        </a>
                        <a
                          className="icon-btn"
                          title="Call"
                          href={`tel:${lead.phone.replace(/[^\d+]/g, '')}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Icon name="phone" size={13} />
                        </a>
                        {isAdmin && (
                          <button
                            className="icon-btn danger"
                            title="Delete lead"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeLead(lead._id);
                            }}
                          >
                            <Icon name="trash" size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="pagination">
          <span>
            {data.total === 0
              ? 'No results'
              : `Showing ${(data.page - 1) * PAGE_SIZE + 1}–${Math.min(
                  data.page * PAGE_SIZE,
                  data.total
                )} of ${num(data.total)}`}
          </span>
          <span className="spacer" />
          <button
            className="btn btn-sm"
            disabled={data.page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <Icon name="left" size={12} /> Prev
          </button>
          <span style={{ padding: '0 4px' }}>
            Page {data.page} / {data.pages}
          </span>
          <button className="btn btn-sm" disabled={data.page >= data.pages} onClick={() => setPage((p) => p + 1)}>
            Next <Icon name="right" size={12} />
          </button>
        </div>
      </div>

      {selected && (
        <LeadDrawer
          leadId={selected}
          onClose={() => setSelected(null)}
          onChanged={() => load()}
          onDeleted={() => {
            setSelected(null);
            load();
          }}
        />
      )}

      {adding && (
        <AddLeadModal
          onClose={() => setAdding(false)}
          onCreated={() => {
            setPage(1);
            load();
          }}
        />
      )}
    </div>
  );
}
