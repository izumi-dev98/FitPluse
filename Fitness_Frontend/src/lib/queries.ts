import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { apiClient } from './api';
import { useAuthStore } from '../store/auth';

// Shared cache keys. Screens that show the same data reuse the same key,
// so switching routes within `staleTime` renders instantly with no refetch.
export const qk = {
  goals: (uid?: string) => ['goals', uid] as const,
  dailyRecords: (uid?: string) => ['daily-records', uid] as const,
  dailyFoods: (uid?: string, recordId?: string) =>
    recordId ? (['daily-foods', uid, recordId] as const) : (['daily-foods', uid] as const),
  dailyExercises: (uid?: string) => ['daily-exercises', uid] as const,
  water: (uid?: string) => ['water-intake', uid] as const,
  weights: (uid?: string) => ['weight-history', uid] as const,
  foods: (uid?: string) => ['foods', uid] as const,
  exercises: (uid?: string) => ['exercises', uid] as const,
  bodyImages: (uid?: string) => ['body-images', uid] as const,
  profile: () => ['profile'] as const,
  badges: (uid?: string) => ['badges', uid] as const,
  userBadges: (uid?: string) => ['user-badges', uid] as const,
};

export const STALE_TIME = 60_000;
export const GC_TIME = 10 * 60_000;

// Preserve the pages' current contract: failed reads resolve to [].
async function arr<T = any>(p: Promise<unknown>): Promise<T[]> {
  const d = await p.catch(() => []);
  return Array.isArray(d) ? (d as T[]) : [];
}

function useArr<T = any>(key: readonly unknown[], fn: () => Promise<unknown>, uid?: string) {
  return useQuery({
    queryKey: key,
    queryFn: () => arr<T>(fn()),
    enabled: !!uid,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    retry: 1,
  });
}

export const useGoals = (uid?: string) => useArr(qk.goals(uid), () => apiClient.getGoals(uid!), uid);
export const useDailyRecords = (uid?: string) =>
  useArr(qk.dailyRecords(uid), () => apiClient.getDailyRecords(uid!), uid);
export const useDailyFoods = (uid?: string, recordId?: string) =>
  useArr(qk.dailyFoods(uid, recordId), () => apiClient.getDailyFoods(uid!, recordId), uid);
export const useDailyExercises = (uid?: string) =>
  useArr(qk.dailyExercises(uid), () => apiClient.getDailyExercises(uid!), uid);
export const useWaterIntake = (uid?: string) =>
  useArr(qk.water(uid), () => apiClient.getWaterIntake(uid!), uid);
export const useWeightHistory = (uid?: string) =>
  useArr(qk.weights(uid), () => apiClient.getWeightHistory(uid!), uid);
export const useFoods = (uid?: string) => useArr(qk.foods(uid), () => apiClient.getFoods(uid!), uid);
export const useExercises = (uid?: string) =>
  useArr(qk.exercises(uid), () => apiClient.getExercises(uid!), uid);
export const useBodyImages = (uid?: string) =>
  useArr(qk.bodyImages(uid), () => apiClient.getBodyProgressImages(uid!), uid);
export const useBadges = (uid?: string) => useArr(qk.badges(uid), () => apiClient.getBadges(uid!), uid);
export const useUserBadges = (uid?: string) =>
  useArr(qk.userBadges(uid), () => apiClient.getUserBadges(uid!), uid);

// Own profile (auth token identifies the user — no id needed).
export const useProfile = () => {
  const token = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: qk.profile(),
    queryFn: async () => {
      const d = await apiClient.getProfile().catch(() => null);
      return Array.isArray(d) ? d[0] ?? null : d;
    },
    enabled: !!token,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    retry: 1,
  });
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// Get-or-create today's record, reusing the cached daily-records query.
export async function ensureTodayRecord(qc: QueryClient, uid: string) {
  const recs = await qc.query({
    queryKey: qk.dailyRecords(uid),
    queryFn: () => arr(apiClient.getDailyRecords(uid)),
    staleTime: STALE_TIME,
  });
  const rec = recs.find((r: any) => r.record_date === todayStr());
  if (rec?.id) return rec;
  const created = await apiClient.createDailyRecord({
    user_id: uid,
    record_date: todayStr(),
    calories_consumed: 0,
    calories_burned: 0,
    water_ml: 0,
    steps: 0,
  });
  qc.invalidateQueries({ queryKey: qk.dailyRecords(uid) });
  return created;
}

// Call after any daily-log write so every screen showing that data refreshes.
export function useInvalidateDaily() {
  const qc = useQueryClient();
  return (uid: string) => {
    qc.invalidateQueries({ queryKey: qk.dailyRecords(uid) });
    qc.invalidateQueries({ queryKey: qk.dailyFoods(uid) });
    qc.invalidateQueries({ queryKey: qk.dailyExercises(uid) });
    qc.invalidateQueries({ queryKey: qk.water(uid) });
    qc.invalidateQueries({ queryKey: qk.bodyImages(uid) });
  };
}
