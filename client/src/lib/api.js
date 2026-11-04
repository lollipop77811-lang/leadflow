import { mockApi, mockCsv, resetState } from './mockApi';

/**
 * DEMO MODE
 * The static client (e.g. the Netlify build used to show the client around)
 * runs without any backend: any email + password logs in and every screen is
 * served realistic demo data from the browser.
 * Set VITE_DEMO_MODE=false to talk to the real Express + MongoDB API again.
 */
export const DEMO_MODE = String(import.meta.env.VITE_DEMO_MODE ?? 'true').toLowerCase() !== 'false';
export { resetState as resetDemoData };

const TOKEN_KEY = 'leadflow.token';
const USER_KEY = 'leadflow.user';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
  } catch {
    return null;
  }
};
export const setSession = (token, user) => {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
};
export const clearSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

export class ApiError extends Error {
  constructor(message, status, errors) {
    super(message);
    this.status = status;
    this.errors = errors || {};
  }
}

export async function api(path, { method = 'GET', body, auth = true, signal } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  if (DEMO_MODE) {
    try {
      return await mockApi(path, { method, body });
    } catch (err) {
      throw new ApiError(err.message || 'Something went wrong.', err.status || 500, err.errors);
    }
  }

  const token = getToken();
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });

  if (res.status === 401 && auth) {
    clearSession();
    window.dispatchEvent(new CustomEvent('leadflow:unauthorized'));
  }

  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : await res.text();

  if (!res.ok) {
    const message =
      (data && data.message) || `Request failed (${res.status}). Please try again.`;
    throw new ApiError(message, res.status, data && data.errors);
  }
  return data;
}

export const qs = (params) => {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') sp.set(k, v);
  });
  const s = sp.toString();
  return s ? `?${s}` : '';
};

export async function downloadCsv(params) {
  if (DEMO_MODE) {
    const { csv, filename, rows } = await mockCsv(params);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return rows;
  }

  const token = getToken();
  const res = await fetch(`/api/leads/export.csv${qs(params)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Could not export leads.');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
