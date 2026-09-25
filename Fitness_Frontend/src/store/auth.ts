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
  const res = await fetch(`${API_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
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
        if (data.session) {
          set({
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expiresAt: data.session.expires_at,
            user: data.user,
          });
        }
      },

      logout: () => {
        set({ accessToken: null, refreshToken: null, expiresAt: null, user: null });
        localStorage.removeItem('fitpulse-auth');
      },

      // Returns a non-expired token, refreshing if needed.
      // Survives app restart because zustand/persist rehydrates from localStorage.
      getValidToken: async () => {
        const { accessToken, refreshToken, expiresAt } = get();
        if (!accessToken || !refreshToken) return null;

        // Refresh 60s before expiry (Supabase default: 3600s = 1h)
        const nowSec = Math.floor(Date.now() / 1000);
        const needsRefresh = !expiresAt || nowSec >= expiresAt - 60;
        if (!needsRefresh) return accessToken;

        return get().refreshNow();
      },

      // Force a refresh regardless of expiry (used after a 401).
      refreshNow: async () => {
        const { refreshToken } = get();
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
      },
    }),
    { name: 'fitpulse-auth', partialize: (s) => ({ accessToken: s.accessToken, refreshToken: s.refreshToken, expiresAt: s.expiresAt, user: s.user }) }
  )
);
