export type VerdictTone = 'green' | 'amber' | 'red' | 'slate';

export type DailyRow = {
  id?: string;
  date: string;
  consumed: number;
  burned: number;
  net: number;
  water: number;
  steps: number;
  notes: string;
  target: number;
  goalType: string;
  verdict: { label: string; tone: VerdictTone };
};

export const verdictClass: Record<VerdictTone, string> = {
  green: 'bg-green-600/20 text-green-300 border-green-500/30',
  amber: 'bg-amber-600/20 text-amber-300 border-amber-500/30',
  red: 'bg-red-600/20 text-red-300 border-red-500/30',
  slate: 'bg-slate-800 text-slate-400 border-slate-700',
};

export function dateKey(value: string) {
  return String(value || '').slice(0, 10);
}

export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function formatDay(date: string, opts?: Intl.DateTimeFormatOptions) {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, opts);
}

export function goalForDate(goals: any[], date: string) {
  const t = new Date(`${date}T12:00:00`).getTime();
  if (!Number.isFinite(t)) return goals.find((g: any) => g.status === 'active') || null;
  const sorted = [...goals].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  let match = null;
  for (const g of sorted) {
    if (new Date(g.created_at).getTime() <= t) match = g;
  }
  return match || goals.find((g: any) => g.status === 'active') || null;
}

export function calorieVerdict(consumed: number, target: number) {
  if (!target) return { label: 'No target', tone: 'slate' as const };
  const pct = consumed / target;
  if (pct >= 0.9 && pct <= 1.1) return { label: 'On target', tone: 'green' as const };
  if (pct < 0.9) return { label: 'Under', tone: 'amber' as const };
  return { label: 'Over', tone: 'red' as const };
}

export function enrichDailyRecord(r: any, goals: any[]): DailyRow {
  const date = dateKey(r.record_date || r.date);
  const consumed = Number(r.calories_consumed ?? r.consumed) || 0;
  const burned = Number(r.calories_burned ?? r.burned) || 0;
  const goal = goalForDate(goals, date);
  const target = Number(goal?.target_calories ?? goal?.target_value) || 0;
  return {
    id: r.id,
    date,
    consumed,
    burned,
    net: consumed - burned,
    water: Number(r.water_ml ?? r.water) || 0,
    steps: Number(r.steps) || 0,
    notes: r.notes ? String(r.notes) : '',
    target,
    goalType: goal?.goal_type ? String(goal.goal_type).replace(/_/g, ' ') : '—',
    verdict: calorieVerdict(consumed, target),
  };
}

export function enrichDailyRecords(records: any[], goals: any[]): DailyRow[] {
  return [...records]
    .map((r) => enrichDailyRecord(r, goals))
    .filter((r) => r.date)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function emptyDayRow(date: string, goals: any[]): DailyRow {
  const goal = goalForDate(goals, date);
  const target = Number(goal?.target_calories ?? goal?.target_value) || 0;
  return {
    date,
    consumed: 0,
    burned: 0,
    net: 0,
    water: 0,
    steps: 0,
    notes: '',
    target,
    goalType: goal?.goal_type ? String(goal.goal_type).replace(/_/g, ' ') : '—',
    verdict: calorieVerdict(0, target),
  };
}
