import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import Icon from '../components/Icon';

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
          <h2>Every scrap enquiry, quoted and picked up on time.</h2>
          <p>
            One dashboard for the leads your Instagram, Facebook, Google and Justdial ads bring in — with vehicle
            details, quotes, pickups and RTO paperwork in one place.
          </p>
          <div className="hero-points">
            {[
              'Vehicle details captured before the first call',
              'Quote calculator, pickup schedule and document checklist',
              'CD / deregistration tracking with WhatsApp updates',
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

        <div />
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

          <a href="/f/main" style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
            Not an admin? Open the public lead form →
          </a>
        </div>
      </div>
    </div>
  );
}
