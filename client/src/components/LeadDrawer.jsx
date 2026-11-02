import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { currency, formatDate, initials, relativeTime } from '../lib/format';
import { SOURCES, sourceMeta, STATUSES } from '../lib/meta';
import { useToast } from '../lib/toast';
import Icon from './Icon';
import { SourceTag, StatusBadge } from './Badges';

export default function LeadDrawer({ leadId, onClose, onChanged, onDeleted }) {
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});
  const toast = useToast();

  const load = useCallback(async () => {
    if (!leadId) return;
    setLoading(true);
    try {
      const { lead: l } = await api(`/leads/${leadId}`);
      setLead(l);
      setDraft({
        name: l.name,
        email: l.email,
        phone: l.phone,
        company: l.company,
        value: l.value,
        owner: l.owner,
      });
    } catch (err) {
      toast.error(err.message);
      onClose?.();
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    setLead(null);
    setEditing(false);
    setNote('');
    load();
  }, [leadId, load]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const patch = async (payload, successMsg) => {
    setSaving(true);
    try {
      const { lead: updated } = await api(`/leads/${leadId}`, { method: 'PATCH', body: payload });
      setLead(updated);
      onChanged?.(updated);
      if (successMsg) toast.success(successMsg);
      return updated;
    } catch (err) {
      toast.error(err.message);
      return null;
    } finally {
      setSaving(false);
    }
  };

  const addNote = async (e) => {
    e.preventDefault();
    const text = note.trim();
    if (!text) return;
    setSaving(true);
    try {
      const { lead: updated } = await api(`/leads/${leadId}/notes`, {
        method: 'POST',
        body: { text },
      });
      setLead(updated);
      onChanged?.(updated);
      setNote('');
      toast.success('Note added');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteNote = async (noteId) => {
    try {
      const { lead: updated } = await api(`/leads/${leadId}/notes/${noteId}`, { method: 'DELETE' });
      setLead(updated);
      onChanged?.(updated);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const removeLead = async () => {
    if (!window.confirm(`Delete ${lead?.name}? This cannot be undone.`)) return;
    try {
      await api(`/leads/${leadId}`, { method: 'DELETE' });
      toast.success('Lead deleted');
      onDeleted?.(leadId);
      onClose?.();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const saveEdits = async () => {
    const updated = await patch(
      {
        name: draft.name,
        email: draft.email,
        phone: draft.phone,
        company: draft.company,
        value: Number(draft.value) || 0,
        owner: draft.owner,
      },
      'Lead updated'
    );
    if (updated) setEditing(false);
  };

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true">
        {loading || !lead ? (
          <div style={{ padding: 20 }}>
            <div className="skeleton" style={{ height: 44, width: '60%' }} />
            <div className="skeleton" style={{ height: 14, width: '40%', marginTop: 10 }} />
            <div className="skeleton" style={{ height: 110, marginTop: 24 }} />
            <div className="skeleton" style={{ height: 140, marginTop: 14 }} />
          </div>
        ) : (
          <>
            <div className="drawer-head">
              <div className="avatar" style={{ width: 40, height: 40, fontSize: 14 }}>
                {initials(lead.name)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="drawer-title">{lead.name}</div>
                <div className="drawer-sub">
                  {lead.company || 'No company'} · Captured {relativeTime(lead.createdAt)}
                </div>
              </div>
              <button className="icon-btn" onClick={onClose} aria-label="Close">
                <Icon name="close" size={16} />
              </button>
            </div>

            <div className="drawer-body">
              {/* status + value */}
              <div style={{ display: 'flex', gap: 9, alignItems: 'center', flexWrap: 'wrap' }}>
                <select
                  className="select"
                  style={{ width: 150 }}
                  value={lead.status}
                  disabled={saving}
                  onChange={(e) => patch({ status: e.target.value }, 'Status updated')}
                >
                  {STATUSES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <span className="pill" style={{ background: '#f8fafc', color: 'var(--ink-2)' }}>
                  <Icon name="spark" size={11} /> {currency(lead.value)}
                </span>
                <span className="spacer" style={{ marginLeft: 'auto' }} />
                <button className="btn btn-sm" onClick={() => setEditing((v) => !v)}>
                  {editing ? 'Cancel' : 'Edit'}
                </button>
                <button className="btn btn-sm btn-danger" onClick={removeLead}>
                  <Icon name="trash" size={12} /> Delete
                </button>
              </div>

              {editing ? (
                <div className="card card-pad form-grid">
                  <div className="grid-2" style={{ display: 'grid', gap: 11 }}>
                    <div className="field">
                      <label>Name</label>
                      <input
                        className="input"
                        value={draft.name}
                        onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                      />
                    </div>
                    <div className="field">
                      <label>Email</label>
                      <input
                        className="input"
                        value={draft.email}
                        onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                      />
                    </div>
                    <div className="field">
                      <label>Phone</label>
                      <input
                        className="input"
                        value={draft.phone}
                        onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                      />
                    </div>
                    <div className="field">
                      <label>Company</label>
                      <input
                        className="input"
                        value={draft.company}
                        onChange={(e) => setDraft({ ...draft, company: e.target.value })}
                      />
                    </div>
                    <div className="field">
                      <label>Deal value (₹)</label>
                      <input
                        className="input"
                        type="number"
                        min="0"
                        value={draft.value}
                        onChange={(e) => setDraft({ ...draft, value: e.target.value })}
                      />
                    </div>
                    <div className="field">
                      <label>Owner</label>
                      <input
                        className="input"
                        value={draft.owner}
                        onChange={(e) => setDraft({ ...draft, owner: e.target.value })}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button className="btn btn-sm" onClick={() => setEditing(false)}>
                      Discard
                    </button>
                    <button className="btn btn-sm btn-primary" onClick={saveEdits} disabled={saving}>
                      Save changes
                    </button>
                  </div>
                </div>
              ) : (
                <div className="card card-pad">
                  <div className="section-label">Contact</div>
                  <div className="detail-grid">
                    <div className="detail">
                      <div className="k">Email</div>
                      <a className="v" href={`mailto:${lead.email}`} style={{ color: 'var(--brand)' }}>
                        {lead.email}
                      </a>
                    </div>
                    <div className="detail">
                      <div className="k">Phone</div>
                      <div className="v">
                        {lead.phone ? (
                          <a href={`tel:${lead.phone}`} style={{ color: 'var(--brand)' }}>
                            {lead.phone}
                          </a>
                        ) : (
                          '—'
                        )}
                      </div>
                    </div>
                    <div className="detail">
                      <div className="k">Company</div>
                      <div className="v">{lead.company || '—'}</div>
                    </div>
                    <div className="detail">
                      <div className="k">Owner</div>
                      <div className="v">{lead.owner || 'Unassigned'}</div>
                    </div>
                    <div className="detail">
                      <div className="k">Status</div>
                      <div className="v">
                        <StatusBadge status={lead.status} />
                      </div>
                    </div>
                    <div className="detail">
                      <div className="k">Source</div>
                      <div className="v">
                        <SourceTag source={lead.source} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {lead.message && (
                <div className="card card-pad">
                  <div className="section-label">Message from lead</div>
                  <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--ink-2)' }}>
                    “{lead.message}”
                  </div>
                </div>
              )}

              <div className="card card-pad">
                <div className="section-label">Attribution</div>
                <div className="detail-grid">
                  <div className="detail">
                    <div className="k">Campaign</div>
                    <div className="v">{lead.campaign?.name || '—'}</div>
                  </div>
                  <div className="detail">
                    <div className="k">Ad / variant</div>
                    <div className="v">{lead.campaign?.content || '—'}</div>
                  </div>
                  <div className="detail">
                    <div className="k">Medium</div>
                    <div className="v">{lead.campaign?.medium || '—'}</div>
                  </div>
                  <div className="detail">
                    <div className="k">Form</div>
                    <div className="v">/f/{lead.formSlug}</div>
                  </div>
                  <div className="detail">
                    <div className="k">Click ID</div>
                    <div className="v" style={{ fontSize: 11.5 }}>
                      {lead.campaign?.clickId
                        ? `${lead.campaign.clickIdType || 'id'}: ${lead.campaign.clickId.slice(0, 24)}…`
                        : '—'}
                    </div>
                  </div>
                  <div className="detail">
                    <div className="k">Captured</div>
                    <div className="v">{formatDate(lead.createdAt)}</div>
                  </div>
                </div>
                {lead.pageUrl && (
                  <div style={{ marginTop: 10 }}>
                    <div className="k" style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>
                      Landing page
                    </div>
                    <div style={{ fontSize: 11.5, wordBreak: 'break-all', color: 'var(--muted)' }}>
                      {lead.pageUrl}
                    </div>
                  </div>
                )}
              </div>

              <div className="card card-pad">
                <div className="section-label">Notes ({lead.notes?.length || 0})</div>
                <form onSubmit={addNote} style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
                  <textarea
                    className="textarea"
                    placeholder="Log a call, add context, next steps…"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    style={{ minHeight: 64 }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="btn btn-sm btn-primary" disabled={!note.trim() || saving}>
                      Add note
                    </button>
                  </div>
                </form>
                {(lead.notes || []).length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>No notes yet.</div>
                ) : (
                  lead.notes.map((n) => (
                    <div className="note" key={n._id}>
                      {n.text}
                      <div className="nmeta">
                        <span>{n.author}</span>·<span>{formatDate(n.createdAt)}</span>
                        <button
                          className="icon-btn danger"
                          style={{ marginLeft: 'auto', width: 20, height: 20 }}
                          onClick={() => deleteNote(n._id)}
                          title="Delete note"
                        >
                          <Icon name="trash" size={11} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="card card-pad">
                <div className="section-label">Activity</div>
                <div className="timeline">
                  {(lead.events || [])
                    .slice()
                    .reverse()
                    .map((ev) => (
                      <div className="tl-item" key={ev._id || `${ev.message}-${ev.createdAt}`}>
                        {ev.message}
                        <div className="time">
                          {ev.author} · {formatDate(ev.createdAt)}
                        </div>
                      </div>
                    ))}
                  {(lead.events || []).length === 0 && (
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>No activity recorded.</div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
