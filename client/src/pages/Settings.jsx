import { useCallback, useEffect, useState } from 'react';
import { DEMO_MODE, api, resetDemoData } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import { usePageHeader } from '../components/PageHeader';
import { Chip } from '../components/Badges';
import Icon from '../components/Icon';

const SAMPLE = `POST /api/leads/public
Content-Type: application/json

{
  "name": "Aarav Sharma",
  "phone": "9811024411",
  "whatsappConsent": true,
  "vehicle": {
    "make": "Maruti Suzuki",
    "model": "Swift",
    "year": 2011,
    "fuel": "petrol",
    "condition": "running",
    "rcStatus": "original",
    "category": "hatchback",
    "registrationNumber": "UP32AB1234"
  },
  "pickup": { "pincode": "226001", "city": "Lucknow", "needsTowing": true },
  "expectedPrice": 25000,
  "source": "instagram",
  "formSlug": "main",
  "campaign": { "source": "instagram", "medium": "paid_social", "name": "IG_Reels_Scrap" }
}`;

export default function Settings() {
  const { user } = useAuth();
  const toast = useToast();
  const isAdmin = user?.role === 'admin';
  const [health, setHealth] = useState(null);
  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '' });
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ name: '', email: '', phone: '', password: '', role: 'telecaller' });
  const formUrl = `${window.location.origin}/f/main`;

  const load = useCallback(async () => {
    try {
      setHealth(await api('/health', { auth: false }));
    } catch {
      setHealth(null);
    }
    if (isAdmin) {
      try {
        const d = await api('/users');
        setUsers(d.users || []);
      } catch {
        /* ignore */
      }
    }
  }, [isAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  usePageHeader({ title: 'Settings', subtitle: 'Account, team, form link and API access' }, []);

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

  const addUser = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api('/users', { method: 'POST', body: newUser });
      toast.success('Team member added');
      setNewUser({ name: '', email: '', phone: '', password: '', role: 'telecaller' });
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleUser = async (u) => {
    try {
      await api(`/users/${u.id}`, { method: 'PATCH', body: { active: !u.active } });
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="page-section">
      <div className="split-even">
        <div className="card">
          <div className="card-head">
            <div>
              <h3>Your account</h3>
              <div className="sub">Signed in with a JWT session</div>
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
              <div style={{ marginLeft: 'auto' }}>
                <Chip color={user?.role === 'admin' ? '#6d28d9' : '#0f766e'}>
                  {user?.role === 'admin' ? 'Admin' : user?.role === 'yard' ? 'Yard team' : 'Telecaller'}
                </Chip>
              </div>
            </div>

            <form onSubmit={changePassword} className="form-grid" style={{ borderTop: '1px solid var(--line-2)', paddingTop: 14 }}>
              <div className="section-label" style={{ marginBottom: -4 }}>
                Change password
              </div>
              <div className="field">
                <label>Current password</label>
                <input
                  className="input"
                  type="password"
                  value={pwd.currentPassword}
                  onChange={(e) => setPwd({ ...pwd, currentPassword: e.target.value })}
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
                  minLength={6}
                  placeholder="At least 6 characters"
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
                Any slug works — <code>/f/main</code>, <code>/f/lucknow-offer</code>. The slug is stored on each
                lead.
              </span>
            </div>
            <a className="btn btn-primary" href="/f/main" target="_blank" rel="noreferrer">
              <Icon name="external" size={14} /> Open the form
            </a>
            <div className="alert alert-info">
              <Icon name="link" size={14} style={{ marginTop: 2 }} />
              <span>
                Add UTM parameters in <b>Ads &amp; reports</b> so every enquiry carries its platform and campaign.
              </span>
            </div>
          </div>
        </div>
      </div>

      {isAdmin && (
        <div className="card">
          <div className="card-head">
            <div>
              <h3>Team</h3>
              <div className="sub">Telecallers only see the leads assigned to them</div>
            </div>
            <div className="spacer" />
            <Chip color="#475569">{users.length} member(s)</Chip>
          </div>

          <div className="table-wrap">
            <table className="leads">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th style={{ width: 110 }} />
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={{ cursor: 'default' }}>
                    <td style={{ fontWeight: 600 }}>{u.name}</td>
                    <td style={{ color: 'var(--muted)' }}>{u.email}</td>
                    <td>
                      <Chip color={u.role === 'admin' ? '#6d28d9' : '#0f766e'}>
                        {u.role === 'admin' ? 'Admin' : u.role === 'yard' ? 'Yard team' : 'Telecaller'}
                      </Chip>
                    </td>
                    <td>
                      <Chip color={u.active ? '#047857' : '#94a3b8'}>{u.active ? 'Active' : 'Disabled'}</Chip>
                    </td>
                    <td>
                      {u.id !== user?.id && (
                        <button className="btn btn-sm btn-ghost" onClick={() => toggleUser(u)}>
                          {u.active ? 'Disable' : 'Enable'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <form className="card-pad" onSubmit={addUser} style={{ display: 'grid', gap: 11, borderTop: '1px solid var(--line-2)' }}>
            <div className="section-label" style={{ marginBottom: -2 }}>
              Add a telecaller
            </div>
            <div className="grid-2" style={{ display: 'grid', gap: 11 }}>
              <input
                className="input"
                placeholder="Full name"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                required
              />
              <input
                className="input"
                type="email"
                placeholder="Email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                required
              />
              <input
                className="input"
                placeholder="Phone"
                value={newUser.phone}
                onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
              />
              <input
                className="input"
                type="password"
                placeholder="Temporary password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                minLength={6}
                required
              />
              <select
                className="select"
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
              >
                <option value="telecaller">Telecaller</option>
                <option value="yard">Yard team</option>
                <option value="admin">Admin</option>
              </select>
              <button className="btn btn-primary btn-sm" disabled={saving} style={{ justifySelf: 'end' }}>
                Add member
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="split-even">
        <div className="card">
          <div className="card-head">
            <div>
              <h3>Database</h3>
              <div className="sub">MongoDB Atlas connection</div>
            </div>
            <div className="spacer" />
            <span className={`dot ${health?.db === 'memory' ? 'memory' : ''}`} />
            <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>
              {health ? (health.db === 'memory' ? 'In-memory (demo)' : 'MongoDB Atlas') : 'Unknown'}
            </span>
          </div>
          <div className="card-pad" style={{ display: 'grid', gap: 10 }}>
            <p style={{ fontSize: 12.8, color: 'var(--ink-2)', lineHeight: 1.65 }}>
              Set <code>MONGODB_URI</code> in <code>server/.env</code> and restart the API. When it is empty or
              unreachable the server falls back to an in-memory database so you can demo everything.
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
              <h3>Auto-assignment</h3>
              <div className="sub">How new enquiries reach your team</div>
            </div>
          </div>
          <div className="card-pad" style={{ display: 'grid', gap: 10, fontSize: 12.8, lineHeight: 1.7, color: 'var(--ink-2)' }}>
            <p>
              New submissions arrive <b>unassigned</b>. Admins assign them from the lead drawer, or set an owner
              while adding a lead manually.
            </p>
            <p>
              A <b>telecaller</b> login only sees leads assigned to them — so two callers never ring the same
              customer.
            </p>
            <p className="hint">
              Tip: assign inside 10 minutes. Enquiries older than a day convert far worse.
            </p>
          </div>
        </div>
      </div>

      {DEMO_MODE && (
        <div className="card">
          <div className="card-head">
            <div>
              <h3>Demo data</h3>
              <div className="sub">This preview build runs in your browser</div>
            </div>
            <div className="spacer" />
            <Chip color="#7c3aed">Demo mode</Chip>
          </div>
          <div className="card-pad" style={{ display: 'grid', gap: 10 }}>
            <p style={{ fontSize: 12.8, color: 'var(--ink-2)', lineHeight: 1.7 }}>
              Everything here is local sample data saved in this browser — nothing is sent to a server. Every
              action works: add a lead, send a quote, schedule a pickup, tick documents, mark it paid.
            </p>
            <div>
              <button
                className="btn btn-sm"
                onClick={() => {
                  window.confirm('Reset the demo back to the original sample leads?') &&
                    (resetDemoData(), window.location.reload());
                }}
              >
                <Icon name="refresh" size={13} /> Reset demo data
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-head">
          <div>
            <h3>Developer API</h3>
            <div className="sub">Submit leads from any landing page, Zapier or IVR</div>
          </div>
          <div className="spacer" />
          <button className="btn btn-sm" onClick={() => copy(SAMPLE, 'Request example copied')}>
            <Icon name="copy" size={12} /> Copy example
          </button>
        </div>
        <div className="card-pad">
          <pre className="code-block">{SAMPLE}</pre>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10, lineHeight: 1.6 }}>
            The endpoint is public (rate-limited) so your landing page can post to it directly. Required:{' '}
            <code>name</code> and <code>phone</code>. Send <code>vehicle</code> details and UTM values to keep
            quoting and attribution accurate.
          </p>
        </div>
      </div>
    </div>
  );
}
