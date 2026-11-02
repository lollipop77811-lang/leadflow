import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, clearSession, getStoredUser, getToken, setSession } from './api';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser());
  const [checking, setChecking] = useState(Boolean(getToken()));

  useEffect(() => {
    let alive = true;
    if (!getToken()) {
      setChecking(false);
      return () => {};
    }
    api('/auth/me')
      .then((d) => alive && setUser(d.user))
      .catch(() => {})
      .finally(() => alive && setChecking(false));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const onUnauthorized = () => user && setUser(null);
    window.addEventListener('leadflow:unauthorized', onUnauthorized);
    return () => window.removeEventListener('leadflow:unauthorized', onUnauthorized);
  }, [user]);

  const login = useCallback(async (email, password) => {
    const data = await api('/auth/login', {
      method: 'POST',
      body: { email, password },
      auth: false,
    });
    setSession(data.token, data.user);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, checking, login, logout, isAuthenticated: Boolean(user) }),
    [user, checking, login, logout]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
