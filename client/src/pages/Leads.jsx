import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, downloadCsv, qs } from '../lib/api';
import { currency, initials, num, relativeTime } from '../lib/format';
import { SOURCES, STATUSES } from '../lib/meta';
import { useToast } from '../lib/toast';
import { usePageHeader } from '../components/PageHeader';
import { SourceTag, StatusBadge } from '../components/Badges';
import LeadDrawer from '../components/LeadDrawer';
import AddLeadModal from '../components/AddLeadModal';
import Icon from '../components/Icon';

const PAGE_SIZE = 20;

export default function Leads() {
  const [filters, setFilters] = useState({
    q: '',
    status: '',
    source: '',
    sort: 'newest',
    from: '',
    to: '',
  });
  const [search, setSearch] = useState('');
  const [data, setData] = useState({ items: [], total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [adding, setAdding] = useState(false);
  const toast = useToast();
  const firstLoad = useRef(true);

  // debounce the search box
  useEffect(() => {
    const t = setTimeout(() => {
      setFilters((f) => (f.q === search ? f : { ...f, q: search }));
      setPage(1);
    }, 320);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    if (!firstLoad.current) setLoading(true);
    try {
      const res = await api(
        `/leads${qs({ ...filters, page, limit: PAGE_SIZE })}`
      );
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

  // CSV export honours the current filters
  const params = filters;

  const activeFilters =
    (filters.status ? 1 : 0) +
    (filters.source ? 1 : 0) +
    (filters.from ? 1 : 0) +
    (filters.to ? 1 : 0) +
    (filters.q ? 1 : 0);

  const exportCsv = async () => {
    try {
      await downloadCsv(params);
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
      subtitle: `${num(data.total)} ${data.total === 1 ? 'lead' : 'leads'} in your workspace`,
      actions: header,
    },
    [header, data.total]
  );

  const clearFilters = () => {
    setSearch('');
    setFilters({ q: '', status: '', source: '', sort: 'newest', from: '', to: '' });
    setPage(1);
  };

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
              placeholder="Search name, email, phone, company, campaign…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="select"
            style={{ width: 140 }}
            value={filters.status}
            onChange={(e) => {
              setFilters({ ...filters, status: e.target.value });
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>

          <select
            className="select"
            style={{ width: 150 }}
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
            value={filters.sort}
            onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="value_desc">Highest value</option>
            <option value="value_asc">Lowest value</option>
            <option value="name_asc">Name A→Z</option>
            <option value="name_desc">Name Z→A</option>
          </select>

          <input
            className="input"
            style={{ width: 138 }}
            type="date"
            value={filters.from}
            onChange={(e) => {
              setFilters({ ...filters, from: e.target.value });
              setPage(1);
            }}
            title="From date"
          />
          <input
            className="input"
            style={{ width: 138 }}
            type="date"
            value={filters.to}
            onChange={(e) => {
              setFilters({ ...filters, to: e.target.value });
              setPage(1);
            }}
            title="To date"
          />

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
                <th>Lead</th>
                <th>Status</th>
                <th>Source</th>
                <th>Campaign</th>
                <th style={{ textAlign: 'right' }}>Value</th>
                <th>Created</th>
                <th style={{ width: 70 }} />
              </tr>
            </thead>
            <tbody>
              {loading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={`sk-${i}`}>
                    <td colSpan={7}>
                      <div className="skeleton" style={{ height: 22, width: '100%' }} />
                    </td>
                  </tr>
                ))}

              {!loading && data.items.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <div className="empty">
                      <div className="emoji">🔍</div>
                      <h4>No leads found</h4>
                      <p>
                        {activeFilters
                          ? 'Try clearing a filter or searching for something else.'
                          : 'Share your ad link — new form submissions will land here.'}
                      </p>
                      <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'center' }}>
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
                          <div style={{ textOverflow: 'ellipsis', overflow: 'hidden' }}>{lead.name}</div>
                          <div className="lead-sub">{lead.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={lead.status} />
                    </td>
                    <td>
                      <SourceTag source={lead.source} />
                    </td>
                    <td>
                      <div style={{ fontSize: 12.5, fontWeight: 550 }}>
                        {lead.campaign?.name || <span style={{ color: 'var(--muted)' }}>—</span>}
                      </div>
                      {lead.campaign?.content && <div className="lead-sub">{lead.campaign.content}</div>}
                    </td>
                    <td style={{ textAlign: 'right' }} className="cell-value">
                      {lead.value ? currency(lead.value) : '—'}
                    </td>
                    <td style={{ color: 'var(--muted)', fontSize: 12.5, whiteSpace: 'nowrap' }}>
                      {relativeTime(lead.createdAt)}
                    </td>
                    <td>
                      <div className="row-actions">
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
          <button
            className="btn btn-sm"
            disabled={data.page >= data.pages}
            onClick={() => setPage((p) => p + 1)}
          >
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
