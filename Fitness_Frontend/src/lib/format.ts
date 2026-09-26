// Full years between a YYYY-MM-DD date and today. Mirrors the backend
// ageFromDob so displayed ages never go stale — DOB is stored, age derives.
export function ageFromDob(dob?: string | null): number | null {
  if (!dob) return null;
  const b = new Date(dob.length <= 10 ? dob + 'T00:00:00' : dob);
  if (isNaN(b.getTime())) return null;
  const n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  const m = n.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && n.getDate() < b.getDate())) a--;
  return a < 0 || a > 120 ? null : a;
}

// Thousand-separated integers for calorie/stat displays ("2,450 kcal").
export function fmtInt(v: number | string | null | undefined): string {
  const n = typeof v === 'string' ? Number(v) : v;
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  return Math.round(n).toLocaleString('en-US');
}

// A profile counts as onboarded once the fields the app depends on
// (targets, BMR/TDEE, dashboard stats) are all filled. Age may come from
// dob (preferred) or the legacy age column.
export function isProfileComplete(p: {
  age?: number | null;
  dob?: string | null;
  height?: number | string | null;
  weight?: number | string | null;
  gender?: string | null;
  activity_level?: string | null;
} | null | undefined): boolean {
  const hasAge =
    (p?.dob ? ageFromDob(p.dob) !== null : false) || typeof p?.age === 'number';
  const filled = (v: unknown) => v !== null && v !== undefined && v !== '';
  return !!p && hasAge && filled(p.height) && filled(p.weight) && !!p.gender && !!p.activity_level;
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
