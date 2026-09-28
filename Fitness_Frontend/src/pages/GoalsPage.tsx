import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Target,
  X,
  Calculator,
  Trash2,
  RotateCcw,
  Flag,
  CalendarDays,
  Plus,
  Dumbbell,
  GlassWater,
  Sandwich,
  Clock,
  CheckCircle2,
  Loader2,
  History,
} from "lucide-react";
import { PageHeader, EmptyState, Ring } from "../components/ui";
import DailyRecordModal from "../components/DailyRecordModal";
import Swal from "sweetalert2";
import { apiClient } from "../lib/api";
import { useAuthStore } from "../store/auth";
import { useQueryClient } from "@tanstack/react-query";
import { qk, useDailyExercises, useDailyFoods, useDailyRecords, useGoals } from "../lib/queries";
import { useProfile } from "../lib/queries";
import { ageFromDob, fmtInt } from "../lib/format";
import type { DailyRecord, DailyFoodRow, DailyExerciseRow, Goal } from "../lib/database";
import {
  calcBMR,
  calcTDEE,
  calcTarget,
  calcMacros,
  GOAL_GUIDANCE,
  GOAL_LABELS,
  type GoalType,
} from "../lib/theory";
import type { DailyRow } from "../lib/dailyHistory";

const CONFIRM_COLOR = "#65a30d";

const card = "rounded-2xl border border-panel-border bg-panel-card";
const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-brand-400 px-4 py-2 text-sm font-bold text-ink transition hover:bg-brand-300 disabled:opacity-50";
const btnGhost =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-panel-border px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/5 hover:text-white";
const inputCls =
  "w-full rounded-xl border border-panel-border bg-ink p-3 text-white focus:border-brand-500 focus:outline-none";

const ACTIVITY_LEVELS = [
  "sedentary",
  "lightly_active",
  "moderately_active",
  "very_active",
  "extremely_active",
] as const;
type ActivityLevel = (typeof ACTIVITY_LEVELS)[number];

type CalcInputs = {
  goal_type: GoalType;
  gender: string;
  weight_kg: number;
  height_cm: number;
  dob: string;
  age: number;
  activity_level: ActivityLevel;
  target_date: string;
};

function defaultTargetDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 84);
  return d.toISOString().slice(0, 10);
}

// Days left until the goal's target date. Null = no lock (no date or reached).
function targetDaysLeft(g: Goal | null | undefined): number | null {
  if (!g?.target_date) return null;
  const t = new Date(`${String(g.target_date).slice(0, 10)}T00:00:00`).getTime();
  if (!Number.isFinite(t)) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diff = Math.ceil((t - now.getTime()) / 86400000);
  return diff > 0 ? diff : null;
}

function toActivityLevel(v: unknown, fallback: ActivityLevel): ActivityLevel {
  return typeof v === "string" && (ACTIVITY_LEVELS as readonly string[]).includes(v)
    ? (v as ActivityLevel)
    : fallback;
}

function applyProfile(prev: CalcInputs, p: { gender?: string; weight?: number; height?: number; dob?: string; age?: number; activity_level?: string }): CalcInputs {
  return {
    ...prev,
    gender: p.gender || prev.gender,
    weight_kg: Number(p.weight) || prev.weight_kg,
    height_cm: Number(p.height) || prev.height_cm,
    dob: p.dob ? String(p.dob).slice(0, 10) : prev.dob,
    age: (p.dob ? ageFromDob(p.dob) : Number(p.age)) || prev.age,
    activity_level: toActivityLevel(p.activity_level, prev.activity_level),
  };
}

const pct = (value: number, target: number) =>
  target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;

const sumByDate = <T,>(rows: T[], dateOf: (r: T) => string, valueOf: (r: T) => number) => {
  const out = new Map<string, number>();
  for (const r of rows) {
    const d = dateOf(r);
    if (d) out.set(d, (out.get(d) || 0) + valueOf(r));
  }
  return out;
};

/* ---------------------------- small pieces ---------------------------- */

function MacroBar({
  label,
  value,
  target,
  tone,
}: {
  label: string;
  value: number;
  target: number;
  tone: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="flex items-center gap-2 text-slate-300">
          <span className={`h-2 w-2 rounded-full ${tone}`} />
          {label}
        </span>
        <span className="text-slate-500">
          <span className="font-semibold text-white">{Math.round(value)}</span> / {Math.round(target)} g
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct(value, target)}%` }} />
      </div>
    </div>
  );
}

function StatTile({ label, value, unit, dot }: { label: string; value: React.ReactNode; unit?: string; dot?: string }) {
  return (
    <div className="rounded-xl border border-panel-border bg-ink/60 p-4">
      <div className="mb-1 flex items-center gap-2 text-xs text-slate-500">
        {dot && <span className={`h-2 w-2 rounded-full ${dot}`} />}
        {label}
      </div>
      <div className="text-2xl font-extrabold text-white">
        {value}
        {unit && <span className="ml-1 text-sm font-medium text-slate-500">{unit}</span>}
      </div>
    </div>
  );
}

function QuickLog({ to, icon: Icon, label, hint }: { to: string; icon: typeof Sandwich; label: string; hint: string }) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 rounded-xl border border-panel-border bg-ink/60 p-3 transition hover:border-brand-500/50"
    >
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 text-slate-300 transition group-hover:text-brand-400">
        <Icon size={20} />
      </span>
      <span className="flex-1">
        <span className="block text-sm font-semibold text-white">{label}</span>
        <span className="block text-xs text-slate-500">{hint}</span>
      </span>
      <Plus size={16} className="text-slate-600 transition group-hover:text-brand-400" />
    </Link>
  );
}

function RecommendationList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-panel-border bg-ink/60 p-4">
      <div className="mb-2 text-xs font-semibold text-slate-400">{title}</div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item} className="border-l-2 border-brand-500/40 pl-3 text-xs leading-relaxed text-slate-300">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------ goal modal ------------------------------ */

function GoalModal({
  form,
  setForm,
  preview,
  isEditing,
  saving,
  onSave,
  onClose,
}: {
  form: CalcInputs;
  setForm: React.Dispatch<React.SetStateAction<CalcInputs>>;
  preview: { bmr: number; tdee: number; target: number; macros: { protein: number; fat: number; carbs: number } };
  isEditing: boolean;
  saving: boolean;
  onSave: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const set = <K extends keyof CalcInputs>(k: K, v: CalcInputs[K]) => setForm((f) => ({ ...f, [k]: v }));
  const derivedAge = form.dob ? ageFromDob(form.dob) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="goal-modal-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-panel-border bg-panel-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-3xl border-b border-panel-border bg-panel-card p-6">
          <h3 id="goal-modal-title" className="text-xl font-bold text-white">
            {isEditing ? "Change goal" : "Create your goal"}
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white" aria-label="Close">
            <X size={22} />
          </button>
        </div>

        <div className="space-y-6 p-6">
          <div>
            <label className="mb-3 block text-sm font-medium text-slate-300">What's your goal?</label>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
              {(Object.keys(GOAL_LABELS) as GoalType[]).map((gt) => (
                <button
                  key={gt}
                  type="button"
                  aria-pressed={form.goal_type === gt}
                  onClick={() => set("goal_type", gt)}
                  className={`rounded-xl border px-3 py-3 text-sm font-bold transition ${
                    form.goal_type === gt
                      ? "border-brand-400 bg-brand-400 text-ink"
                      : "border-panel-border bg-ink text-slate-300 hover:border-brand-500/50"
                  }`}
                >
                  {GOAL_LABELS[gt]}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-panel-border pt-4">
            <label className="mb-3 block text-sm font-medium text-slate-300">Your stats</label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs text-slate-500">Weight (kg)</span>
                <input type="number" min="30" max="300" step="0.1" value={form.weight_kg} onChange={(e) => set("weight_kg", Number(e.target.value))} className={inputCls} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-slate-500">Height (cm)</span>
                <input type="number" min="100" max="250" value={form.height_cm} onChange={(e) => set("height_cm", Number(e.target.value))} className={inputCls} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-slate-500">
                  Date of birth {derivedAge !== null && <span className="font-semibold text-brand-400">· Age {derivedAge}</span>}
                </span>
                <input
                  type="date"
                  value={form.dob}
                  onChange={(e) => {
                    const dob = e.target.value;
                    setForm((f) => ({ ...f, dob, age: ageFromDob(dob) ?? f.age }));
                  }}
                  className={inputCls}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-slate-500">Gender</span>
                <select value={form.gender} onChange={(e) => set("gender", e.target.value)} className={inputCls}>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </label>
              <label className="col-span-2 block">
                <span className="mb-1 block text-xs text-slate-500">Activity level</span>
                <select value={form.activity_level} onChange={(e) => set("activity_level", e.target.value as ActivityLevel)} className={inputCls}>
                  <option value="sedentary">Sedentary — little or no exercise (1.20x)</option>
                  <option value="lightly_active">Lightly active — 1–3 days/week (1.375x)</option>
                  <option value="moderately_active">Moderately active — 3–5 days/week (1.55x)</option>
                  <option value="very_active">Very active — 6–7 days/week (1.725x)</option>
                  <option value="extremely_active">Extremely active — hard training or physical job (1.90x)</option>
                </select>
              </label>
              <label className="col-span-2 block">
                <span className="mb-1 block text-xs text-slate-500">Target date — goal stays locked until then</span>
                <input
                  type="date"
                  value={form.target_date}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => set("target_date", e.target.value)}
                  className={inputCls}
                />
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-panel-border bg-ink/60 p-4">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-400">
              <Calculator size={14} /> Live preview
            </div>
            <div className="grid grid-cols-3 gap-3">
              <StatTile label="BMR" value={fmtInt(preview.bmr)} unit="kcal" />
              <StatTile label="TDEE" value={fmtInt(preview.tdee)} unit="kcal" />
              <div className="rounded-xl border border-brand-500/30 bg-brand-400/10 p-4">
                <div className="mb-1 text-xs text-brand-300">Target</div>
                <div className="text-2xl font-extrabold text-brand-400">
                  {fmtInt(preview.target)}
                  <span className="ml-1 text-sm font-medium text-brand-300/70">kcal</span>
                </div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-300">
              <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-protein" />Protein {fmtInt(preview.macros.protein)}g</span>
              <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-fat" />Fat {fmtInt(preview.macros.fat)}g</span>
              <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-carbs" />Carbs {fmtInt(preview.macros.carbs)}g</span>
            </div>
            <p className="mt-3 text-[11px] text-slate-500">Mifflin-St Jeor equation · {GOAL_LABELS[form.goal_type]} adjustment</p>
          </div>

          <div className="flex gap-3">
            <button onClick={onClose} className={`${btnGhost} flex-1 py-3`}>Cancel</button>
            <button onClick={onSave} disabled={saving} className={`${btnPrimary} flex-1 py-3`}>
              {saving ? (
                <><Loader2 size={16} className="animate-spin" /> Saving…</>
              ) : (
                <><CheckCircle2 size={16} /> {isEditing ? "Update goal" : "Create goal"}</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------- page --------------------------------- */

export default function GoalsPage() {
  const { user } = useAuthStore();
  const uid = user?.id;
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedRow, setSelectedRow] = useState<DailyRow | null>(null);
  const [form, setForm] = useState<CalcInputs>({
    goal_type: "weight_loss",
    gender: user?.gender || "male",
    weight_kg: user?.weight_kg ? Number(user.weight_kg) : 0,
    height_cm: user?.height_cm ? Number(user.height_cm) : 0,
    dob: "",
    age: user?.age || 0,
    activity_level: toActivityLevel(user?.activity_level, "moderately_active"),
    target_date: defaultTargetDate(),
  });

  const profileQ = useProfile();
  const prefilledRef = useRef<string | null>(null);
  useEffect(() => {
    const p = profileQ.data;
    if (!p || prefilledRef.current === p.id || showModal) return;
    prefilledRef.current = p.id;
    setForm((prev) => applyProfile(prev, p));
  }, [profileQ.data, showModal]);

  const bmr = Math.round(calcBMR(form.gender, Number(form.weight_kg) || 0, Number(form.height_cm) || 0, Number(form.age) || 0));
  const tdee = Math.round(calcTDEE(bmr, form.activity_level));
  const target = Math.round(calcTarget(tdee, form.goal_type));
  const macros = calcMacros(target, Number(form.weight_kg) || 0);

  const goalsQ = useGoals(uid);
  const recordsQ = useDailyRecords(uid);
  const foodsQ = useDailyFoods(uid);
  const exercisesQ = useDailyExercises(uid);
  const loading = goalsQ.isLoading || recordsQ.isLoading || foodsQ.isLoading || exercisesQ.isLoading;

  const { goals, records, activeGoal, todayMacros } = useMemo(() => {
    try {
      const allGoals: Goal[] = goalsQ.data ?? [];
      const recs: DailyRecord[] = recordsQ.data ?? [];
      const foodLogs: DailyFoodRow[] = foodsQ.data ?? [];
      const exerciseLogs: DailyExerciseRow[] = exercisesQ.data ?? [];
      const recordsById = new Map(
        (Array.isArray(recs) ? recs : []).map((record: DailyRecord) => [
          String(record.id),
          record.record_date,
        ]),
      );
      const foodTotals = new Map<string, number>();
      const exerciseTotals = new Map<string, number>();
      const proteinTotals = new Map<string, number>();
      const fatTotals = new Map<string, number>();
      const carbTotals = new Map<string, number>();

      (Array.isArray(foodLogs) ? foodLogs : []).forEach((food: DailyFoodRow) => {
        const date = String(
          recordsById.get(String(food.daily_record_id)) ||
            food.record_date ||
            food.created_at ||
            "",
        ).slice(0, 10);
        if (date) {
          foodTotals.set(date, (foodTotals.get(date) || 0) + (Number(food.calories) || 0));
          proteinTotals.set(date, (proteinTotals.get(date) || 0) + (Number(food.protein) || 0));
          fatTotals.set(date, (fatTotals.get(date) || 0) + (Number(food.fat) || 0));
          carbTotals.set(date, (carbTotals.get(date) || 0) + (Number(food.carbohydrates) || 0));
        }
      });
      (Array.isArray(exerciseLogs) ? exerciseLogs : []).forEach((exercise: DailyExerciseRow) => {
        const date = String(
          recordsById.get(String(exercise.daily_record_id)) ||
            exercise.record_date ||
            exercise.created_at ||
            "",
        ).slice(0, 10);
        if (date)
          exerciseTotals.set(date, (exerciseTotals.get(date) || 0) + (Number(exercise.calories_burned) || 0));
      });
      const mergedRecords = recs.map((record: DailyRecord) => ({
        ...record,
        calories_consumed: Math.max(Number(record.calories_consumed) || 0, foodTotals.get(String(record.record_date)) || 0),
        calories_burned: Math.max(Number(record.calories_burned) || 0, exerciseTotals.get(String(record.record_date)) || 0),
      }));
      const activeGoal = allGoals.find((g: Goal) => g.status === "active") || null;
      const today = new Date().toISOString().slice(0, 10);
      return {
        goals: allGoals,
        records: mergedRecords,
        activeGoal,
        todayMacros: {
          protein: proteinTotals.get(today) || 0,
          fat: fatTotals.get(today) || 0,
          carbs: carbTotals.get(today) || 0,
        },
      };
    } catch {
      return { goals: [], records: [], activeGoal: null, todayMacros: { protein: 0, fat: 0, carbs: 0 } };
    }
  }, [goalsQ.data, recordsQ.data, foodsQ.data, exercisesQ.data]);

  useEffect(() => {
    if (!loading && goals.length === 0 && user?.id && !prefilledRef.current) {
      prefilledRef.current = true;
      setShowModal(true);
    }
  }, [loading, goals.length, user?.id]);

  async function handleSave() {
    if (!user?.id) return;
    if (rejectLockedGoal() && !forceWipe) return;
    if (!form.target_date) {
      Swal.fire({
        icon: "error",
        title: "Target date required",
        text: "Pick a target date for the new goal.",
        confirmButtonColor: CONFIRM_COLOR,
      });
      return;
    }
    // Early-change override: second explicit confirm before wiping.
    if (forceWipe) {
      const wipe = await Swal.fire({
        icon: "warning",
        title: "Wipe history & progress?",
        html: `<div style="text-align:left;font-size:13px;line-height:1.8;">This permanently deletes:<br>· All daily logs (food, workouts)<br>· Water, weight & photo records<br>· All goals (active + history)<br><br>Profile, foods and badges stay.</div>`,
        showCancelButton: true,
        confirmButtonText: "Wipe everything & start new",
        cancelButtonText: "Cancel",
        confirmButtonColor: "#ef4444",
        cancelButtonColor: "#64748b",
      });
      if (!wipe.isConfirmed) return;
    }
    setSaving(true);
    try {
      if (activeGoal && !forceWipe) {
        const currentRecord = [
          `<b class="capitalize">${String(activeGoal.goal_type).replace(/_/g, " ")}</b>`,
          `Target ${fmtInt(activeGoal.target_calories ?? activeGoal.target_value)} kcal/day`,
          `P ${fmtInt(activeGoal.protein_target)}g · F ${fmtInt(activeGoal.fat_target)}g · C ${fmtInt(activeGoal.carb_target)}g`,
          `Started ${new Date(activeGoal.created_at).toLocaleDateString()}`,
        ].join("<br>");
        const confirmation = await Swal.fire({
          icon: "question",
          title: "Change goal? Current record will be completed",
          html: `<div style="text-align:left;font-size:13px;line-height:1.8;">Current goal record:<br>${currentRecord}<br><br>This marks it <b>completed</b> and keeps it in history. Old days stay linked to it with their targets.</div>`,
          showCancelButton: true,
          confirmButtonText: "Complete and start new",
          cancelButtonText: "Keep current goal",
          confirmButtonColor: CONFIRM_COLOR,
          cancelButtonColor: "#64748b",
        });
        if (!confirmation.isConfirmed) return;
      }
      const bmrRes = await apiClient.calcBMR({
        gender: form.gender,
        weight_kg: Number(form.weight_kg),
        height_cm: Number(form.height_cm),
        age: Number(form.age),
      });
      const tdeeRes = await apiClient.calcTDEE({ bmr: bmrRes.bmr, activity_level: form.activity_level });
      const targetRes = await apiClient.calcCalorieTarget({ tdee: tdeeRes.tdee, goal_type: form.goal_type });
      const finalTarget = Math.round(targetRes.targetCalories ?? target);
      const finalMacros = calcMacros(finalTarget, Number(form.weight_kg) || 0);
      if (forceWipe) {
        // Override flow: wipe history + progress, goals included.
        await apiClient.resetProgress({ user_id: user.id });
      } else if (activeGoal) {
        // Status lifecycle: complete the current goal (kept in history),
        // then create the new active goal.
        await apiClient.updateGoal(activeGoal.id, { status: "completed" });
      }
      await apiClient.createGoal({
        user_id: user.id,
        goal_type: form.goal_type,
        target_value: finalTarget,
        target_calories: finalTarget,
        protein_target: finalMacros.protein,
        fat_target: finalMacros.fat,
        carb_target: finalMacros.carbs,
        target_date: form.target_date,
        status: "active",
      });
      invalidateGoalCaches(user.id);
      setShowModal(false);
      setForceWipe(false);
      Swal.fire({
        icon: "success",
        title: forceWipe ? "Fresh start" : activeGoal ? "Goal replaced" : "Goal created",
        text: forceWipe
          ? "History & progress wiped. Your new goal is active."
          : activeGoal
            ? "Your previous goal was completed and kept in history. The new one is active."
            : "Your fitness goal is now active.",
        confirmButtonColor: CONFIRM_COLOR,
        timer: 2000,
        timerProgressBar: true,
      });
    } catch (e: unknown) {
      if (user?.id) invalidateGoalCaches(user.id);
      Swal.fire({
        icon: "error",
        title: "Couldn't save goal",
        text: (e instanceof Error ? e.message : null) || "Something went wrong. Please try again.",
        confirmButtonColor: CONFIRM_COLOR,
      });
    } finally {
      setSaving(false);
    }
  }

  function rejectLockedGoal(): boolean {
    const daysLeft = targetDaysLeft(activeGoal);
    if (daysLeft === null) return false;
    Swal.fire({
      icon: "error",
      title: "Goal change rejected",
      html: `<div style="text-align:left;font-size:13px;line-height:1.8;">Target date not reached yet — <b>${daysLeft} day${daysLeft === 1 ? "" : "s"} left</b> until ${activeGoal?.target_date ? new Date(`${String(activeGoal.target_date).slice(0, 10)}T12:00:00`).toLocaleDateString() : ""}.<br><br>Stay consistent with your current goal. You can change it once the target date arrives.</div>`,
      confirmButtonColor: CONFIRM_COLOR,
    });
    return true;
  }

  // Locked-goal override: returns true when the user insists on changing
  // early (history + progress will be wiped on save).
  const [forceWipe, setForceWipe] = useState(false);
  async function confirmLockedOverride(daysLeft: number): Promise<boolean> {
    const choice = await Swal.fire({
      icon: "warning",
      title: "Target date not reached",
      html: `<div style="text-align:left;font-size:13px;line-height:1.8;">Still <b>${daysLeft} day${daysLeft === 1 ? "" : "s"} left</b> until the target date.<br><br>Changing now <b>wipes all history & progress records</b> (daily logs, water, weights, photos, goals) and starts clean.</div>`,
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: "Keep current goal",
      denyButtonText: "Change anyway + wipe",
      confirmButtonColor: CONFIRM_COLOR,
      denyButtonColor: "#ef4444",
    });
    return choice.isDenied;
  }

  function invalidateGoalCaches(uid: string) {
    qc.invalidateQueries({ queryKey: qk.goals(uid) });
    qc.invalidateQueries({ queryKey: qk.burnTarget(uid) });
    qc.invalidateQueries({ queryKey: qk.dailyRecords(uid) });
    qc.invalidateQueries({ queryKey: qk.dailyFoods(uid) });
    qc.invalidateQueries({ queryKey: qk.dailyExercises(uid) });
    qc.invalidateQueries({ queryKey: qk.water(uid) });
    qc.invalidateQueries({ queryKey: qk.weights(uid) });
    qc.invalidateQueries({ queryKey: qk.bodyImages(uid) });
  }

  async function openGoalModal() {
    const daysLeft = targetDaysLeft(activeGoal);
    if (daysLeft !== null) {
      if (!(await confirmLockedOverride(daysLeft))) return;
      setForceWipe(true);
    }
    setForm((prev) => {
      let next = prev;
      if (activeGoal) {
        next = { ...next, goal_type: activeGoal.goal_type as GoalType };
        next = { ...next, target_date: activeGoal.target_date ? String(activeGoal.target_date).slice(0, 10) : defaultTargetDate() };
      }
      if (profileQ.data) next = applyProfile(next, profileQ.data);
      return next;
    });
    setShowModal(true);
  }

  async function handleDeleteGoal(goalId: string) {
    const result = await Swal.fire({
      icon: "warning",
      title: "Delete goal?",
      text: "This permanently removes the goal from your history.",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
    });
    if (!result.isConfirmed || !uid) return;
    try {
      await apiClient.deleteGoal(goalId);
      qc.invalidateQueries({ queryKey: qk.goals(uid) });
      Swal.fire({ icon: "success", title: "Deleted", timer: 1500, timerProgressBar: true });
    } catch {
      Swal.fire({ icon: "error", title: "Couldn't delete goal", text: "Please try again." });
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <Loader2 className="mx-auto mb-4 animate-spin text-brand-400" size={36} />
        <p className="text-slate-400">Loading your goals…</p>
      </div>
    );
  }

  const isNewUser = !activeGoal && goals.length === 0;
  const guidance = activeGoal ? GOAL_GUIDANCE[activeGoal.goal_type as GoalType] : null;
  const calTarget = activeGoal?.target_calories || activeGoal?.target_value || 0;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">
      <PageHeader
        title="Goals"
        subtitle={isNewUser ? "Set your first goal to get calorie and macro targets." : "One active goal at a time. History stays below."}
        icon={Target}
        action={
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/history")} className={btnGhost}>
              <History size={16} /> History
            </button>
            {activeGoal ? (
              <button onClick={openGoalModal} className={btnPrimary}>
                <RotateCcw size={16} /> Change goal
              </button>
            ) : (
              <button onClick={() => setShowModal(true)} className={btnPrimary}>
                <Target size={16} /> Create goal
              </button>
            )}
          </div>
        }
      />

      {/* ===== ACTIVE GOAL ===== */}
      {activeGoal ? (
        <section className={`${card} space-y-6 p-6 md:p-8`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="rounded-2xl bg-brand-400/10 p-3 text-brand-400">
                <Flag size={26} />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-extrabold capitalize text-white">
                    {String(activeGoal.goal_type).replace(/_/g, " ")}
                  </h2>
                  <span className="rounded-full bg-brand-400/15 text-brand-300 px-2.5 py-0.5 text-xs font-bold">Active</span>
                  {targetDaysLeft(activeGoal) !== null ? (
                    <span className="rounded-full bg-amber-400/15 text-amber-300 px-2.5 py-0.5 text-xs font-bold">
                      Locked · {targetDaysLeft(activeGoal)}d left
                    </span>
                  ) : (
                    activeGoal.target_date && (
                      <span className="rounded-full bg-sky-400/15 text-sky-300 px-2.5 py-0.5 text-xs font-bold">
                        Target reached · can change
                      </span>
                    )
                  )}
                </div>
                <p className="mt-1 text-sm text-slate-400">
                  Started {new Date(activeGoal.created_at).toLocaleDateString()}
                  {activeGoal.target_date && ` · Target ${new Date(activeGoal.target_date).toLocaleDateString()}`}
                </p>
              </div>
            </div>
            <button
              onClick={() => handleDeleteGoal(activeGoal.id)}
              className="rounded-xl p-2 text-slate-500 transition hover:bg-red-500/10 hover:text-red-400"
              title="Delete goal"
              aria-label="Delete goal"
            >
              <Trash2 size={18} />
            </button>
          </div>

          {/* Targets */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatTile label="Daily calories" value={fmtInt(activeGoal.target_calories) ?? activeGoal.target_value ?? "—"} unit="kcal" />
            <StatTile label="Protein" value={fmtInt(activeGoal.protein_target ?? 0)} unit="g" dot="bg-protein" />
            <StatTile label="Fat" value={fmtInt(activeGoal.fat_target ?? 0)} unit="g" dot="bg-fat" />
            <StatTile label="Carbs" value={fmtInt(activeGoal.carb_target ?? 0)} unit="g" dot="bg-carbs" />
          </div>

          {/* Today */}
          <div className="border-t border-panel-border pt-6">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-bold text-white">
                <CalendarDays size={18} className="text-slate-400" /> Today
              </h3>
              <button onClick={() => setShowModal(true)} className={btnPrimary}>
                <Plus size={16} /> Add log
              </button>
            </div>

            <div className="grid items-center gap-6 md:grid-cols-[auto_1fr]">
              <div className="flex flex-col items-center gap-2">
                <Ring percent={pct(calTarget > 0 ? 0 : 0, calTarget) || 0} size={112}>
                  <div className="text-center">
                    <div className="text-xl font-bold text-white">0</div>
                    <div className="text-xs text-slate-500">kcal</div>
                  </div>
                </Ring>
                <div className="text-xs text-slate-400">
                  0% of {fmtInt(calTarget)}
                </div>
              </div>
              <div className="space-y-4">
                <MacroBar label="Protein" value={todayMacros.protein} target={activeGoal.protein_target || 0} tone="bg-protein" />
                <MacroBar label="Fat" value={todayMacros.fat} target={activeGoal.fat_target || 0} tone="bg-fat" />
                <MacroBar label="Carbs" value={todayMacros.carbs} target={activeGoal.carb_target || 0} tone="bg-carbs" />
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
              <QuickLog to="/daily" icon={Sandwich} label="Food" hint="Log meal" />
              <QuickLog to="/daily" icon={Dumbbell} label="Exercise" hint="Log workout" />
              <QuickLog to="/daily" icon={GlassWater} label="Water" hint="Add glasses" />
              <QuickLog to="/daily" icon={Clock} label="Weight" hint="Log weight" />
            </div>
          </div>

          {/* Guidance */}
          {guidance && (
            <div className="border-t border-panel-border pt-6">
              <h3 className="mb-1 text-sm font-bold text-white">Recommended plan</h3>
              <p className="mb-3 text-sm text-slate-400">{guidance.summary}</p>
              <div className="grid gap-3 md:grid-cols-3">
                {(guidance.plan || []).map((step) => (
                  <div key={step} className="rounded-xl border border-panel-border bg-ink/60 p-3 text-xs text-slate-300">
                    {step}
                  </div>
                ))}
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <RecommendationList title="Recommended food and nutrition" items={guidance.food || []} />
                <RecommendationList title="Recommended exercise routine" items={guidance.exercise || []} />
              </div>
              <p className="mt-3 text-[11px] text-slate-500">
                Practical starting suggestions, not medical advice. A qualified trainer or registered dietitian can personalize them.
              </p>
            </div>
          )}
        </section>
      ) : (
        <section className={`${card} p-8 text-center md:p-10`}>
          <Target className="mx-auto mb-4 text-brand-400" size={40} />
          <h3 className="mb-2 text-2xl font-bold text-white">Set your first goal</h3>
          <p className="mx-auto mb-6 max-w-md text-slate-400 text-sm">
            We'll calculate your BMR, TDEE and daily macro targets from your profile. It takes under a minute.
          </p>
          <button onClick={() => setShowModal(true)} className={`${btnPrimary} px-8 py-3 text-base`}>
            <Target size={18} /> Create my first goal
          </button>
        </section>
      )}

      {/* ===== HOW IT WORKS ===== */}
      <section className={card}>
        <h4 className="mb-4 flex items-center gap-2 text-lg font-bold text-white">
          <Calculator size={18} className="text-slate-400" /> How it works
        </h4>
        <ol className="grid gap-3 text-sm md:grid-cols-4">
          {[
            ["BMR", "Basal metabolic rate", "Mifflin-St Jeor: weight, height, age, gender"],
            ["TDEE", "Total daily energy expenditure", "BMR × activity multiplier (1.2–1.9)"],
            ["Calorie target", "Adjusted for your goal", "TDEE plus or minus a deficit or surplus"],
            ["Macros", "Protein, fat, carbs", "Protein 1.6–2.2 g/kg, fat 25–30%, rest carbs"],
          ].map(([title, sub, body]) => (
            <li key={title} className="rounded-xl border border-panel-border bg-ink/50 p-4">
              <div className="font-semibold text-white">{title}</div>
              <div className="text-xs text-slate-400">{sub}</div>
              <p className="mt-1 text-[11px] text-slate-500">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      {showModal && (
        <GoalModal
          form={form}
          setForm={setForm}
          preview={{ bmr, tdee, target, macros }}
          isEditing={!!activeGoal}
          saving={saving}
          onSave={handleSave}
          onClose={() => {
            setShowModal(false);
            setForceWipe(false);
          }}
        />
      )}

      {selectedRow && <DailyRecordModal row={selectedRow} userId={user?.id} onClose={() => setSelectedRow(null)} />}
    </div>
  );
}
