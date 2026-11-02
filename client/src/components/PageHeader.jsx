import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import Icon from './Icon';

const HeaderCtx = createContext(null);

/**
 * Renders the sticky top bar and lets the active page drive its title,
 * subtitle and action buttons through usePageHeader().
 */
export function PageHeaderProvider({ onMenu, children }) {
  const [config, setConfig] = useState({ title: '', subtitle: '', actions: null });
  const value = useMemo(() => ({ setConfig }), []);

  return (
    <HeaderCtx.Provider value={value}>
      <header className="topbar">
        <button className="icon-btn mobile-only" onClick={onMenu} aria-label="Open menu">
          <Icon name="menu" size={18} />
        </button>
        <div style={{ minWidth: 0 }}>
          <h1>{config.title}</h1>
          {config.subtitle && <div className="sub">{config.subtitle}</div>}
        </div>
        <div className="topbar-actions">{config.actions}</div>
      </header>
      {children}
    </HeaderCtx.Provider>
  );
}

/** Call from any page: usePageHeader({ title, subtitle, actions, ... }, [deps]) */
export function usePageHeader(config, deps = []) {
  const ctx = useContext(HeaderCtx);
  useEffect(() => {
    ctx?.setConfig({ title: '', subtitle: '', actions: null, ...config });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
