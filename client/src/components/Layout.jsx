import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import Icon from './Icon';
import { PageHeaderProvider } from './PageHeader';

const NAV = [
  { to: '/', label: 'Overview', icon: 'dashboard', end: true },
  { to: '/leads', label: 'Leads', icon: 'leads' },
  { to: '/pipeline', label: 'Pipeline', icon: 'pipeline' },
  { to: '/campaigns', label: 'Ad Links', icon: 'campaigns' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const [newCount, setNewCount] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    api('/stats')
      .catch(() => null)
      .then((stats) => {
        if (!alive || !stats) return;
        const n = stats.byStatus?.find((s) => s.status === 'new')?.count || 0;
        setNewCount(n);
      });
    return () => {
      alive = false;
    };
  }, [location.pathname]);

  const signOut = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">L</div>
          <div>
            <div className="brand-name">LeadFlow</div>
            <div className="brand-sub">Lead capture</div>
          </div>
        </div>

        <nav className="nav">
          <span className="nav-label">Workspace</span>
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-ico">
                <Icon name={item.icon} size={15} />
              </span>
              {item.label}
              {item.to === '/leads' && newCount > 0 && <span className="count">{newCount}</span>}
            </NavLink>
          ))}

          <span className="nav-label">Your ads</span>
          <a className="nav-item" href="/f/main" target="_blank" rel="noreferrer">
            <span className="nav-ico">
              <Icon name="form" size={15} />
            </span>
            Public form
            <span className="nav-ico" style={{ marginLeft: 'auto' }}>
              <Icon name="external" size={12} />
            </span>
          </a>
        </nav>

        <div className="sidebar-foot">
          <div className="user-card">
            <div className="avatar">{(user?.name || 'A').slice(0, 1).toUpperCase()}</div>
            <div className="user-meta">
              <b>{user?.name || 'Admin'}</b>
              <span>{user?.email}</span>
            </div>
            <button className="icon-btn" onClick={signOut} title="Sign out" style={{ color: '#94a3b8' }}>
              <Icon name="logout" size={14} />
            </button>
          </div>
        </div>
      </aside>

      <div className="main">
        <PageHeaderProvider>
          <main className="content">
            <Outlet />
          </main>
        </PageHeaderProvider>
      </div>
    </div>
  );
}
