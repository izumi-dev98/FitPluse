const base = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export async function api(path: string, opts?: RequestInit) {
  const res = await fetch(`${base}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(opts?.headers || {}) },
    ...opts,
    body: opts?.body ? (typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body)) : undefined,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
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
  getDailyRecords: (userId: string) => api(`/api/daily-records?userId=${userId}`),
  createDailyRecord: (body: any) => api('/api/daily-records', { method: 'POST', body }),
  getFoods: () => api('/api/foods'),
  getExercises: (userId: string) => api(`/api/exercises?userId=${userId}`),
  getWeightHistory: (userId: string) => api(`/api/weight-history?userId=${userId}`),
};
