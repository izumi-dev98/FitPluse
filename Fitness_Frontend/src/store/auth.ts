import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null; // unix seconds from Supabase
  user: any | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
  getValidToken: () => Promise<string | null>;
  refreshNow: () => Promise<string | null>;
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshTokens(refreshToken: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  const res = await fetch(`${API_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
    signal: controller.signal,
  });
  clearTimeout(timeout);
  if (!res.ok) throw new Error('refresh failed');
  return res.json() as Promise<{ access_token: string; refresh_token: string; expires_at: number }>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
      user: null,

      login: async (email, password) => {
        const res = await fetch(`${API_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        set({
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt: data.expires_at,
          user: data.user,
        });
      },

      signup: async (email, password, name) => {
        const res = await fetch(`${API_URL}/api/auth/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name }),
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        // If email confirmation is on, session is null — user must login after confirming
        // But still store tokens if available
        if (data.access_token) {
          set({
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expiresAt: data.session?.expires_at || null,
            user: data.user,
          });
        }
      },

      logout: () => {
        set({ accessToken: null, refreshToken: null, expiresAt: null, user: null });
        localStorage.removeItem('fitpulse-auth');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      },

      // Returns a non-expired token, refreshing if needed.
      // Survives app restart because zustand/persist rehydrates from localStorage.
      getValidToken: async () => {
        try {
          let { accessToken, refreshToken, expiresAt } = get();
          
          // Fallback to localStorage if store hasn't rehydrated yet
          if (!accessToken || !refreshToken) {
            try {
              const fitpulseAuth = JSON.parse(localStorage.getItem('fitpulse-auth') || '{}');
              const accessTokenKey = localStorage.getItem('access_token');
              const refreshTokenKey = localStorage.getItem('refresh_token');
              if (!accessToken) accessToken = fitpulseAuth.accessToken || accessTokenKey || null;
              if (!refreshToken) refreshToken = fitpulseAuth.refreshToken || refreshTokenKey || null;
              if (!expiresAt) expiresAt = fitpulseAuth.expiresAt || null;
            } catch {}
          }
          
          if (!accessToken || !refreshToken) return null;

          // Refresh 60s before expiry (Supabase default: 3600s = 1h)
          const nowSec = Math.floor(Date.now() / 1000);
          const needsRefresh = !expiresAt || nowSec >= expiresAt - 60;
          if (!needsRefresh) return accessToken;

          return get().refreshNow();
        } catch {
          return null;
        }
      },

      // Force a refresh regardless of expiry (used after a 401).
      refreshNow: async () => {
        try {
          let { refreshToken } = get();
          
          // Fallback to localStorage if store hasn't rehydrated yet
          if (!refreshToken) {
            try {
              const fitpulseAuth = JSON.parse(localStorage.getItem('fitpulse-auth') || '{}');
              const refreshTokenKey = localStorage.getItem('refresh_token');
              refreshToken = fitpulseAuth.refreshToken || refreshTokenKey || null;
            } catch {}
          }
          
          if (!refreshToken) return null;
          // Dedupe concurrent refreshes
          if (!refreshPromise) {
            refreshPromise = refreshTokens(refreshToken)
              .then((data) => {
                set({
                  accessToken: data.access_token,
                  refreshToken: data.refresh_token,
                  expiresAt: data.expires_at,
                });
                return data.access_token;
              })
              .catch(() => {
                get().logout();
                return null;
              })
              .finally(() => {
                refreshPromise = null;
              });
          }
          return refreshPromise;
        } catch {
          return null;
        }
      },
    }),
    { name: 'fitpulse-auth', partialize: (s) => ({ accessToken: s.accessToken, refreshToken: s.refreshToken, expiresAt: s.expiresAt, user: s.user }) }
  )
);
