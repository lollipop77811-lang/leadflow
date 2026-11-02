import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import Icon from '../components/Icon';

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('admin@leadflow.dev');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true });
  }, [isAuthenticated, navigate]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
      const to = location.state?.from?.pathname || '/';
      navigate(to, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-hero">
        <div className="brand" style={{ padding: 0 }}>
          <div className="brand-mark">L</div>
          <div>
            <div className="brand-name">LeadFlow</div>
            <div className="brand-sub" style={{ color: '#8e9db8' }}>
              Lead dashboard
            </div>
          </div>
        </div>

        <div>
          <h2>Turn every ad click into a tracked, actionable lead.</h2>
          <p>
            One dashboard for Instagram, Facebook, Google, LinkedIn and WhatsApp leads — captured the moment
            someone submits your form.
          </p>
          <div className="hero-points">
            {[
              'Real-time capture from every ad platform',
              'UTM + click-ID attribution on every lead',
              'Pipeline board, notes and CSV export',
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

        <div style={{ fontSize: 12, color: '#7d8bab' }}>React + Vite · Express · MongoDB</div>
      </div>

      <div className="auth-side">
        <div className="auth-card">
          <div>
            <h1>Welcome back</h1>
            <p className="sub">Sign in to view and manage your leads.</p>
          </div>

          {error && (
            <div className="alert alert-error">
              <Icon name="close" size={14} style={{ marginTop: 2 }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={submit} className="form-grid">
            <div className="field">
              <label>Email</label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
            <div className="field">
              <label>Password</label>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            <button className="btn btn-primary btn-block" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="demo-box">
            <b>Demo credentials</b>
            <br />
            Email: <code>admin@leadflow.dev</code>
            <br />
            Password: <code>admin123</code>
            <br />
            <span style={{ opacity: 0.75 }}>Change these in server/.env before going live.</span>
          </div>

          <a href="/f/main" style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
            Not an admin? Open the public lead form →
          </a>
        </div>
      </div>
    </div>
  );
}
