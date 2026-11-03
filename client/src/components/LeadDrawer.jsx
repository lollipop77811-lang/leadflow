import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { currency, dueLabel, formatDate, initials, num, relativeTime, toDateInput } from '../lib/format';
import { filesToDataUrls } from '../lib/image';
import {
  categoryDef,
  DEFAULT_SCRAP_RATE,
  DOCUMENTS,
  FUELS,
  CONDITIONS,
  LOST_REASONS,
  RC_STATUSES,
  SLOTS,
  STATUSES,
  WA_TEMPLATES,
  waLink,
} from '../lib/meta';
import { useToast } from '../lib/toast';
import Icon from './Icon';
import { Chip, DocProgress, StatusBadge } from './Badges';

function Card({ title, action, children, muted }) {
  return (
    <div className="card card-pad" style={muted ? { background: 'var(--panel-2)' } : undefined}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div className="section-label" style={{ margin: 0 }}>
          {title}
        </div>
        <div style={{ marginLeft: 'auto' }}>{action}</div>
      </div>
      {children}
    </div>
  );
}

function KV({ k, v }) {
  return (
    <div className="detail">
      <div className="k">{k}</div>
      <div className="v">{v || '—'}</div>
    </div>
  );
}

export default function LeadDrawer({ leadId, onClose, onChanged, onDeleted }) {
  const { user } = useAuth();
  const toast = useToast();
  const isAdmin = user?.role === 'admin';

  const [lead, setLead] = useState(null);
  const [duplicates, setDuplicates] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState('');

  // local editing buffers
  const [quote, setQuote] = useState({ amount: '', ratePerKg: DEFAULT_SCRAP_RATE, weightKg: '' });
  const [pickup, setPickup] = useState({ scheduledDate: '', slot: '', vendor: '', driver: '' });
  const [followUp, setFollowUp] = useState('');
  const [payout, setPayout] = useState({ amount: '', mode: '', reference: '' });
  const [cd, setCd] = useState({ cdNumber: '', cdDate: '', rtoSubmittedAt: '', rtoApprovedAt: '' });

  const load = useCallback(async () => {
    if (!leadId) return;
    setLoading(true);
    try {
      const { lead: l, duplicates: d } = await api(`/leads/${leadId}`);
      setLead(l);
      setDuplicates(d || []);
      setQuote({
        amount: l.quote?.amount || '',
        ratePerKg: l.quote?.ratePerKg || DEFAULT_SCRAP_RATE,
        weightKg: l.quote?.weightKg || l.vehicle?.weightKg || '',
      });
      setPickup({
        scheduledDate: toDateInput(l.pickup?.scheduledDate),
        slot: l.pickup?.slot || '',
        vendor: l.pickup?.vendor || '',
        driver: l.pickup?.driver || '',
      });
      setPayout({
        amount: l.payout?.amount || l.quote?.amount || '',
        mode: l.payout?.mode || '',
        reference: l.payout?.reference || '',
      });
      setCd({
        cdNumber: l.cd?.cdNumber || '',
        cdDate: toDateInput(l.cd?.cdDate),
        rtoSubmittedAt: toDateInput(l.cd?.rtoSubmittedAt),
        rtoApprovedAt: toDateInput(l.cd?.rtoApprovedAt),
      });
      setFollowUp(toDateInput(l.followUpAt));
    } catch (err) {
      toast.error(err.message);
      onClose?.();
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    setLead(null);
    load();
  }, [leadId, load]);

  useEffect(() => {
    if (!isAdmin) return;
    api('/users')
      .then((d) => setUsers(d.users || []))
      .catch(() => {});
  }, [isAdmin]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const patch = async (payload, message) => {
    setSaving(true);
    try {
      const { lead: updated } = await api(`/leads/${leadId}`, { method: 'PATCH', body: payload });
      setLead(updated);
      onChanged?.(updated);
      if (message) toast.success(message);
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
      const { lead: updated } = await api(`/leads/${leadId}/notes`, { method: 'POST', body: { text } });
      setLead(updated);
      setNote('');
      onChanged?.(updated);
      toast.success('Note added');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const addPhotos = async (files) => {
    const photos = await filesToDataUrls(files, 3);
    if (!photos.length) return;
    setSaving(true);
    try {
      const { lead: updated } = await api(`/leads/${leadId}/photos`, {
        method: 'POST',
        body: { photos },
      });
      setLead(updated);
      toast.success('Photos added');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const removePhoto = async (index) => {
    try {
      const { lead: updated } = await api(`/leads/${leadId}/photos/${index}`, { method: 'DELETE' });
      setLead(updated);
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
    } catch (err) {
      toast.error(err.message);
    }
  };

  const waHref = useMemo(() => {
    if (!lead) return '#';
    return waLink(lead.phone, WA_TEMPLATES.intro({ ...lead, brand: 'LeadFlow Autoscrap' }));
  }, [lead]);

  const computedQuote = useMemo(() => {
    const kg = Number(quote.weightKg) || Number(lead?.vehicle?.weightKg) || categoryDef(lead?.vehicle?.category).weight;
    const rate = Number(quote.ratePerKg) || DEFAULT_SCRAP_RATE;
    return Math.round(kg * rate);
  }, [quote, lead]);

  if (loading || !lead) {
    return (
      <>
        <div className="drawer-backdrop" onClick={onClose} />
        <aside className="drawer">
          <div style={{ padding: 20 }}>
            <div className="skeleton" style={{ height: 40, width: '65%' }} />
            <div className="skeleton" style={{ height: 14, width: '40%', marginTop: 10 }} />
            <div className="skeleton" style={{ height: 120, marginTop: 22 }} />
            <div className="skeleton" style={{ height: 160, marginTop: 14 }} />
          </div>
        </aside>
      </>
    );
  }

  const v = lead.vehicle || {};
  const docsDone = DOCUMENTS.filter((d) => lead.documents?.[d.id]).length;

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true">
        <div className="drawer-head">
          <div className="avatar" style={{ width: 40, height: 40, fontSize: 14 }}>
            {initials(lead.name)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="drawer-title">{lead.name}</div>
            <div className="drawer-sub">
              {[v.make, v.model, v.year].filter(Boolean).join(' ')} · {relativeTime(lead.createdAt)}
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="drawer-body">
          {/* Quick actions */}
          <div className="action-bar">
            <a className="btn btn-sm btn-wa" href={waHref} target="_blank" rel="noreferrer">
              <Icon name="whatsapp" size={13} /> WhatsApp
            </a>
            <a className="btn btn-sm" href={`tel:${lead.phone.replace(/[^\d+]/g, '')}`}>
              <Icon name="phone" size={13} /> Call
            </a>
            <select
              className="select"
              style={{ width: 150, marginLeft: 'auto' }}
              value={lead.status}
              disabled={saving}
              onChange={(e) => {
                if (e.target.value === 'lost') {
                  const reason = window.prompt(
                    `Why is ${lead.name} lost?\n\n${LOST_REASONS.map((r, i) => `${i + 1}. ${r.label}`).join('\n')}\n\nEnter a number:`
                  );
                  const picked = LOST_REASONS[Number(reason) - 1];
                  if (!picked) return;
                  patch({ status: 'lost', lostReason: picked.id }, 'Marked as lost');
                  return;
                }
                patch({ status: e.target.value }, 'Status updated');
              }}
            >
              {STATUSES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            <StatusBadge status={lead.status} />
            {lead.lostReason && <Chip color="#b91c1c">{LOST_REASONS.find((r) => r.id === lead.lostReason)?.label}</Chip>}
            {lead.duplicateCount > 0 && <Chip color="#b45309">↺ {lead.duplicateCount + 1} submissions</Chip>}
            {lead.outOfArea && <Chip color="#b91c1c">Outside service area</Chip>}
            {lead.tags?.map((t) => (
              <Chip key={t} color="#475569">
                {t}
              </Chip>
            ))}
          </div>

          {/* Contact + owner */}
          <Card
            title="Contact & owner"
            action={
              isAdmin && (
                <select
                  className="select"
                  style={{ width: 150, padding: '5px 8px', fontSize: 12 }}
                  value={lead.assignedTo || ''}
                  onChange={(e) => {
                    const selected = users.find((u) => u.id === e.target.value);
                    patch(
                      { assignedTo: e.target.value || null, assignedToName: selected?.name || 'Unassigned' },
                      'Lead assigned'
                    );
                  }}
                >
                  <option value="">Unassigned</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              )
            }
          >
            <div className="detail-grid">
              <KV
                k="Phone"
                v={
                  <a href={`tel:${lead.phone}`} style={{ color: 'var(--brand)' }}>
                    {lead.phone}
                  </a>
                }
              />
              <KV k="Email" v={lead.email || '—'} />
              <KV k="Assigned to" v={lead.assignedToName} />
              <KV k="Source" v={lead.source} />
              <KV k="Campaign" v={lead.campaign?.name || '—'} />
              <KV k="Form" v={`/f/${lead.formSlug}`} />
            </div>
            <div className="inline-field">
              <label>Next follow-up</label>
              <input
                className="input"
                type="date"
                value={followUp}
                onChange={(e) => setFollowUp(e.target.value)}
              />
              <button
                className="btn btn-sm"
                disabled={saving}
                onClick={() => patch({ followUpAt: followUp || null }, 'Follow-up updated')}
              >
                Save
              </button>
              {lead.followUpAt && (
                <span className={`follow-hint ${new Date(lead.followUpAt) < new Date() ? 'overdue' : ''}`}>
                  {dueLabel(lead.followUpAt)}
                </span>
              )}
            </div>
          </Card>

          {/* Vehicle */}
          <Card title="Vehicle">
            <div className="detail-grid">
              <KV k="Make & model" v={[v.make, v.model].filter(Boolean).join(' ') || '—'} />
              <KV k="Year" v={v.year || '—'} />
              <KV k="Fuel" v={FUELS.find((f) => f.id === v.fuel)?.label} />
              <KV k="Condition" v={CONDITIONS.find((c) => c.id === v.condition)?.label} />
              <KV k="RC status" v={RC_STATUSES.find((r) => r.id === v.rcStatus)?.label} />
              <KV k="Registration" v={v.registrationNumber || '—'} />
              <KV k="RTO / state" v={[v.rto, v.state].filter(Boolean).join(', ')} />
              <KV k="Est. weight" v={`${num(v.weightKg)} kg`} />
            </div>

            <div className="photo-row">
              {(lead.photos || []).map((src, i) => (
                <div className="photo-thumb" key={i}>
                  <img src={src} alt={`Vehicle photo ${i + 1}`} />
                  <button className="photo-del" onClick={() => removePhoto(i)} title="Remove photo">
                    <Icon name="close" size={10} />
                  </button>
                </div>
              ))}
              <label className="photo-add">
                <Icon name="plus" size={15} />
                <span>Add photo</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={(e) => addPhotos(e.target.files)}
                />
              </label>
            </div>
          </Card>

          {/* Quote */}
          <Card title="Quote">
            <div className="quote-grid">
              <div className="field">
                <label>Weight (kg)</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={quote.weightKg}
                  onChange={(e) => setQuote({ ...quote, weightKg: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Rate (₹/kg)</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={quote.ratePerKg}
                  onChange={(e) => setQuote({ ...quote, ratePerKg: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Quote (₹)</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={quote.amount}
                  placeholder={String(computedQuote)}
                  onChange={(e) => setQuote({ ...quote, amount: e.target.value })}
                />
              </div>
            </div>

            <div className="quote-calc">
              <span>
                Calculator: <b>{num(Number(quote.weightKg) || v.weightKg)} kg</b> × ₹
                {quote.ratePerKg || DEFAULT_SCRAP_RATE} = <b>{currency(computedQuote)}</b>
              </span>
              <button
                className="btn btn-sm"
                onClick={() =>
                  setQuote({ ...quote, amount: computedQuote, weightKg: quote.weightKg || v.weightKg })
                }
              >
                Use ₹{num(computedQuote)}
              </button>
            </div>

            {lead.quote?.expectedAmount > 0 && (
              <div className="hint-row">
                Customer expects <b>{currency(lead.quote.expectedAmount)}</b>
                {lead.quote?.amount > 0 && (
                  <>
                    {' · '}
                    {lead.quote.amount >= lead.quote.expectedAmount ? (
                      <span style={{ color: 'var(--green)' }}>quote meets expectation</span>
                    ) : (
                      <span style={{ color: 'var(--red)' }}>
                        {Math.round(((lead.quote.expectedAmount - lead.quote.amount) / lead.quote.expectedAmount) * 100)}%
                        below expectation
                      </span>
                    )}
                  </>
                )}
              </div>
            )}

            <div className="quote-actions">
              <button
                className="btn btn-sm btn-primary"
                disabled={saving}
                onClick={() =>
                  patch(
                    {
                      quote: {
                        amount: Number(quote.amount) || computedQuote,
                        ratePerKg: Number(quote.ratePerKg) || DEFAULT_SCRAP_RATE,
                        weightKg: Number(quote.weightKg) || v.weightKg,
                      },
                      vehicle: { weightKg: Number(quote.weightKg) || v.weightKg },
                    },
                    'Quote saved'
                  )
                }
              >
                Save quote
              </button>
              <a
                className="btn btn-sm btn-wa"
                href={waLink(lead.phone, WA_TEMPLATES.quote(lead))}
                target="_blank"
                rel="noreferrer"
              >
                <Icon name="whatsapp" size={12} /> Send quote
              </a>
              {lead.quote?.sentAt && (
                <span className="hint">sent {formatDate(lead.quote.sentAt, true)}</span>
              )}
            </div>
          </Card>

          {/* Pickup */}
          <Card title="Pickup">
            <div className="detail-grid">
              <KV k="Address" v={lead.pickup?.address || '—'} />
              <KV k="City / pincode" v={`${lead.pickup?.city || '—'} ${lead.pickup?.pincode || ''}`} />
              <KV k="Towing" v={lead.pickup?.needsTowing ? 'Needs towing' : 'Customer will drive in'} />
              <KV k="Received" v={lead.pickup?.completedAt ? formatDate(lead.pickup.completedAt) : '—'} />
            </div>
            <div className="pickup-grid">
              <div className="field">
                <label>Pickup date</label>
                <input
                  className="input"
                  type="date"
                  value={pickup.scheduledDate}
                  onChange={(e) => setPickup({ ...pickup, scheduledDate: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Slot</label>
                <select
                  className="select"
                  value={pickup.slot}
                  onChange={(e) => setPickup({ ...pickup, slot: e.target.value })}
                >
                  <option value="">Any time</option>
                  {SLOTS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Towing vendor</label>
                <input
                  className="input"
                  value={pickup.vendor}
                  onChange={(e) => setPickup({ ...pickup, vendor: e.target.value })}
                  placeholder="Yadav Towing"
                />
              </div>
              <div className="field">
                <label>Driver</label>
                <input
                  className="input"
                  value={pickup.driver}
                  onChange={(e) => setPickup({ ...pickup, driver: e.target.value })}
                  placeholder="Suresh"
                />
              </div>
            </div>
            <div className="quote-actions">
              <button
                className="btn btn-sm btn-primary"
                disabled={saving}
                onClick={() => patch({ pickup }, 'Pickup saved')}
              >
                Save pickup
              </button>
              <a
                className="btn btn-sm btn-wa"
                href={waLink(lead.phone, WA_TEMPLATES.pickup(lead))}
                target="_blank"
                rel="noreferrer"
              >
                <Icon name="whatsapp" size={12} /> Confirm on WhatsApp
              </a>
              {lead.status === 'pickup_scheduled' && (
                <button
                  className="btn btn-sm"
                  disabled={saving}
                  onClick={() => patch({ status: 'vehicle_received' }, 'Vehicle received')}
                >
                  Mark received
                </button>
              )}
            </div>
          </Card>

          {/* Documents */}
          <Card
            title={`Documents · ${docsDone}/${DOCUMENTS.length}`}
            action={<DocProgress documents={lead.documents} />}
          >
            <div className="doc-grid">
              {DOCUMENTS.map((doc) => {
                const checked = Boolean(lead.documents?.[doc.id]);
                return (
                  <label key={doc.id} className={`doc-item ${checked ? 'checked' : ''}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={saving}
                      onChange={() =>
                        patch({ documents: { [doc.id]: !checked } }, `${doc.label} updated`)
                      }
                    />
                    <span>{doc.label}</span>
                  </label>
                );
              })}
            </div>
            <div className="quote-actions">
              <a
                className="btn btn-sm btn-wa"
                href={waLink(lead.phone, WA_TEMPLATES.documents(lead))}
                target="_blank"
                rel="noreferrer"
              >
                <Icon name="whatsapp" size={12} /> Request pending documents
              </a>
            </div>
          </Card>

          {/* CD tracking */}
          <Card title="Deregistration & Certificate of Deposit">
            <div className="pickup-grid">
              <div className="field">
                <label>RTO submitted</label>
                <input
                  className="input"
                  type="date"
                  value={cd.rtoSubmittedAt}
                  onChange={(e) => setCd({ ...cd, rtoSubmittedAt: e.target.value })}
                />
              </div>
              <div className="field">
                <label>RTO approved</label>
                <input
                  className="input"
                  type="date"
                  value={cd.rtoApprovedAt}
                  onChange={(e) => setCd({ ...cd, rtoApprovedAt: e.target.value })}
                />
              </div>
              <div className="field">
                <label>CD number</label>
                <input
                  className="input"
                  value={cd.cdNumber}
                  placeholder="CD/UP/2024/00000"
                  onChange={(e) => setCd({ ...cd, cdNumber: e.target.value })}
                />
              </div>
              <div className="field">
                <label>CD date</label>
                <input
                  className="input"
                  type="date"
                  value={cd.cdDate}
                  onChange={(e) => setCd({ ...cd, cdDate: e.target.value })}
                />
              </div>
            </div>
            <div className="quote-actions">
              <button className="btn btn-sm btn-primary" disabled={saving} onClick={() => patch({ cd }, 'CD details saved')}>
                Save CD details
              </button>
              {cd.cdNumber && (
                <a
                  className="btn btn-sm btn-wa"
                  href={waLink(lead.phone, WA_TEMPLATES.cd({ ...lead, cd: { ...lead.cd, cdNumber: cd.cdNumber } }))}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Icon name="whatsapp" size={12} /> Send CD to customer
                </a>
              )}
            </div>
          </Card>

          {/* Payout */}
          <Card title="Payout">
            <div className="quote-grid">
              <div className="field">
                <label>Final amount (₹)</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={payout.amount}
                  onChange={(e) => setPayout({ ...payout, amount: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Mode</label>
                <select
                  className="select"
                  value={payout.mode}
                  onChange={(e) => setPayout({ ...payout, mode: e.target.value })}
                >
                  <option value="">Not paid</option>
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="bank">Bank transfer</option>
                </select>
              </div>
              <div className="field">
                <label>Reference</label>
                <input
                  className="input"
                  value={payout.reference}
                  onChange={(e) => setPayout({ ...payout, reference: e.target.value })}
                  placeholder="UTR / receipt no."
                />
              </div>
            </div>
            <div className="quote-actions">
              <button
                className="btn btn-sm btn-primary"
                disabled={saving}
                onClick={() =>
                  patch(
                    {
                      payout: {
                        amount: Number(payout.amount) || 0,
                        mode: payout.mode,
                        reference: payout.reference,
                      },
                    },
                    'Payout saved'
                  )
                }
              >
                Save payout
              </button>
              {!lead.payout?.paidAt && (
                <button
                  className="btn btn-sm"
                  disabled={saving}
                  onClick={() =>
                    patch(
                      {
                        payout: {
                          amount: Number(payout.amount) || lead.quote?.amount || 0,
                          mode: payout.mode || 'cash',
                          paidAt: new Date().toISOString(),
                        },
                        status: 'paid',
                      },
                      'Marked as paid'
                    )
                  }
                >
                  Mark paid
                </button>
              )}
              {lead.payout?.paidAt && (
                <span className="hint">
                  Paid {currency(lead.payout.amount)} on {formatDate(lead.payout.paidAt)}
                </span>
              )}
            </div>
          </Card>

          {duplicates.length > 0 && (
            <Card title="Other enquiries from this number" muted>
              {duplicates.map((d) => (
                <div key={d._id} className="dup-row">
                  <span className="avatar-sq" style={{ width: 26, height: 26, fontSize: 10 }}>
                    {initials(d.name)}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600 }}>{d.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                      {STATUSES.find((s) => s.id === d.status)?.label} · {relativeTime(d.createdAt)}
                    </div>
                  </div>
                  <a className="btn btn-sm btn-ghost" href={`?lead=${d._id}`} onClick={(e) => e.preventDefault()}>
                    {d.quote?.amount ? currency(d.quote.amount) : '—'}
                  </a>
                </div>
              ))}
            </Card>
          )}

          {/* Notes */}
          <Card title={`Notes (${lead.notes?.length || 0})`}>
            <form onSubmit={addNote} style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
              <textarea
                className="textarea"
                placeholder="Log a call outcome, price agreed, next step…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                style={{ minHeight: 62 }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-sm btn-primary" disabled={!note.trim() || saving}>
                  Add note
                </button>
              </div>
            </form>
            {(lead.notes || []).length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>No notes yet.</div>
            )}
            {(lead.notes || []).map((n) => (
              <div className="note" key={n._id}>
                {n.text}
                <div className="nmeta">
                  <span>{n.author}</span>·<span>{formatDate(n.createdAt, true)}</span>
                </div>
              </div>
            ))}
          </Card>

          <Card title="Activity" muted>
            <div className="timeline">
              {(lead.events || [])
                .slice()
                .reverse()
                .map((ev) => (
                  <div className="tl-item" key={ev._id || `${ev.message}-${ev.createdAt}`}>
                    {ev.message}
                    <div className="time">
                      {ev.author} · {formatDate(ev.createdAt, true)}
                    </div>
                  </div>
                ))}
            </div>
          </Card>

          {isAdmin && (
            <button className="btn btn-danger" onClick={removeLead}>
              <Icon name="trash" size={13} /> Delete lead
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
