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
  { to: '/today', label: 'Today', icon: 'clock', badge: 'today' },
  { to: '/campaigns', label: 'Ads & reports', icon: 'campaigns' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const [newCount, setNewCount] = useState(0);
  const [todayCount, setTodayCount] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    api('/stats')
      .catch(() => null)
      .then((stats) => {
        if (!alive || !stats) return;
        setNewCount(stats.byStatus?.find((s) => s.status === 'new')?.count || 0);
        setTodayCount((stats.followUps?.overdue || 0) + (stats.followUps?.today || 0));
      });
    return () => {
      alive = false;
    };
  }, [location.pathname]);

  const signOut = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const badges = { today: todayCount, leads: newCount };

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">L</div>
          <div>
            <div className="brand-name">LeadFlow</div>
            <div className="brand-sub">Car scrapping</div>
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
              {item.badge && badges[item.badge] > 0 && (
                <span className="count">{badges[item.badge]}</span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="user-card">
            <div className="avatar">{(user?.name || 'A').slice(0, 1).toUpperCase()}</div>
            <div className="user-meta">
              <b>{user?.name || 'Admin'}</b>
              <span>
                {user?.role === 'admin' ? 'Admin' : user?.role === 'yard' ? 'Yard team' : 'Telecaller'}
              </span>
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
