import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { isPhone, isPincode } from '../lib/format';
import { filesToDataUrls } from '../lib/image';
import { CATEGORIES, CONDITIONS, FUELS, RC_STATUSES, categoryDef, sourceMeta, waLink } from '../lib/meta';
import Icon from '../components/Icon';

const STORAGE_KEY = 'leadflow.attribution';
const PARAMS = {
  utm_source: 'source',
  utm_medium: 'medium',
  utm_campaign: 'campaign',
  utm_content: 'content',
  utm_term: 'term',
  source: 'source',
  src: 'source',
};
const CLICK_IDS = ['fbclid', 'gclid', 'ttclid', 'li_fat_id', 'msclkid'];

const COPY = {
  en: {
    heroTitle: 'Scrap your old car. Free pickup, best price.',
    heroSub:
      'Authorised vehicle scrapping facility. We handle the towing, the RTO paperwork and give you a Certificate of Deposit for your next car.',
    badge1: 'Free towing',
    badge2: 'Certificate of Deposit',
    badge3: 'RC cancelled at RTO',
    step1: 'Your car',
    step2: 'Your details',
    step3: 'Pickup',
    make: 'Car make',
    model: 'Model',
    year: 'Year of purchase',
    category: 'Vehicle type',
    fuel: 'Fuel type',
    condition: 'Condition',
    rc: 'RC status',
    regNo: 'Registration number (optional)',
    name: 'Full name',
    phone: 'Mobile number',
    email: 'Email (optional)',
    pincode: 'Pincode',
    city: 'City',
    address: 'Pickup address',
    towing: 'I need free towing',
    photos: 'Photos of the car (optional)',
    expected: 'How much are you expecting? (optional)',
    consent: 'I agree to be contacted on WhatsApp / phone about scrapping my vehicle.',
    next: 'Continue',
    back: 'Back',
    submit: 'Get my quote',
    submitting: 'Sending…',
    whatsappCta: 'Get a quote on WhatsApp',
    thanks: 'Thanks',
    thanksBody:
      'Your details are with our team. A scrap specialist will call you within 30 minutes (9am–7pm) with a price.',
    another: 'Submit another car',
    why: 'Why scrap with us',
    why1: 'Authorised RVSF with RTO deregistration',
    why2: 'Instant price, no bargaining',
    why3: 'Payment same day after pickup',
    areaWarn: 'We may not pick up from this pincode yet — we will confirm on call.',
    from: 'You came from',
  },
  hi: {
    heroTitle: 'पुरानी कार स्क्रैप करें। फ्री पिकअप, बेहतर दाम।',
    heroSub:
      'अधिकृत वाहन स्क्रैपिंग सेंटर। टोइंग से लेकर RTO कागज़ात तक हम संभालते हैं और आपको नई कार के लिए सर्टिफिकेट ऑफ डिपॉज़िट देते हैं।',
    badge1: 'फ्री टोइंग',
    badge2: 'सर्टिफिकेट ऑफ डिपॉज़िट',
    badge3: 'RTO में RC कैंसिल',
    step1: 'आपकी कार',
    step2: 'आपकी जानकारी',
    step3: 'पिकअप',
    make: 'कार की कंपनी',
    model: 'मॉडल',
    year: 'कार का साल',
    category: 'गाड़ी का टाइप',
    fuel: 'फ्यूल',
    condition: 'गाड़ी की हालत',
    rc: 'RC की स्थिति',
    regNo: 'रजिस्ट्रेशन नंबर (वैकल्पिक)',
    name: 'पूरा नाम',
    phone: 'मोबाइल नंबर',
    email: 'ईमेल (वैकल्पिक)',
    pincode: 'पिनकोड',
    city: 'शहर',
    address: 'पिकअप का पता',
    towing: 'मुझे फ्री टोइंग चाहिए',
    photos: 'कार की फोटो (वैकल्पिक)',
    expected: 'आप कितने पैसे चाहते हैं? (वैकल्पिक)',
    consent: 'मैं व्हाट्सएप / फोन पर संपर्क के लिए सहमत हूँ।',
    next: 'आगे बढ़ें',
    back: 'पीछे',
    submit: 'मेरा रेट जानें',
    submitting: 'भेज रहे हैं…',
    whatsappCta: 'व्हाट्सएप पर रेट लें',
    thanks: 'धन्यवाद',
    thanksBody:
      'आपकी जानकारी हमारी टीम के पास पहुँच गई है। हमारा स्पेशलिस्ट 30 मिनट में कॉल करके रेट बताएगा (सुबह 9 – शाम 7)।',
    another: 'दूसरी कार के लिए भरें',
    why: 'हमसे क्यों स्क्रैप करें',
    why1: 'अधिकृत RVSF, RTO से डी-रजिस्ट्रेशन',
    why2: 'तुरंत रेट, मोलभाव नहीं',
    why3: 'पिकअप के बाद उसी दिन पेमेंट',
    areaWarn: 'इस पिनकोड पर पिकअप उपलब्ध नहीं हो सकता — हम कॉल पर पुष्टि करेंगे।',
    from: 'आप यहाँ से आए',
  },
};

function readAttribution() {
  const params = new URLSearchParams(window.location.search);
  const campaign = { source: '', medium: '', name: '', content: '', term: '', clickId: '', clickIdType: '' };

  Object.entries(PARAMS).forEach(([param, field]) => {
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

  if (!campaign.source && !campaign.name) {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
      if (saved) return saved;
    } catch {
      /* ignore */
    }
  }
  return { campaign, referrer: document.referrer };
}

const detectKey = (campaign, referrer) => {
  const raw = (campaign?.source || '').toLowerCase();
  if (raw) {
    if (raw.includes('insta') || raw === 'ig') return 'instagram';
    if (raw.includes('fb') || raw.includes('meta') || raw.includes('facebook')) return 'facebook';
    if (raw.includes('goog') || raw.includes('adwords')) return 'google';
    if (raw.includes('whats') || raw === 'wa') return 'whatsapp';
    if (raw.includes('just')) return 'justdial';
    if (raw.includes('olx')) return 'olx';
    if (raw.includes('you')) return 'youtube';
    if (raw.includes('link')) return 'linkedin';
  }
  const r = String(referrer || '').toLowerCase();
  for (const key of ['instagram', 'facebook', 'google', 'linkedin', 'youtube', 'justdial', 'olx']) {
    if (r.includes(key)) return key;
  }
  return null;
};

export default function PublicForm() {
  const { slug = 'main' } = useParams();
  const [lang, setLang] = useState('en');
  const t = COPY[lang];

  const [attr, setAttr] = useState(null);
  const [config, setConfig] = useState({ brand: {}, serviceAreas: [] });
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState({});
  const [photos, setPhotos] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState('');

  const [form, setForm] = useState({
    make: '',
    model: '',
    year: '',
    category: 'hatchback',
    fuel: 'petrol',
    condition: 'running',
    rcStatus: 'original',
    registrationNumber: '',
    name: '',
    phone: '',
    email: '',
    pincode: '',
    city: '',
    address: '',
    needsTowing: true,
    expectedPrice: '',
    consent: true,
  });

  useEffect(() => {
    const next = readAttribution();
    setAttr(next);
    if (next?.campaign?.source || next?.campaign?.name) {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
    }
    api('/leads/public/config', { auth: false })
      .then((c) => setConfig(c))
      .catch(() => {});
  }, []);

  const platform = useMemo(() => {
    const key = detectKey(attr?.campaign, attr?.referrer);
    return key ? sourceMeta(key) : null;
  }, [attr]);

  const set = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (key === 'category') next.weightHint = categoryDef(value).weight;
      return next;
    });
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const notServiceable = useMemo(() => {
    const areas = config.serviceAreas || [];
    if (!areas.length || !isPincode(form.pincode)) return false;
    return !areas.some((prefix) => form.pincode.startsWith(prefix));
  }, [config.serviceAreas, form.pincode]);

  const validateStep = (index) => {
    const next = {};
    if (index === 0) {
      if (!form.make.trim()) next.make = lang === 'hi' ? 'कार की कंपनी भरें' : 'Enter the car make';
      if (form.year && (Number(form.year) < 1950 || Number(form.year) > new Date().getFullYear() + 1)) {
        next.year = lang === 'hi' ? 'सही साल भरें' : 'Enter a valid year';
      }
    }
    if (index === 1) {
      if (!form.name.trim()) next.name = lang === 'hi' ? 'नाम भरें' : 'Enter your name';
      if (!isPhone(form.phone)) next.phone = lang === 'hi' ? '10 अंकों का नंबर भरें' : 'Enter a valid 10-digit number';
    }
    if (index === 2) {
      if (!isPincode(form.pincode)) next.pincode = lang === 'hi' ? '6 अंकों का पिनकोड भरें' : 'Enter a 6-digit pincode';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const next = () => {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(2, s + 1));
  };
  const back = () => setStep((s) => Math.max(0, s - 1));

  const submit = async (e) => {
    e.preventDefault();
    if (!validateStep(2) || !validateStep(0) || !validateStep(1)) {
      setServerError(lang === 'hi' ? 'कृपया सभी ज़रूरी जानकारी भरें।' : 'Please complete the required fields.');
      return;
    }
    setServerError('');
    setSubmitting(true);
    try {
      await api('/leads/public', {
        method: 'POST',
        auth: false,
        body: {
          name: form.name,
          phone: form.phone,
          email: form.email,
          whatsappConsent: form.consent,
          vehicle: {
            make: form.make,
            model: form.model,
            year: form.year,
            category: form.category,
            fuel: form.fuel,
            condition: form.condition,
            rcStatus: form.rcStatus,
            registrationNumber: form.registrationNumber,
          },
          pickup: {
            pincode: form.pincode,
            city: form.city,
            address: form.address,
            needsTowing: form.needsTowing,
          },
          expectedPrice: form.expectedPrice,
          photos,
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

  const waSupport = waLink(
    config.brand?.whatsapp || '919000000000',
    lang === 'hi'
      ? `नमस्ते, मुझे अपनी कार स्क्रैप करनी है — ${form.make || 'कार'} ${form.model || ''}`
      : `Hi, I want to scrap my car — ${form.make || 'car'} ${form.model || ''}`
  );

  return (
    <div className="public-page">
      <div className="public-hero">
        <div className="brand" style={{ padding: 0 }}>
          <div className="brand-mark">L</div>
          <div>
            <div className="brand-name">{config.brand?.name || 'LeadFlow Autoscrap'}</div>
            <div className="brand-sub" style={{ color: '#8e9db8' }}>
              {config.brand?.rvsfNumber ? `RVSF ${config.brand.rvsfNumber}` : 'Authorised scrapping facility'}
            </div>
          </div>
        </div>

        <div>
          <h1>{t.heroTitle}</h1>
          <p>{t.heroSub}</p>
          <div className="hero-points">
            {[t.why1, t.why2, t.why3].map((item) => (
              <div className="hero-point" key={item}>
                <span className="tick">
                  <Icon name="check" size={11} stroke={2.6} />
                </span>
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="hero-badges">
          <span className="hero-badge">✓ {t.badge1}</span>
          <span className="hero-badge">✓ {t.badge2}</span>
          <span className="hero-badge">✓ {t.badge3}</span>
        </div>
      </div>

      <div className="public-main">
        <div className="lang-toggle">
          <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>
            English
          </button>
          <button className={lang === 'hi' ? 'active' : ''} onClick={() => setLang('hi')}>
            हिंदी
          </button>
        </div>

        <div className="public-card">
          {done ? (
            <div className="success-state">
              <div className="success-check">✓</div>
              <h3>
                {t.thanks}, {form.name.split(' ')[0]}!
              </h3>
              <p>{t.thanksBody}</p>
              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                <a className="btn btn-wa" href={waSupport} target="_blank" rel="noreferrer">
                  <Icon name="whatsapp" size={14} /> {t.whatsappCta}
                </a>
                <button
                  className="btn"
                  onClick={() => {
                    setDone(false);
                    setStep(0);
                    setPhotos([]);
                    setForm((f) => ({ ...f, make: '', model: '', year: '', registrationNumber: '' }));
                  }}
                >
                  {t.another}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="public-card-head">
                <h2>{[t.step1, t.step2, t.step3][step]}</h2>
                <p>
                  {lang === 'hi'
                    ? 'सिर्फ़ 3 आसान स्टेप — 1 मिनट में पूरा करें।'
                    : '3 quick steps — takes under a minute.'}
                </p>
              </div>

              <div className="wizard-steps">
                {[t.step1, t.step2, t.step3].map((label, i) => (
                  <div key={label} className={`wizard-step ${i === step ? 'current' : ''} ${i < step ? 'done' : ''}`}>
                    <span className="wizard-dot">{i < step ? '✓' : i + 1}</span>
                    <span className="wizard-label">{label}</span>
                  </div>
                ))}
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
                    {t.from} {platform.label}
                    {attr?.campaign?.name ? ` · ${attr.campaign.name}` : ''}
                  </div>
                )}

                {serverError && (
                  <div className="alert alert-error" style={{ marginBottom: 13 }}>
                    <Icon name="close" size={14} style={{ marginTop: 2 }} />
                    <span>{serverError}</span>
                  </div>
                )}

                <form onSubmit={submit}>
                  {step === 0 && (
                    <div className="form-grid">
                      <div className="grid-2" style={{ display: 'grid', gap: 12 }}>
                        <div className="field">
                          <label>
                            {t.make} <span className="req">*</span>
                          </label>
                          <input className="input" value={form.make} onChange={set('make')} placeholder="Maruti Suzuki" />
                          {errors.make && <span className="error-text">{errors.make}</span>}
                        </div>
                        <div className="field">
                          <label>{t.model}</label>
                          <input className="input" value={form.model} onChange={set('model')} placeholder="Swift" />
                        </div>
                        <div className="field">
                          <label>{t.year}</label>
                          <input
                            className="input"
                            type="number"
                            min="1950"
                            max={new Date().getFullYear()}
                            value={form.year}
                            onChange={set('year')}
                            placeholder="2011"
                          />
                          {errors.year && <span className="error-text">{errors.year}</span>}
                        </div>
                        <div className="field">
                          <label>{t.regNo}</label>
                          <input
                            className="input"
                            value={form.registrationNumber}
                            onChange={set('registrationNumber')}
                            placeholder="UP32AB1234"
                          />
                        </div>
                      </div>

                      <div className="field">
                        <label>{t.category}</label>
                        <div className="radio-cards">
                          {CATEGORIES.map((c) => (
                            <label key={c.id} className={`radio-card ${form.category === c.id ? 'selected' : ''}`}>
                              <input
                                type="radio"
                                name="category"
                                value={c.id}
                                checked={form.category === c.id}
                                onChange={set('category')}
                              />
                              <b>{c.label}</b>
                              <span>{c.hint}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="grid-2" style={{ display: 'grid', gap: 12 }}>
                        <div className="field">
                          <label>{t.fuel}</label>
                          <select className="select" value={form.fuel} onChange={set('fuel')}>
                            {FUELS.map((f) => (
                              <option key={f.id} value={f.id}>
                                {f.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="field">
                          <label>{t.condition}</label>
                          <select className="select" value={form.condition} onChange={set('condition')}>
                            {CONDITIONS.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="field">
                        <label>{t.rc}</label>
                        <div className="chip-options">
                          {RC_STATUSES.map((r) => (
                            <label key={r.id} className={`chip-option ${form.rcStatus === r.id ? 'selected' : ''}`}>
                              <input
                                type="radio"
                                name="rcStatus"
                                value={r.id}
                                checked={form.rcStatus === r.id}
                                onChange={set('rcStatus')}
                              />
                              {r.label}
                            </label>
                          ))}
                        </div>
                      </div>

                      <button type="button" className="btn btn-primary btn-block" onClick={next}>
                        {t.next} <Icon name="right" size={14} />
                      </button>
                    </div>
                  )}

                  {step === 1 && (
                    <div className="form-grid">
                      <div className="field">
                        <label>
                          {t.name} <span className="req">*</span>
                        </label>
                        <input className="input" value={form.name} onChange={set('name')} placeholder="Aarav Sharma" autoComplete="name" />
                        {errors.name && <span className="error-text">{errors.name}</span>}
                      </div>
                      <div className="field">
                        <label>
                          {t.phone} <span className="req">*</span>
                        </label>
                        <input
                          className="input"
                          inputMode="tel"
                          value={form.phone}
                          onChange={set('phone')}
                          placeholder="98765 43210"
                          autoComplete="tel"
                        />
                        {errors.phone && <span className="error-text">{errors.phone}</span>}
                      </div>
                      <div className="field">
                        <label>{t.email}</label>
                        <input className="input" value={form.email} onChange={set('email')} placeholder="you@email.com" autoComplete="email" />
                      </div>
                      <label className="checkbox-line">
                        <input type="checkbox" checked={form.consent} onChange={set('consent')} />
                        <span>{t.consent}</span>
                      </label>
                      <div className="wizard-nav">
                        <button type="button" className="btn" onClick={back}>
                          <Icon name="left" size={14} /> {t.back}
                        </button>
                        <button type="button" className="btn btn-primary" onClick={next}>
                          {t.next} <Icon name="right" size={14} />
                        </button>
                      </div>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="form-grid">
                      <div className="grid-2" style={{ display: 'grid', gap: 12 }}>
                        <div className="field">
                          <label>
                            {t.pincode} <span className="req">*</span>
                          </label>
                          <input
                            className="input"
                            inputMode="numeric"
                            maxLength={6}
                            value={form.pincode}
                            onChange={set('pincode')}
                            placeholder="226001"
                          />
                          {errors.pincode && <span className="error-text">{errors.pincode}</span>}
                        </div>
                        <div className="field">
                          <label>{t.city}</label>
                          <input className="input" value={form.city} onChange={set('city')} placeholder="Lucknow" />
                        </div>
                      </div>
                      {notServiceable && (
                        <div className="alert alert-info">
                          <Icon name="search" size={13} style={{ marginTop: 2 }} />
                          <span>{t.areaWarn}</span>
                        </div>
                      )}
                      <div className="field">
                        <label>{t.address}</label>
                        <textarea
                          className="textarea"
                          value={form.address}
                          onChange={set('address')}
                          placeholder={lang === 'hi' ? 'मोहल्ला / लैंडमार्क' : 'Locality, landmark'}
                          style={{ minHeight: 64 }}
                        />
                      </div>

                      <label className="checkbox-line">
                        <input type="checkbox" checked={form.needsTowing} onChange={set('needsTowing')} />
                        <span>{t.towing} 🚚</span>
                      </label>

                      <div className="field">
                        <label>{t.expected}</label>
                        <input
                          className="input"
                          type="number"
                          min="0"
                          value={form.expectedPrice}
                          onChange={set('expectedPrice')}
                          placeholder="₹ 25000"
                        />
                      </div>

                      <div className="field">
                        <label>{t.photos}</label>
                        {photos.length > 0 && (
                          <div className="photo-row">
                            {photos.map((p, i) => (
                              <div className="photo-thumb" key={i}>
                                <img src={p} alt={`upload ${i + 1}`} />
                                <button
                                  type="button"
                                  className="photo-del"
                                  onClick={() => setPhotos(photos.filter((_, idx) => idx !== i))}
                                >
                                  <Icon name="close" size={10} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        <label className="upload-box">
                          <Icon name="plus" size={16} />
                          <span>{lang === 'hi' ? 'फोटो जोड़ें (3 तक)' : 'Add photos (up to 3)'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            hidden
                            onChange={async (e) => {
                              const urls = await filesToDataUrls(e.target.files, 3 - photos.length);
                              setPhotos((p) => [...p, ...urls].slice(0, 3));
                            }}
                          />
                        </label>
                      </div>

                      <div className="wizard-nav">
                        <button type="button" className="btn" onClick={back}>
                          <Icon name="left" size={14} /> {t.back}
                        </button>
                        <button className="btn btn-primary" disabled={submitting}>
                          {submitting ? t.submitting : t.submit}
                          {!submitting && <Icon name="arrowUpRight" size={14} />}
                        </button>
                      </div>
                    </div>
                  )}
                </form>

                <div className="wa-alt">
                  <span>{lang === 'hi' ? 'फॉर्म भरना नहीं चाहते?' : 'Rather not fill a form?'}</span>
                  <a className="btn btn-sm btn-wa" href={waSupport} target="_blank" rel="noreferrer">
                    <Icon name="whatsapp" size={13} /> {t.whatsappCta}
                  </a>
                </div>
              </div>
            </>
          )}
        </div>

        <a href="/login" className="public-admin-link">
          <Icon name="external" size={11} /> Admin dashboard
        </a>
      </div>
    </div>
  );
}
