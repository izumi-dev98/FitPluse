import { useAuthStore } from '../store/auth';

const base = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function getToken(): string | null {
  try {
    // 1. Try the store (synced via zustand persist)
    const state = useAuthStore.getState();
    if (state.accessToken) return state.accessToken;

    // 2. Fallback to localStorage directly
    const accessToken = localStorage.getItem('access_token');
    if (accessToken) return accessToken;

    // 3. Try fitpulse-auth storage
    const raw = localStorage.getItem('fitpulse-auth');
    if (raw) {
      const stored = JSON.parse(raw);
      if (stored.accessToken) return stored.accessToken;
    }
  } catch {}
  return null;
}

export async function api(path: string, opts?: RequestInit, retry = true) {
  const token = getToken();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(`${base}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(opts?.headers || {}),
      },
      ...opts,
      signal: controller.signal,
      body: opts?.body ? (typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body)) : undefined,
    });
    clearTimeout(timeout);

    // Access token died mid-flight (e.g. revoked) — force refresh once and retry
    if (res.status === 401 && retry) {
      const state = useAuthStore.getState();
      let refreshToken = state.refreshToken || localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const fresh = await state.refreshNow();
          if (fresh && fresh !== token) return api(path, opts, false);
        } catch {}
      }
    }
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  } catch (err: any) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') throw new Error('Request timed out');
    throw err;
  }
}

export const apiClient = {
  getProfile: () => api('/api/profiles'),
  createProfile: (body: any) => api('/api/profiles', { method: 'POST', body }),
  updateProfile: (id: string, body: any) => api(`/api/profiles/${id}`, { method: 'PUT', body }),
  calcBMR: (body: any) => api('/api/bmr', { method: 'POST', body }),
  calcTDEE: (body: any) => api('/api/tdee', { method: 'POST', body }),
  calcCalorieTarget: (body: any) => api('/api/calorie-target', { method: 'POST', body }),
  getGoals: (userId?: string) => api(`/api/goals${userId ? `?userId=${userId}` : ''}`),
  createGoal: (body: any) => api('/api/goals', { method: 'POST', body }),
  updateGoal: (id: string, body: any) => api(`/api/goals/${id}`, { method: 'PUT', body }),
  deleteGoal: (id: string) => api(`/api/goals/${id}`, { method: 'DELETE' }),
  getDailyRecords: (userId: string) => api(`/api/daily-records?userId=${userId}`),
  createDailyRecord: (body: any) => api('/api/daily-records', { method: 'POST', body }),
  getFoods: (userId?: string) => api(`/api/foods${userId ? `?userId=${userId}` : ''}`),
  createFood: (body: any) => api('/api/foods', { method: 'POST', body }),
  updateFood: (id: string, body: any) => api(`/api/foods/${id}`, { method: 'PUT', body }),
  deleteFood: (id: string) => api(`/api/foods/${id}`, { method: 'DELETE' }),
  getDailyFoods: (userId: string, dailyRecordId?: string) => api(`/api/daily-foods?userId=${userId}${dailyRecordId ? `&dailyRecordId=${dailyRecordId}` : ''}`),
  createDailyFood: (body: any) => api('/api/daily-foods', { method: 'POST', body }),
  getExercises: (userId: string) => api(`/api/exercises?userId=${userId}`),
  createExercise: (body: any) => api('/api/exercises', { method: 'POST', body }),
  updateExercise: (id: string, body: any) => api(`/api/exercises/${id}`, { method: 'PUT', body }),
  deleteExercise: (id: string) => api(`/api/exercises/${id}`, { method: 'DELETE' }),
  getDailyExercises: (userId: string) => api(`/api/daily-exercises?userId=${userId}`),
  createDailyExercise: (body: any) => api('/api/daily-exercises', { method: 'POST', body }),
  getWeightHistory: (userId: string) => api(`/api/weight-history?userId=${userId}`),
  createWeightHistory: (body: any) => api('/api/weight-history', { method: 'POST', body }),
  getWaterIntake: (userId: string) => api(`/api/water-intake?userId=${userId}`),
  createWaterIntake: (body: any) => api('/api/water-intake', { method: 'POST', body }),
  getBadges: (userId?: string) => api(`/api/badges${userId ? `?userId=${userId}` : ''}`),
  getUserBadges: (userId: string) => api(`/api/user-badges?userId=${userId}`),
  changePassword: (body: any) => api('/api/auth/change-password', { method: 'POST', body }),
  getBodyProgressImages: (userId: string) => api(`/api/body-progress-images?userId=${userId}`),
  createBodyProgressImage: (body: any) => api('/api/body-progress-images', { method: 'POST', body }),
};
