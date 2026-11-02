import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import { usePageHeader } from '../components/PageHeader';
import Icon from '../components/Icon';

const SAMPLE = `POST /api/leads/public
Content-Type: application/json

{
  "name": "Aarav Sharma",
  "email": "aarav@company.com",
  "phone": "+91 98765 43210",
  "company": "Sharma Interiors",
  "message": "Need a quote for 3BHK",
  "source": "instagram",
  "formSlug": "main",
  "campaign": {
    "source": "instagram",
    "medium": "paid_social",
    "name": "IG_Reels_Q4",
    "content": "reel_design_v2",
    "clickId": "IwAR0abc..."
  },
  "pageUrl": "https://yourdomain.com/f/main?utm_source=instagram"
}`;

export default function Settings() {
  const { user } = useAuth();
  const toast = useToast();
  const [health, setHealth] = useState(null);
  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '' });
  const [saving, setSaving] = useState(false);
  const formUrl = `${window.location.origin}/f/main`;

  const loadHealth = useCallback(async () => {
    try {
      setHealth(await api('/health', { auth: false }));
    } catch {
      setHealth(null);
    }
  }, []);

  useEffect(() => {
    loadHealth();
  }, [loadHealth]);

  usePageHeader({ title: 'Settings', subtitle: 'Your account, public form and API access' }, []);

  const copy = async (text, label = 'Copied') => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(label);
    } catch {
      window.prompt('Copy', text);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api('/auth/password', { method: 'PATCH', body: pwd });
      toast.success('Password updated');
      setPwd({ currentPassword: '', newPassword: '' });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-section">
      <div className="split-even">
        <div className="card">
          <div className="card-head">
            <div>
              <h3>Account</h3>
              <div className="sub">Signed in with JWT</div>
            </div>
          </div>
          <div className="card-pad" style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="avatar" style={{ width: 42, height: 42, fontSize: 15 }}>
                {(user?.name || 'A').slice(0, 1).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 650 }}>{user?.name}</div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{user?.email}</div>
              </div>
              <span className="pill pill-qualified" style={{ marginLeft: 'auto' }}>
                {user?.role}
              </span>
            </div>

            <form onSubmit={changePassword} className="form-grid" style={{ borderTop: '1px solid var(--line-2)', paddingTop: 14 }}>
              <div className="section-label" style={{ marginBottom: -4 }}>Change password</div>
              <div className="field">
                <label>Current password</label>
                <input
                  className="input"
                  type="password"
                  value={pwd.currentPassword}
                  onChange={(e) => setPwd({ ...pwd, currentPassword: e.target.value })}
                  placeholder="••••••••"
                  required
                />
              </div>
              <div className="field">
                <label>New password</label>
                <input
                  className="input"
                  type="password"
                  value={pwd.newPassword}
                  onChange={(e) => setPwd({ ...pwd, newPassword: e.target.value })}
                  placeholder="At least 6 characters"
                  minLength={6}
                  required
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-primary btn-sm" disabled={saving}>
                  {saving ? 'Updating…' : 'Update password'}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <h3>Public lead form</h3>
              <div className="sub">Point your ad CTA here</div>
            </div>
          </div>
          <div className="card-pad link-card">
            <div className="field">
              <label>Form URL</label>
              <div className="copy-field">
                <input className="input" readOnly value={formUrl} onFocus={(e) => e.target.select()} />
                <button className="btn btn-sm" onClick={() => copy(formUrl, 'Form link copied')}>
                  <Icon name="copy" size={13} />
                </button>
              </div>
              <span className="hint">
                Any path works: <code>/f/main</code>, <code>/f/diwali-offer</code>. The slug is stored on each
                lead so you can tell forms apart.
              </span>
            </div>
            <a className="btn btn-primary" href="/f/main" target="_blank" rel="noreferrer">
              <Icon name="external" size={14} /> Open the form
            </a>
            <div className="alert alert-info">
              <Icon name="link" size={14} style={{ marginTop: 2 }} />
              <span>
                Add UTM parameters in the <b>Ad Links</b> tab and every submission will be tagged with its
                platform, campaign and ad variant.
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <h3>Database</h3>
            <div className="sub">MongoDB Atlas connection status</div>
          </div>
          <div className="spacer" />
          <span className={`dot ${health?.db === 'memory' ? 'memory' : ''}`} />
          <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>
            {health ? (health.db === 'memory' ? 'In-memory (demo)' : 'MongoDB Atlas') : 'Unknown'}
          </span>
        </div>
        <div className="card-pad" style={{ display: 'grid', gap: 10 }}>
          <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.65 }}>
            Set <code>MONGODB_URI</code> in <code>server/.env</code> to your Atlas cluster connection string and
            restart the API. When it is empty or unreachable, the server falls back to an in-memory database so
            you can demo everything — data resets on restart.
          </p>
          <div className="copy-field">
            <input
              className="input"
              readOnly
              value="MONGODB_URI=mongodb+srv://user:password@cluster0.xxxxx.mongodb.net/leadflow?retryWrites=true&w=majority"
              onFocus={(e) => e.target.select()}
            />
            <button
              className="btn btn-sm"
              onClick={() =>
                copy(
                  'MONGODB_URI=mongodb+srv://user:password@cluster0.xxxxx.mongodb.net/leadflow?retryWrites=true&w=majority'
                )
              }
            >
              <Icon name="copy" size={13} />
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <h3>Developer API</h3>
            <div className="sub">Submit leads from any landing page, Zapier or a custom form</div>
          </div>
          <div className="spacer" />
          <button className="btn btn-sm" onClick={() => copy(SAMPLE, 'Request example copied')}>
            <Icon name="copy" size={12} /> Copy example
          </button>
        </div>
        <div className="card-pad">
          <pre
            style={{
              margin: 0,
              background: '#0d1327',
              color: '#dbe3f0',
              padding: 15,
              borderRadius: 11,
              fontSize: 11.8,
              lineHeight: 1.6,
              overflowX: 'auto',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            }}
          >
            {SAMPLE}
          </pre>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10, lineHeight: 1.6 }}>
            The endpoint is public (rate-limited) so your ad landing page can post to it directly. Required
            fields: <code>name</code> and <code>email</code>. Send <code>campaign</code> / UTM values to keep
            attribution accurate.
          </p>
        </div>
      </div>
    </div>
  );
}
