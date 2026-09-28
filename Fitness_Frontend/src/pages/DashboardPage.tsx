import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Flame,
  Droplets,
  Footprints,
  Dumbbell,
  Play,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Trophy,
  Scale,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Utensils,
  TrendingUp,
} from 'lucide-react';
import { useAuthStore } from '../store/auth';
import { fmtInt } from '../lib/format';
import {
  useDailyExercises,
  useDailyFoods,
  useDailyRecords,
  useFoods,
  useGoals,
  useWaterIntake,
  useWeightHistory,
  useInvalidateDaily,
  useBurnTarget,
  ensureTodayRecord,
} from '../lib/queries';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import QuickLogModal from '../components/QuickLogModal';
import WorkoutModal from '../components/WorkoutModal';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const uid = user?.id;
  const qc = useQueryClient();
  const invalidateDaily = useInvalidateDaily();

  // Modals state
  const [quickLogOpen, setQuickLogOpen] = useState(false);
  const [quickLogTab, setQuickLogTab] = useState<'food' | 'workout' | 'water' | 'steps' | 'weight'>('food');
  const [workoutModalOpen, setWorkoutModalOpen] = useState(false);
  const [quickMealInput, setQuickMealInput] = useState('');
  const [addingMeal, setAddingMeal] = useState(false);

  // Queries
  const goalsQ = useGoals(uid);
  const recordsQ = useDailyRecords(uid);
  const foodsQ = useDailyFoods(uid);
  const exercisesQ = useDailyExercises(uid);
  const waterQ = useWaterIntake(uid);
  const weightsQ = useWeightHistory(uid);
  const burnTargetQ = useBurnTarget(uid);
  // User's own food catalog for resolving log-row names (shared cache).
  const foodsCatalogQ = useFoods(uid);

  const loading =
    goalsQ.isLoading ||
    recordsQ.isLoading ||
    foodsQ.isLoading ||
    exercisesQ.isLoading ||
    waterQ.isLoading ||
    weightsQ.isLoading;

  const {
    steps,
    goalCalories,
    proteinTarget,
    fatTarget,
    carbTarget,
    goalType,
    consumed,
    burned,
    burnTarget,
    protein,
    fat,
    carbs,
    water,
    streak,
    weekDays,
    weekBurn,
    weekTotal,
    weekDelta,
    latestWeight,
    targetWeight,
    todayFoodsList,
  } = useMemo(() => {
    const today = todayStr();
    const recs = recordsQ.data ?? [];
    const todayRec = recs.find((r) => r.record_date === today);

    const gList = goalsQ.data ?? [];
    const active = gList.find((g) => g.status === 'active');

    const foodList = foodsQ.data ?? [];
    const todayFoods = foodList.filter((f) => {
      const d = f.record_date || String(f.created_at || '').slice(0, 10);
      return d === today || (todayRec && f.daily_record_id === todayRec.id);
    });

    const exList = exercisesQ.data ?? [];
    const todayEx = exList.filter((e) => {
      const d = e.record_date || String(e.created_at || '').slice(0, 10);
      return d === today || (todayRec && e.daily_record_id === todayRec.id);
    });

    const wList = waterQ.data ?? [];
    const todayWater = wList.filter(
      (w) => String(w.recorded_at || w.created_at || '').slice(0, 10) === today,
    );
    const waterSum = todayWater.reduce(
      (s: number, w) => s + (Number(w.amount_ml) || 0),
      0,
    );

    const dates = new Set(recs.map((r) => r.record_date).filter(Boolean));
    const recordIdToDate = new Map(recs.map((r) => [String(r.id), r.record_date]));
    const logDate = (x: { record_date?: string; daily_record_id?: string; created_at?: string }) =>
      String(x.record_date || recordIdToDate.get(String(x.daily_record_id)) || x.created_at || '').slice(0, 10);

    // Any day with a record, food/exercise log, or water counts as active.
    const activityDates = new Set(dates);
    for (const f of foodList) {
      const d = logDate(f);
      if (d) activityDates.add(d);
    }
    for (const e of exList) {
      const d = logDate(e);
      if (d) activityDates.add(d);
    }
    for (const w of wList) {
      const d = String(w.recorded_at || w.created_at || '').slice(0, 10);
      if (d) activityDates.add(d);
    }
    let s = 0;
    const d = new Date();
    for (let i = 0; i < 60; i++) {
      const key = d.toISOString().slice(0, 10);
      if (activityDates.has(key)) {
        s++;
        d.setDate(d.getDate() - 1);
      } else break;
    }

    // Last 7 days (oldest → today): hits + burned kcal per day.
    const weekDays: { key: string; label: string; hit: boolean }[] = [];
    const weekBurn: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const dt = new Date();
      dt.setDate(dt.getDate() - i);
      const key = dt.toISOString().slice(0, 10);
      weekDays.push({ key, label: 'SMTWTFS'[dt.getDay()], hit: activityDates.has(key) });
      weekBurn.push(0);
    }
    const weekIndex = new Map(weekDays.map((w, i) => [w.key, i]));
    for (const e of exList) {
      const idx = weekIndex.get(logDate(e));
      if (idx !== undefined) weekBurn[idx] += Number(e.calories_burned) || 0;
    }
    // Previous 7 days total for the week-over-week delta.
    const prevKeys = new Set<string>();
    for (let i = 7; i < 14; i++) {
      const dt = new Date();
      dt.setDate(dt.getDate() - i);
      prevKeys.add(dt.toISOString().slice(0, 10));
    }
    let prevBurn = 0;
    for (const e of exList) {
      if (prevKeys.has(logDate(e))) prevBurn += Number(e.calories_burned) || 0;
    }
    const weekTotal = weekBurn.reduce((a, v) => a + v, 0);
    const weekDelta = prevBurn > 0 ? Math.round(((weekTotal - prevBurn) / prevBurn) * 100) : weekTotal > 0 ? 100 : 0;

    const wHist = weightsQ.data ?? [];
    const latest = wHist.length
      ? [...wHist].sort(
          (a, b) =>
            new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime(),
        )[0]
      : null;

    const c = todayFoods.reduce((sum: number, f) => sum + (Number(f.calories) || 0), 0);
    const b = todayEx.reduce((sum: number, e) => sum + (Number(e.calories_burned) || 0), 0);

    const burnTarget = burnTargetQ.data;

    const foodNames = new Map((foodsCatalogQ.data ?? []).map((f) => [String(f.id), f.name]));

    return {
      steps: Number(todayRec?.steps) || 0,
      goalCalories: active
        ? Number(active.target_calories ?? active.target_value) || 0
        : 0,
      proteinTarget: active ? Number(active.protein_target) || 0 : 0,
      fatTarget: active ? Number(active.fat_target) || 0 : 0,
      carbTarget: active ? Number(active.carb_target) || 0 : 0,
      goalType: active
        ? String(active.goal_type || '').replace(/_/g, ' ')
        : '',
      consumed: c,
      burned: b,
      burnTarget,
      protein: todayFoods.reduce((sum: number, f) => sum + (Number(f.protein) || 0), 0),
      fat: todayFoods.reduce((sum: number, f) => sum + (Number(f.fat) || 0), 0),
      carbs: todayFoods.reduce((sum: number, f) => sum + (Number(f.carbohydrates) || 0), 0),
      water: waterSum || Number(todayRec?.water_ml) || 0,
      streak: s,
      weekDays,
      weekBurn,
      weekTotal,
      weekDelta,
      latestWeight: latest ? Number(latest.weight) : 0,
      targetWeight: active?.target_value ? Number(active.target_value) : 0,
      todayFoodsList: todayFoods.map((f) => ({
        ...f,
        food_name: foodNames.get(String(f.food_id)) || f.food_name || f.meal_type || 'Meal',
      })),
    };
  }, [
    recordsQ.data,
    goalsQ.data,
    foodsQ.data,
    exercisesQ.data,
    waterQ.data,
    weightsQ.data,
    foodsCatalogQ.data,
    burnTargetQ.data,
    user?.weight_kg,
  ]);

  if (loading && !recordsQ.data && !goalsQ.data) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-slate-400">
        <div className="w-10 h-10 rounded-full border-2 border-brand-400 border-t-transparent animate-spin" />
        <p className="text-xs font-bold  text-slate-400">Loading your performance metrics…</p>
      </div>
    );
  }

  // Derived display values matching Figma default state
  const displayConsumed = consumed;
  const displayBurned = burned;
  const displayGoal = goalCalories;
  const displayRemaining = Math.max(0, displayGoal - displayConsumed);
  const displayNet = displayConsumed - displayBurned;
  const caloriePct = displayGoal > 0 ? Math.min(100, Math.round((displayConsumed / displayGoal) * 100)) : 0;

  const displaySteps = steps;
  const STEPS_GOAL = 10000;
  const stepsRemaining = Math.max(0, STEPS_GOAL - displaySteps);
  const stepsPct = Math.min(100, Math.round((displaySteps / STEPS_GOAL) * 100));

  const displayWater = water;
  const WATER_GOAL = 3000;
  const waterPct = Math.min(100, Math.round((displayWater / WATER_GOAL) * 100));

  const displayProtein = protein;
  const displayCarbs = carbs;
  const displayFat = fat;
  const macroPct = Math.round(
    (((displayProtein / proteinTarget) + (displayCarbs / carbTarget) + (displayFat / fatTarget)) / 3) * 100
  ) || 0;

  const displayStreak = streak;
  const weekHits = weekDays.filter((w) => w.hit).length;
  const weekMax = Math.max(...weekBurn, 1);
  const currentWeight = latestWeight || user?.weight_kg || 0;
  const goalWeight = targetWeight || 0;
  const weightChange = (currentWeight - goalWeight).toFixed(1);

  // User presentation
  const rawName = user?.name || user?.email?.split('@')[0] || '';
  const firstName = rawName.split(' ')[0] || '';
  const now = new Date();
  const dayName = now.toLocaleDateString(undefined, { weekday: 'long' });
  const dateFormatted = now
    .toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });

  // Quick instant actions
  const handleQuickAddWater = async () => {
    if (!uid) return;
    try {
      await apiClient.createWaterIntake({ user_id: uid, amount_ml: 250 });
      invalidateDaily(uid);
    } catch {
      // fallback
    }
  };

  const handleQuickAddSteps = async () => {
    if (!uid) return;
    try {
      const todayRec = await ensureTodayRecord(qc, uid);
      const curr = Number(todayRec?.steps) || 0;
      if (todayRec?.id) {
        await apiClient.updateDailyRecord(todayRec.id, { steps: curr + 1000 });
      }
      invalidateDaily(uid);
    } catch {
      // fallback
    }
  };

  const handleInlineMealAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid || !quickMealInput.trim()) return;
    setAddingMeal(true);
    try {
      const todayRec = await ensureTodayRecord(qc, uid);
      await apiClient.createDailyFood({
        user_id: uid,
        daily_record_id: todayRec?.id,
        food_name: quickMealInput.trim(),
        meal_type: 'Snack',
        calories: 250,
        protein: 15,
        carbohydrates: 25,
        fat: 8,
        serving_size: '1 serving',
      });
      invalidateDaily(uid);
      setQuickMealInput('');
    } catch {
      alert('Could not add meal');
    } finally {
      setAddingMeal(false);
    }
  };

  const openQuickLog = (tab: 'food' | 'workout' | 'water' | 'steps' | 'weight' = 'food') => {
    setQuickLogTab(tab);
    setQuickLogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* ========================================================= */}
      {/* 1. HEADER SECTION (Figma Headline & Subtitle)             */}
      {/* ========================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-black  text-brand-400 mb-1">
            {dateFormatted}
          </p>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
            Own your {dayName}, {firstName}.
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 font-medium">
            You're{' '}
            <span className="text-brand-400 font-bold">{fmtInt(displayRemaining)} kcal</span> and{' '}
            <span className="text-white font-bold">{displaySteps >= STEPS_GOAL ? '0' : stepsRemaining.toLocaleString()} steps</span>{' '}
            away from a perfect day.
          </p>
        </div>

        {/* Right Header Controls */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <button className="px-3.5 py-2 rounded-xl border border-panel-border bg-ink text-xs font-bold text-slate-300 hover:text-white flex items-center gap-2 transition">
              <Calendar size={14} className="text-brand-400" />
              <span>Today</span>
              <ChevronDown size={14} className="text-slate-500" />
            </button>
          </div>

          <button
            onClick={() => openQuickLog('food')}
            className="px-5 py-2.5 rounded-xl bg-brand-400 hover:bg-brand-300 text-ink font-black text-xs transition flex items-center gap-1.5 active:scale-95"
          >
            <Plus size={16} className="stroke-[3]" />
            <span>Quick Log</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. TOP CARDS ROW: DAILY FUEL (2 cols) & MACROS (1 col)     */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* DAILY FUEL CARD */}
        <div className="lg:col-span-2 rounded-3xl bg-panel-card border border-panel-border p-5 sm:p-6 shadow-xl relative overflow-hidden group">
          {/* Subtle glow highlight */}
          <div className="absolute top-0 right-1/4 w-40 h-40 bg-brand-400/5 rounded-full blur-3xl pointer-events-none" />

          {/* Card Top Title Row */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-brand-400/15 text-brand-400 flex items-center justify-center">
                <Flame size={16} />
              </span>
              <div>
                <h2 className="text-sm font-black text-white ">Daily Fuel</h2>
                <p className="text-[11px] text-slate-400">
                  Calorie balance • {fmtInt(displayGoal)} kcal target
                </p>
              </div>
            </div>

            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-extrabold bg-brand-400/15 text-brand-400 border border-brand-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
              On Track
            </span>
          </div>

          {/* Main Card Content (Ring + 3 Stats) */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-8">
            {/* Circular Progress Ring */}
            <div className="relative shrink-0 flex items-center justify-center">
              <svg width="156" height="156" className="-rotate-90">
                <circle
                  cx="78"
                  cy="78"
                  r="64"
                  fill="none"
                  stroke="#1a263d"
                  strokeWidth="13"
                />
                <circle
                  cx="78"
                  cy="78"
                  r="64"
                  fill="none"
                  stroke="#ccff00"
                  strokeWidth="13"
                  strokeLinecap="round"
                  strokeDasharray={`${(caloriePct / 100) * (2 * Math.PI * 64)} ${2 * Math.PI * 64}`}
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-3xl font-black text-white tracking-tight">
                  {fmtInt(displayRemaining)}
                </span>
                <span className="text-[10px] font-extrabold  text-slate-400 mt-0.5">
                  Kcal Left
                </span>
              </div>
            </div>

            {/* 3 Stat Columns */}
            <div className="flex-1 w-full grid grid-cols-3 gap-2 sm:gap-3">
              <div className="p-3.5 rounded-2xl border border-panel-border bg-ink/60 text-center">
                <div className="text-[10px] font-extrabold  text-slate-400">
                  Consumed
                </div>
                <div className="text-lg sm:text-xl font-black text-white mt-0.5">
                  {fmtInt(displayConsumed)}
                </div>
                <div className="text-[10px] text-slate-500 font-medium">kcal</div>
              </div>

              <div className="p-3.5 rounded-2xl border border-panel-border bg-ink/60 text-center">
                <div className="text-[10px] font-extrabold  text-slate-400">
                  Burned
                </div>
                <div className="text-lg sm:text-xl font-black text-brand-400 mt-0.5">
                  {fmtInt(displayBurned)}
                </div>
                {burnTarget && burnTarget.offset !== 0 && (
                  <div className="text-[10px] text-slate-500 font-medium">
                    {burnTarget.offset > 0 ? '+' : ''}{fmtInt(burnTarget.offset)} ·{' '}
                    {String(burnTarget.goalType).replace(/_/g, ' ')}
                  </div>
                )}
                {burnTarget && burnTarget.offset === 0 && (
                  <div className="text-[10px] text-slate-500 font-medium">Maintain</div>
                )}
              </div>

              <div className="p-3.5 rounded-2xl border border-panel-border bg-ink/60 text-center">
                <div className="text-[10px] font-extrabold  text-slate-400">
                  Net Kcal
                </div>
                <div className="text-lg sm:text-xl font-black text-white mt-0.5">
                  {fmtInt(displayNet)}
                </div>
                <div className="text-[10px] text-slate-500 font-medium">balance</div>
              </div>
            </div>
          </div>
        </div>

        {/* MACROS CARD */}
        <div className="rounded-3xl bg-panel-card border border-panel-border p-5 sm:p-6 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-black text-white ">Macros</h2>
              <p className="text-[11px] text-slate-400">Target: {proteinTarget}g P • {carbTarget}g C</p>
            </div>
            <span className="text-2xl font-black text-brand-400 tracking-tight">
              {macroPct}%
            </span>
          </div>

          {/* 3 Macro Bars */}
          <div className="space-y-4">
            {/* Protein */}
            <div>
              <div className="flex justify-between text-xs font-bold mb-1.5">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-protein" />
                  Protein
                </span>
                <span className="text-slate-300 font-semibold">
                  <b className="text-white font-extrabold">{Math.round(displayProtein)}</b> / {proteinTarget}g
                </span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-protein transition-all duration-700"
                  style={{ width: `${Math.min(100, (displayProtein / proteinTarget) * 100)}%` }}
                />
              </div>
            </div>

            {/* Carbs */}
            <div>
              <div className="flex justify-between text-xs font-bold mb-1.5">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-carbs" />
                  Carbs
                </span>
                <span className="text-slate-300 font-semibold">
                  <b className="text-white font-extrabold">{Math.round(displayCarbs)}</b> / {carbTarget}g
                </span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-carbs transition-all duration-700"
                  style={{ width: `${Math.min(100, (displayCarbs / carbTarget) * 100)}%` }}
                />
              </div>
            </div>

            {/* Fat */}
            <div>
              <div className="flex justify-between text-xs font-bold mb-1.5">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-fat" />
                  Fat
                </span>
                <span className="text-slate-300 font-semibold">
                  <b className="text-white font-extrabold">{Math.round(displayFat)}</b> / {fatTarget}g
                </span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-fat transition-all duration-700"
                  style={{ width: `${Math.min(100, (displayFat / fatTarget) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-panel-border flex items-center justify-between text-[11px] text-slate-400">
            <span>Daily Macro Balance</span>
            <button
              onClick={() => openQuickLog('food')}
              className="text-brand-400 hover:underline font-bold flex items-center gap-0.5"
            >
              <span>Log food</span>
              <ArrowUpRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. ROW 2: 3 METRIC CARDS (Hydration, Steps, Active Period) */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* HYDRATION CARD */}
        <div className="rounded-3xl bg-panel-card border border-panel-border p-5 shadow-lg flex flex-col justify-between relative group transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 flex items-center gap-2 text-xs font-extrabold ">
              <Droplets size={16} />
              Hydration
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-slate-400">
              {waterPct}%
            </span>
          </div>

          <div className="my-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-white">
                {(displayWater / 1000).toFixed(1)}
              </span>
              <span className="text-xs text-slate-400 font-bold">/ 3.0 L</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Next intake: 250ml suggested</p>
          </div>

          <div className="space-y-3">
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-water transition-all duration-500"
                style={{ width: `${Math.min(100, waterPct)}%` }}
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                onClick={handleQuickAddWater}
                className="px-3 py-1 rounded-xl border border-panel-border bg-ink text-slate-300 hover:text-white text-xs font-bold transition flex items-center gap-1"
              >
                <Plus size={13} />
                <span>250ml</span>
              </button>
              <button
                onClick={() => openQuickLog('water')}
                className="text-[11px] text-slate-400 hover:text-white transition"
              >
                Custom log →
              </button>
            </div>
          </div>
        </div>

        {/* DAILY STEPS CARD */}
        <div className="rounded-3xl bg-panel-card border border-panel-border p-5 shadow-lg flex flex-col justify-between relative group transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 flex items-center gap-2 text-xs font-extrabold ">
              <Footprints size={16} />
              Daily Steps
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-slate-400">
              {stepsPct}%
            </span>
          </div>

          <div className="my-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-white">
                {displaySteps.toLocaleString()}
              </span>
              <span className="text-xs text-slate-400 font-bold">/ 10k</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {(displaySteps * 0.00078).toFixed(1)} km covered today
            </p>
          </div>

          <div className="space-y-3">
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                  className="h-full rounded-full bg-brand-400 transition-all duration-500"
                style={{ width: `${Math.min(100, stepsPct)}%` }}
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                onClick={handleQuickAddSteps}
                  className="px-3 py-1 rounded-xl border border-panel-border bg-ink text-slate-300 hover:text-white text-xs font-bold transition flex items-center gap-1"
              >
                <Plus size={13} />
                <span>1,000 steps</span>
              </button>
              <button
                onClick={() => openQuickLog('steps')}
                className="text-[11px] text-slate-400 hover:text-brand-400 transition"
              >
                Update →
              </button>
            </div>
          </div>
        </div>

        {/* ACTIVE PERIOD CARD */}
        <div className="rounded-3xl bg-panel-card border border-panel-border p-5 shadow-lg flex flex-col justify-between relative group transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 flex items-center gap-2 text-xs font-extrabold ">
              <Flame size={16} />
              Active Period
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-slate-400">
              75%
            </span>
          </div>

          <div className="my-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-white">46</span>
              <span className="text-xs text-slate-400 font-bold">/ 60 MIN</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Cardio & strength intensity</p>
          </div>

          <div className="space-y-3">
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-brand-400 transition-all duration-500"
                style={{ width: '75%' }}
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                onClick={() => setWorkoutModalOpen(true)}
                className="px-3 py-1 rounded-xl border border-panel-border bg-ink text-slate-300 hover:text-white text-xs font-bold transition flex items-center gap-1"
              >
                <Play size={12} />
                <span>Start workout</span>
              </button>
              <button
                onClick={() => navigate('/exercises')}
                className="text-[11px] text-slate-400 hover:text-white transition"
              >
                Routines →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4. ROW 3: TODAY'S WORKOUT (2 cols) & MEAL LOG (1 col)      */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* TODAY'S WORKOUT CARD */}
        <div className="lg:col-span-2 rounded-3xl bg-panel-card border border-panel-border p-5 sm:p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Dumbbell size={18} className="text-brand-400" />
                <h2 className="text-sm font-black text-white ">
                  Today's Workout
                </h2>
              </div>
              <button
                onClick={() => setWorkoutModalOpen(true)}
                className="text-xs font-bold text-brand-400 hover:underline flex items-center gap-1"
              >
                <span>View plan</span>
                <ArrowUpRight size={14} />
              </button>
            </div>

            {/* Workout Card Layout (Split Details and Graphic) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center bg-panel-card border border-panel-border rounded-2xl p-4 sm:p-5">
              <div className="space-y-2">
                <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-brand-400/15 text-brand-400 border border-brand-500/30">
                  Lower Body Focus
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Lower body power
                </h3>
                <p className="text-xs text-slate-400">
                  5 exercises • 45 mins • Circuit style
                </p>

                <div className="pt-2 flex flex-wrap gap-2">
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-xl bg-white/10 text-slate-300">
                    🔥 380 kcal est.
                  </span>
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-xl bg-white/10 text-slate-300">
                    ⏱️ 90s rest
                  </span>
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-xl bg-white/10 text-slate-300">
                    🏋️ Dumbbells + Mat
                  </span>
                </div>
              </div>

              {/* Workout Illustration / Visual Preview */}
              <div className="relative h-36 rounded-xl border border-panel-border bg-panel-card flex flex-col items-center justify-center overflow-hidden p-4 group">
                <div className="text-center z-10 space-y-2">
                  <div className="w-10 h-10 rounded-full bg-brand-400 text-ink mx-auto flex items-center justify-center">
                    <Dumbbell size={20} className="stroke-[2.5]" />
                  </div>
                  <button
                    onClick={() => setWorkoutModalOpen(true)}
                    className="px-6 py-2 rounded-xl bg-brand-400 hover:bg-brand-300 text-ink font-black text-xs transition flex items-center gap-1.5 mx-auto active:scale-95"
                  >
                    <Play size={13} fill="currentColor" />
                    <span>Start Session</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* MEAL LOG CARD */}
        <div className="rounded-3xl bg-panel-card border border-panel-border p-5 sm:p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Utensils size={18} className="text-slate-400" />
                <h2 className="text-sm font-black text-white ">
                  Meal Log
                </h2>
              </div>
              <button
                onClick={() => openQuickLog('food')}
                className="text-xs font-bold text-brand-400 hover:underline flex items-center gap-1"
              >
                <span>Add meal</span>
                <Plus size={14} />
              </button>
            </div>

            {/* List of meals */}
            <div className="space-y-2.5">
              {(todayFoodsList.length > 0
                ? todayFoodsList.map((f) => ({
                    name: f.food_name,
                    type: f.meal_type || 'Meal',
                    calories: Number(f.calories) || 0,
                  }))
                : []
              ).map((meal, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-2xl border border-panel-border bg-ink/60 flex items-center justify-between hover:border-slate-700 transition"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-8 h-8 rounded-xl bg-white/5 text-slate-300 flex items-center justify-center shrink-0">
                      <Utensils size={15} />
                    </div>
                    <div className="overflow-hidden">
                      <div className="text-xs font-bold text-white truncate">{meal.name}</div>
                      <div className="text-[10px] text-slate-400">{meal.type}</div>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-brand-400 shrink-0 ml-2">
                    {meal.calories} kcal
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick inline add */}
          <form onSubmit={handleInlineMealAdd} className="mt-4 pt-3 border-t border-panel-border">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Quick add snack (e.g. Banana)"
                value={quickMealInput}
                onChange={(e) => setQuickMealInput(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-xl bg-ink border border-panel-border text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-400"
              />
              <button
                type="submit"
                disabled={addingMeal || !quickMealInput.trim()}
                className="w-8 h-8 rounded-xl bg-brand-400 hover:bg-brand-300 text-ink font-black flex items-center justify-center transition shrink-0 disabled:opacity-40"
              >
                <Plus size={16} className="stroke-[3]" />
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 5. ROW 4: 3 BOTTOM CARDS                                  */}
      {/* LEAN & STRONG (1) + CONSISTENCY (1) + TRAINING LOAD (1)   */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* CARD 1: LEAN & STRONG (Goal Progress) */}
        <div className="rounded-3xl bg-panel-card border border-panel-border p-5 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white flex items-center gap-2 text-xs font-extrabold ">
              <Scale size={16} className="text-brand-400" />
              {goalType}
            </span>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-brand-400/15 text-brand-400 border border-brand-400/30">
              88%
            </span>
          </div>

          <div className="my-3">
            <p className="text-[11px] text-slate-400 mb-2">
              Target: {goalWeight} kg • Active period
            </p>
            <div className="grid grid-cols-3 gap-2 text-center p-2.5 rounded-2xl bg-panel-card border border-panel-border">
              <div>
                <div className="text-[10px] text-slate-500 font-bold">Current</div>
                <div className="text-sm font-black text-white mt-0.5">{currentWeight} kg</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 font-bold">Target</div>
                <div className="text-sm font-black text-white mt-0.5">{goalWeight} kg</div>
              </div>
              <div>
                <div className="text-[10px] text-brand-400 font-bold">Delta</div>
                <div className="text-sm font-black text-brand-400 mt-0.5">-{weightChange} kg</div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full bg-brand-400" style={{ width: '88%' }} />
            </div>
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>Goal trajectory</span>
              <button
                onClick={() => navigate('/progress')}
                className="text-brand-400 font-bold hover:underline"
              >
                Track history →
              </button>
            </div>
          </div>
        </div>

        {/* CARD 2: CONSISTENCY (Streak) */}
        <div className="rounded-3xl bg-panel-card border border-panel-border p-5 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white flex items-center gap-2 text-xs font-extrabold ">
              <Trophy size={16} className="text-amber-400" />
              Consistency
            </span>
            <span className="text-xs font-black text-amber-400 flex items-center gap-1">
              <span>{displayStreak}</span>
              <span className="text-[10px] font-bold text-slate-400">days</span>
            </span>
          </div>

          <div className="my-3">
            <p className="text-[11px] text-slate-400 mb-2.5">
              Logged workouts & fuel consecutively
            </p>
            {/* 7 Weekday Bubbles — real activity, oldest → today */}
            <div className="grid grid-cols-7 gap-1.5 text-center">
              {weekDays.map((w) => (
                <div key={w.key} className="flex flex-col items-center gap-1">
                  {w.hit ? (
                    <div className="w-8 h-8 rounded-full bg-brand-400 text-ink font-black flex items-center justify-center">
                      <CheckCircle2 size={16} className="stroke-[3]" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-white/10 border border-panel-border flex items-center justify-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                    </div>
                  )}
                  <span className={`text-[10px] font-bold ${w.hit ? 'text-brand-400' : 'text-slate-500'}`}>{w.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-panel-border flex items-center justify-between text-[11px] text-slate-400">
            <span>{weekHits}/7 days hit this week</span>
            <button
              onClick={() => navigate('/calendar')}
              className="text-brand-400 font-bold hover:underline"
            >
              Calendar →
            </button>
          </div>
        </div>

        {/* CARD 3: TRAINING LOAD (Bar Chart — real burned kcal, last 7 days) */}
        <div className="rounded-3xl bg-panel-card border border-panel-border p-5 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white flex items-center gap-2 text-xs font-extrabold ">
              <TrendingUp size={16} className="text-brand-400" />
              Training Load
            </span>
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border flex items-center gap-0.5 ${
              weekDelta >= 0
                ? 'bg-brand-400/15 text-brand-400 border-brand-500/30'
                : 'bg-white/10 text-slate-400 border-white/10'
            }`}>
              <span>{weekDelta >= 0 ? `+${weekDelta}%` : `${weekDelta}%`}</span>
              {weekDelta >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            </span>
          </div>

          <div className="my-2">
            <p className="text-[11px] text-slate-400 mb-3">Burned kcal per day · vs previous week</p>
            {/* High-tech bar chart */}
            <div className="h-20 flex items-end justify-between gap-2 px-1">
              {weekBurn.map((v, idx) => {
                const isToday = idx === weekBurn.length - 1;
                return (
                  <div key={weekDays[idx]?.key ?? idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                    <div
                      className={`w-full rounded-t-lg transition-all duration-500 ${
                        isToday
                          ? 'bg-brand-400'
                          : 'bg-white/10 hover:bg-white/20'
                      }`}
                      style={{ height: `${v > 0 ? Math.max(8, Math.round((v / weekMax) * 100)) : 4}%` }}
                    />
                    <span
                      className={`text-[10px] font-bold ${
                        isToday ? 'text-brand-400' : 'text-slate-500'
                      }`}
                    >
                      {weekDays[idx]?.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-2 border-t border-panel-border flex items-center justify-between text-[11px] text-slate-400">
            <span>Week total: {fmtInt(weekTotal)} kcal</span>
            <span className="text-brand-400 font-bold">{weekTotal > 0 ? 'Active' : 'Rest week'}</span>
          </div>
        </div>
      </div>

      {/* Global Interactive Modals */}
      <QuickLogModal
        open={quickLogOpen}
        onClose={() => setQuickLogOpen(false)}
        initialTab={quickLogTab}
      />
      <WorkoutModal
        open={workoutModalOpen}
        onClose={() => setWorkoutModalOpen(false)}
      />
    </div>
  );
}
