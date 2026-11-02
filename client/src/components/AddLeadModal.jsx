import { useState } from 'react';
import { api } from '../lib/api';
import { isEmail } from '../lib/format';
import { SOURCES, STATUSES } from '../lib/meta';
import { useToast } from '../lib/toast';
import Modal from './Modal';

const EMPTY = {
  name: '',
  email: '',
  phone: '',
  company: '',
  source: 'instagram',
  status: 'new',
  value: '',
  message: '',
};

export default function AddLeadModal({ onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = 'Name is required';
    if (!isEmail(form.email)) next.email = 'Enter a valid email';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const { lead } = await api('/leads', {
        method: 'POST',
        body: { ...form, value: Number(form.value) || 0 },
      });
      toast.success('Lead added');
      onCreated?.(lead);
      onClose();
    } catch (err) {
      setErrors(err.errors || {});
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Add a lead"
      subtitle="Manually add someone who reached out offline — a call or a direct message."
      onClose={onClose}
      width={560}
      footer={
        <>
          <button className="btn" onClick={onClose} type="button">
            Cancel
          </button>
          <button className="btn btn-primary" form="add-lead-form" disabled={saving}>
            {saving ? 'Saving…' : 'Create lead'}
          </button>
        </>
      }
    >
      <form id="add-lead-form" onSubmit={submit} className="form-grid">
        <div className="grid-2" style={{ display: 'grid', gap: 11 }}>
          <div className="field">
            <label>Full name *</label>
            <input className="input" value={form.name} onChange={set('name')} placeholder="Aarav Sharma" />
            {errors.name && <span className="error-text">{errors.name}</span>}
          </div>
          <div className="field">
            <label>Email *</label>
            <input className="input" value={form.email} onChange={set('email')} placeholder="aarav@company.com" />
            {errors.email && <span className="error-text">{errors.email}</span>}
          </div>
          <div className="field">
            <label>Phone</label>
            <input className="input" value={form.phone} onChange={set('phone')} placeholder="+91 98765 43210" />
          </div>
          <div className="field">
            <label>Company</label>
            <input className="input" value={form.company} onChange={set('company')} placeholder="Company name" />
          </div>
          <div className="field">
            <label>Source</label>
            <select className="select" value={form.source} onChange={set('source')}>
              {SOURCES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Status</label>
            <select className="select" value={form.status} onChange={set('status')}>
              {STATUSES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="field">
          <label>Estimated deal value (₹)</label>
          <input className="input" type="number" min="0" value={form.value} onChange={set('value')} placeholder="25000" />
        </div>
        <div className="field">
          <label>Notes / message</label>
          <textarea className="textarea" value={form.message} onChange={set('message')} placeholder="What do they need?" />
        </div>
      </form>
    </Modal>
  );
}
