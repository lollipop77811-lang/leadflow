import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { isEmail } from '../lib/format';
import { sourceMeta } from '../lib/meta';
import Icon from '../components/Icon';

const PARAM_MAP = {
  utm_source: 'source',
  utm_medium: 'medium',
  utm_campaign: 'campaign',
  utm_content: 'content',
  utm_term: 'term',
  source: 'source',
  src: 'source',
};

const CLICK_IDS = ['fbclid', 'gclid', 'ttclid', 'li_fat_id', 'msclkid'];
const STORAGE_KEY = 'leadflow.attribution';

function readAttribution(search) {
  const params = new URLSearchParams(search);
  const campaign = { source: '', medium: '', name: '', content: '', term: '', clickId: '', clickIdType: '' };

  Object.entries(PARAM_MAP).forEach(([param, field]) => {
    const value = params.get(param);
    if (!value) return;
    if (field === 'source' && !campaign.source) campaign.source = value;
    else if (field === 'campaign' && !campaign.name) campaign.name = value;
    else if (field === 'medium' && !campaign.medium) campaign.medium = value;
    else if (field === 'content' && !campaign.content) campaign.content = value;
    else if (field === 'term' && !campaign.term) campaign.term = value;
  });

  for (const id of CLICK_IDS) {
    const v = params.get(id);
    if (v) {
      campaign.clickId = v;
      campaign.clickIdType = id;
      break;
    }
  }

  // Fall back to a saved attribution for this session (e.g. after a page reload).
  if (!campaign.source && !campaign.name) {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
      if (saved) return saved;
    } catch {
      /* ignore */
    }
  }

  return { campaign, referrer: document.referrer, pageUrl: window.location.href };
}

function detectLabel(campaign, referrer) {
  const raw = (campaign.source || '').toLowerCase();
  if (raw) {
    const key = raw.includes('insta') || raw === 'ig' ? 'instagram'
      : raw.includes('fb') || raw.includes('meta') || raw.includes('facebook') ? 'facebook'
      : raw.includes('goog') || raw.includes('adwords') ? 'google'
      : raw.includes('linked') ? 'linkedin'
      : raw.includes('you') ? 'youtube'
      : raw.includes('whats') || raw === 'wa' ? 'whatsapp'
      : raw;
    return sourceMeta(key);
  }
  const r = String(referrer || '').toLowerCase();
  if (r.includes('instagram')) return sourceMeta('instagram');
  if (r.includes('facebook')) return sourceMeta('facebook');
  if (r.includes('google')) return sourceMeta('google');
  if (r.includes('linkedin')) return sourceMeta('linkedin');
  return null;
}

export default function PublicForm() {
  const { slug = 'main' } = useParams();
  const [searchParams] = useSearchParams();
  const [attr, setAttr] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', message: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    const next = readAttribution(window.location.search);
    setAttr(next);
    if (next?.campaign?.source || next?.campaign?.name) {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
    }
  }, []);

  const platform = useMemo(
    () => detectLabel(attr?.campaign || {}, attr?.referrer),
    [attr, searchParams]
  );

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = 'Please tell us your name';
    if (!isEmail(form.email)) next.email = 'Enter a valid email address';
    if (form.phone && form.phone.replace(/\D/g, '').length < 7) next.phone = 'Enter a valid phone number';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;
    setSubmitting(true);
    try {
      await api('/leads/public', {
        method: 'POST',
        auth: false,
        body: {
          ...form,
          formSlug: slug,
          campaign: attr?.campaign || {},
          pageUrl: window.location.href,
          referrer: document.referrer || attr?.referrer || '',
        },
      });
      setDone(true);
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      setErrors(err.errors || {});
      setServerError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="public-page">
      <div className="public-hero">
        <div className="brand" style={{ padding: 0 }}>
          <div className="brand-mark">L</div>
          <div>
            <div className="brand-name">LeadFlow</div>
            <div className="brand-sub" style={{ color: '#8e9db8' }}>
              {slug === 'main' ? 'Lead capture' : slug}
            </div>
          </div>
        </div>

        <div>
          <h1>Let’s talk about what you need.</h1>
          <p>
            Tell us a little about yourself and our team will get back within one business day. No spam, no
            long forms — just a quick conversation.
          </p>
          <div className="hero-points">
            {[
              'A specialist replies within 24 hours',
              'Free consultation, no obligation',
              'Your details stay private',
            ].map((t) => (
              <div className="hero-point" key={t}>
                <span className="tick">
                  <Icon name="check" size={11} stroke={2.6} />
                </span>
                {t}
              </div>
            ))}
          </div>
        </div>

        <div className="hero-badges">
          <span className="hero-badge">Trusted by 2,000+ businesses</span>
          <span className="hero-badge">★★★★★ 4.9 rating</span>
        </div>
      </div>

      <div className="public-main">
        <div className="public-card">
          {done ? (
            <div className="success-state">
              <div className="success-check">✓</div>
              <h3>Thanks, {form.name.split(' ')[0]}!</h3>
              <p>
                Your details are in. Someone from our team will reach out to{' '}
                <b>{form.email}</b> shortly.
              </p>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button
                  className="btn"
                  onClick={() => {
                    setDone(false);
                    setForm({ name: '', email: '', phone: '', company: '', message: '' });
                  }}
                >
                  Submit another response
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="public-card-head">
                <h2>Request a callback</h2>
                <p>Fields marked * are required.</p>
              </div>
              <div className="public-card-body">
                {platform && (
                  <div className="attr-chip">
                    <span
                      className="src-dot"
                      style={{ width: 15, height: 15, borderRadius: 4, fontSize: 8.5, background: platform.color }}
                    >
                      {platform.letter}
                    </span>
                    You came from {platform.label}
                    {attr?.campaign?.name ? ` · ${attr.campaign.name}` : ''}
                  </div>
                )}

                {serverError && (
                  <div className="alert alert-error" style={{ marginBottom: 13 }}>
                    <Icon name="close" size={14} style={{ marginTop: 2 }} />
                    <span>{serverError}</span>
                  </div>
                )}

                <form onSubmit={submit} className="form-grid">
                  <div className="field">
                    <label>Full name *</label>
                    <input
                      className="input"
                      value={form.name}
                      onChange={set('name')}
                      placeholder="Aarav Sharma"
                      autoComplete="name"
                    />
                    {errors.name && <span className="error-text">{errors.name}</span>}
                  </div>

                  <div className="field">
                    <label>Email address *</label>
                    <input
                      className="input"
                      type="email"
                      value={form.email}
                      onChange={set('email')}
                      placeholder="you@company.com"
                      autoComplete="email"
                    />
                    {errors.email && <span className="error-text">{errors.email}</span>}
                  </div>

                  <div className="grid-2" style={{ display: 'grid', gap: 12 }}>
                    <div className="field">
                      <label>Phone</label>
                      <input
                        className="input"
                        value={form.phone}
                        onChange={set('phone')}
                        placeholder="+91 98765 43210"
                        autoComplete="tel"
                      />
                      {errors.phone && <span className="error-text">{errors.phone}</span>}
                    </div>
                    <div className="field">
                      <label>Company</label>
                      <input
                        className="input"
                        value={form.company}
                        onChange={set('company')}
                        placeholder="Company name"
                        autoComplete="organization"
                      />
                    </div>
                  </div>

                  <div className="field">
                    <label>How can we help?</label>
                    <textarea
                      className="textarea"
                      value={form.message}
                      onChange={set('message')}
                      placeholder="Tell us what you're looking for…"
                    />
                  </div>

                  <button className="btn btn-primary btn-block" disabled={submitting} type="submit">
                    {submitting ? 'Submitting…' : 'Submit my details'}
                    {!submitting && <Icon name="arrowUpRight" size={14} />}
                  </button>
                  <p style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', lineHeight: 1.6 }}>
                    By submitting you agree to be contacted about your enquiry. We never share your data.
                  </p>
                </form>
              </div>
            </>
          )}
        </div>

        <a
          href="/login"
          style={{ marginTop: 16, fontSize: 11.5, color: 'var(--muted)', display: 'inline-flex', gap: 5, alignItems: 'center' }}
        >
          <Icon name="external" size={11} /> Admin dashboard
        </a>
      </div>
    </div>
  );
}
