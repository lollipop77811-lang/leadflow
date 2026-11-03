import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { isPhone } from '../lib/format';
import { CATEGORIES, CONDITIONS, FUELS, RC_STATUSES, SOURCES, STATUSES, categoryDef } from '../lib/meta';
import { useToast } from '../lib/toast';
import Modal from './Modal';

const EMPTY = {
  name: '',
  phone: '',
  email: '',
  source: 'walkin',
  status: 'new',
  make: '',
  model: '',
  year: '',
  fuel: 'petrol',
  condition: 'running',
  rcStatus: 'original',
  registrationNumber: '',
  category: 'hatchback',
  weightKg: '',
  pincode: '',
  city: '',
  address: '',
  quoteAmount: '',
  followUpAt: '',
  assignedTo: '',
};

export default function AddLeadModal({ onClose, onCreated }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ ...EMPTY, weightKg: categoryDef('hatchback').weight });
  const [users, setUsers] = useState([]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (user?.role !== 'admin') return;
    api('/users')
      .then((d) => setUsers(d.users || []))
      .catch(() => {});
  }, [user]);

  const set = (key) => (e) => {
    const value = e.target.value;
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (key === 'category') next.weightKg = categoryDef(value).weight;
      return next;
    });
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = 'Name is required';
    if (!isPhone(form.phone)) next.phone = 'Enter a valid 10-digit mobile number';
    if (!form.make.trim()) next.make = 'Car make is required';
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
        body: {
          name: form.name,
          phone: form.phone,
          email: form.email,
          source: form.source,
          status: form.status,
          quoteAmount: Number(form.quoteAmount) || 0,
          followUpAt: form.followUpAt || null,
          assignedTo: form.assignedTo || undefined,
          vehicle: {
            make: form.make,
            model: form.model,
            year: form.year,
            fuel: form.fuel,
            condition: form.condition,
            rcStatus: form.rcStatus,
            registrationNumber: form.registrationNumber,
            category: form.category,
            weightKg: Number(form.weightKg) || categoryDef(form.category).weight,
          },
          pickup: {
            pincode: form.pincode,
            city: form.city,
            address: form.address,
          },
        },
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
      subtitle="Walk-in, phone enquiry or dealer referral."
      onClose={onClose}
      width={620}
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
        <div className="section-label" style={{ marginBottom: -4 }}>
          Customer
        </div>
        <div className="grid-2" style={{ display: 'grid', gap: 11 }}>
          <div className="field">
            <label>Name *</label>
            <input className="input" value={form.name} onChange={set('name')} placeholder="Aarav Sharma" />
            {errors.name && <span className="error-text">{errors.name}</span>}
          </div>
          <div className="field">
            <label>Mobile number *</label>
            <input className="input" value={form.phone} onChange={set('phone')} placeholder="98110 24411" />
            {errors.phone && <span className="error-text">{errors.phone}</span>}
          </div>
          <div className="field">
            <label>Email (optional)</label>
            <input className="input" value={form.email} onChange={set('email')} placeholder="name@email.com" />
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
        </div>

        <div className="section-label" style={{ marginBottom: -4, marginTop: 4 }}>
          Vehicle
        </div>
        <div className="grid-2" style={{ display: 'grid', gap: 11 }}>
          <div className="field">
            <label>Make *</label>
            <input className="input" value={form.make} onChange={set('make')} placeholder="Maruti Suzuki" />
            {errors.make && <span className="error-text">{errors.make}</span>}
          </div>
          <div className="field">
            <label>Model</label>
            <input className="input" value={form.model} onChange={set('model')} placeholder="Swift" />
          </div>
          <div className="field">
            <label>Year</label>
            <input className="input" type="number" min="1950" max="2026" value={form.year} onChange={set('year')} placeholder="2011" />
          </div>
          <div className="field">
            <label>Category</label>
            <select className="select" value={form.category} onChange={set('category')}>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label} · ~{c.weight} kg
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Fuel</label>
            <select className="select" value={form.fuel} onChange={set('fuel')}>
              {FUELS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Condition</label>
            <select className="select" value={form.condition} onChange={set('condition')}>
              {CONDITIONS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>RC status</label>
            <select className="select" value={form.rcStatus} onChange={set('rcStatus')}>
              {RC_STATUSES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Registration no.</label>
            <input className="input" value={form.registrationNumber} onChange={set('registrationNumber')} placeholder="UP32AB1234" />
          </div>
          <div className="field">
            <label>Weight (kg)</label>
            <input className="input" type="number" min="0" value={form.weightKg} onChange={set('weightKg')} />
          </div>
          <div className="field">
            <label>Quote (₹)</label>
            <input className="input" type="number" min="0" value={form.quoteAmount} onChange={set('quoteAmount')} placeholder="optional" />
          </div>
        </div>

        <div className="section-label" style={{ marginBottom: -4, marginTop: 4 }}>
          Pickup & follow-up
        </div>
        <div className="grid-2" style={{ display: 'grid', gap: 11 }}>
          <div className="field">
            <label>Pincode</label>
            <input className="input" value={form.pincode} onChange={set('pincode')} placeholder="226001" />
          </div>
          <div className="field">
            <label>City</label>
            <input className="input" value={form.city} onChange={set('city')} placeholder="Lucknow" />
          </div>
        </div>
        <div className="field">
          <label>Address</label>
          <input className="input" value={form.address} onChange={set('address')} placeholder="Locality / landmark" />
        </div>
        <div className="grid-2" style={{ display: 'grid', gap: 11 }}>
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
          <div className="field">
            <label>Follow-up date</label>
            <input className="input" type="date" value={form.followUpAt} onChange={set('followUpAt')} />
          </div>
          {user?.role === 'admin' && (
            <div className="field">
              <label>Assign to</label>
              <select className="select" value={form.assignedTo} onChange={set('assignedTo')}>
                <option value="">Me ({user.name})</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}
