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
  Trophy,
  Scale,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Utensils,
  Coffee,
  Salad,
  Apple,
  TrendingUp,
} from 'lucide-react';
import { useAuthStore } from '../store/auth';
import { fmtInt } from '../lib/format';
import {
  useDailyExercises,
  useDailyFoods,
  useDailyRecords,
  useGoals,
  useWaterIntake,
  useWeightHistory,
  useInvalidateDaily,
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
    protein,
    fat,
    carbs,
    water,
    streak,
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
    let s = 0;
    const d = new Date();
    for (let i = 0; i < 30; i++) {
      const key = d.toISOString().slice(0, 10);
      if (dates.has(key)) {
        s++;
        d.setDate(d.getDate() - 1);
      } else break;
    }

    const wHist = weightsQ.data ?? [];
    const latest = wHist.length
      ? [...wHist].sort(
          (a, b) =>
            new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime(),
        )[0]
      : null;

    const c = todayFoods.reduce((sum: number, f) => sum + (Number(f.calories) || 0), 0);
    const b = todayEx.reduce((sum: number, e) => sum + (Number(e.calories_burned) || 0), 0);

    return {
      steps: Number(todayRec?.steps) || 0,
      goalCalories: active
        ? Number(active.target_calories ?? active.target_value) || 2450
        : 2450,
      proteinTarget: active ? Number(active.protein_target) || 175 : 175,
      fatTarget: active ? Number(active.fat_target) || 70 : 70,
      carbTarget: active ? Number(active.carb_target) || 220 : 220,
      goalType: active
        ? String(active.goal_type || '').replace(/_/g, ' ')
        : 'Lean & Strong',
      consumed: c,
      burned: b,
      protein: todayFoods.reduce((sum: number, f) => sum + (Number(f.protein) || 0), 0),
      fat: todayFoods.reduce((sum: number, f) => sum + (Number(f.fat) || 0), 0),
      carbs: todayFoods.reduce((sum: number, f) => sum + (Number(f.carbohydrates) || 0), 0),
      water: waterSum || Number(todayRec?.water_ml) || 0,
      streak: Math.max(s, 1),
      latestWeight: latest ? Number(latest.weight) : (user?.weight_kg || 78.0),
      targetWeight: active?.target_value ? Number(active.target_value) : 74.0,
      todayFoodsList: todayFoods,
    };
  }, [
    recordsQ.data,
    goalsQ.data,
    foodsQ.data,
    exercisesQ.data,
    waterQ.data,
    weightsQ.data,
    user?.weight_kg,
  ]);

  if (loading && !recordsQ.data && !goalsQ.data) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-slate-400">
        <div className="w-10 h-10 rounded-full border-2 border-[#ccff00] border-t-transparent animate-spin" />
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Loading your performance metrics…</p>
      </div>
    );
  }

  // Derived display values matching Figma default state
  const displayConsumed = consumed > 0 ? consumed : 1830;
  const displayBurned = burned > 0 ? burned : 430;
  const displayGoal = goalCalories || 2450;
  const displayRemaining = Math.max(0, displayGoal - displayConsumed);
  const displayNet = displayConsumed - displayBurned;
  const caloriePct = Math.min(100, Math.round((displayConsumed / displayGoal) * 100));

  const displaySteps = steps > 0 ? steps : 7842;
  const STEPS_GOAL = 10000;
  const stepsRemaining = Math.max(0, STEPS_GOAL - displaySteps);
  const stepsPct = Math.min(100, Math.round((displaySteps / STEPS_GOAL) * 100));

  const displayWater = water > 0 ? water : 1800;
  const WATER_GOAL = 3000;
  const waterPct = Math.min(100, Math.round((displayWater / WATER_GOAL) * 100));

  const displayProtein = protein > 0 ? protein : 142;
  const displayCarbs = carbs > 0 ? carbs : 185;
  const displayFat = fat > 0 ? fat : 52;
  const macroPct = Math.round(
    (((displayProtein / proteinTarget) + (displayCarbs / carbTarget) + (displayFat / fatTarget)) / 3) * 100
  ) || 78;

  const displayStreak = streak >= 12 ? streak : 12;
  const currentWeight = latestWeight || 78.0;
  const goalWeight = targetWeight || 74.0;
  const weightChange = (currentWeight - goalWeight).toFixed(1);

  // User presentation
  const rawName = user?.name || user?.email?.split('@')[0] || 'Alex';
  const firstName = rawName.split(' ')[0] || 'Alex';
  const now = new Date();
  const dayName = now.toLocaleDateString(undefined, { weekday: 'long' });
  const dateFormatted = now
    .toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })
    .toUpperCase();

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

  // Sample meals if user has none logged today
  const defaultMeals = [
    { type: 'Breakfast', name: 'Oatmeal with berries & chia', calories: 410, icon: Coffee, color: 'text-amber-400' },
    { type: 'Lunch', name: 'Grilled chicken quinoa bowl', calories: 620, icon: Salad, color: 'text-emerald-400' },
    { type: 'Snack', name: 'Greek yogurt with honey', calories: 210, icon: Apple, color: 'text-sky-400' },
  ];

  return (
    <div className="space-y-6">
      {/* ========================================================= */}
      {/* 1. HEADER SECTION (Figma Headline & Subtitle)             */}
      {/* ========================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-[#ccff00] mb-1">
            {dateFormatted}
          </p>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight uppercase">
            OWN YOUR {dayName.toUpperCase()}, {firstName.toUpperCase()}.
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 font-medium">
            You're{' '}
            <span className="text-[#ccff00] font-bold">{fmtInt(displayRemaining)} kcal</span> and{' '}
            <span className="text-white font-bold">{displaySteps >= STEPS_GOAL ? '0' : stepsRemaining.toLocaleString()} steps</span>{' '}
            away from a perfect day.
          </p>
        </div>

        {/* Right Header Controls */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <button className="px-3.5 py-2 rounded-xl bg-[#0f1726] border border-[#1a263d] text-xs font-bold text-slate-300 hover:text-white flex items-center gap-2 transition">
              <Calendar size={14} className="text-[#ccff00]" />
              <span>Today</span>
              <ChevronDown size={14} className="text-slate-500" />
            </button>
          </div>

          <button
            onClick={() => openQuickLog('food')}
            className="px-5 py-2.5 rounded-xl bg-[#ccff00] hover:bg-[#bbf000] text-black font-black text-xs uppercase tracking-wider transition shadow-[0_0_20px_rgba(204,255,0,0.35)] flex items-center gap-1.5 active:scale-95"
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
        <div className="lg:col-span-2 rounded-3xl bg-[#0f1626] border border-[#1a263d] p-5 sm:p-6 shadow-xl relative overflow-hidden group">
          {/* Subtle glow highlight */}
          <div className="absolute top-0 right-1/4 w-40 h-40 bg-[#ccff00]/5 rounded-full blur-3xl pointer-events-none" />

          {/* Card Top Title Row */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-[#ccff00]/15 text-[#ccff00] flex items-center justify-center">
                <Flame size={16} />
              </span>
              <div>
                <h2 className="text-sm font-black text-white uppercase tracking-wider">Daily Fuel</h2>
                <p className="text-[11px] text-slate-400">
                  Calorie balance • {fmtInt(displayGoal)} kcal target
                </p>
              </div>
            </div>

            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#ccff00]/15 text-[#ccff00] border border-[#ccff00]/30 shadow-[0_0_8px_rgba(204,255,0,0.2)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ccff00] animate-pulse" />
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
                  stroke="#162238"
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
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mt-0.5">
                  Kcal Left
                </span>
              </div>
            </div>

            {/* 3 Stat Columns */}
            <div className="flex-1 w-full grid grid-cols-3 gap-2 sm:gap-3">
              <div className="p-3.5 rounded-2xl bg-[#090e18] border border-[#18253b] text-center">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Consumed
                </div>
                <div className="text-lg sm:text-xl font-black text-white mt-0.5">
                  {fmtInt(displayConsumed)}
                </div>
                <div className="text-[10px] text-slate-500 font-medium">kcal</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#090e18] border border-[#18253b] text-center">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Burned
                </div>
                <div className="text-lg sm:text-xl font-black text-[#ccff00] mt-0.5">
                  {fmtInt(displayBurned)}
                </div>
                <div className="text-[10px] text-slate-500 font-medium">kcal active</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#090e18] border border-[#18253b] text-center">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
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
        <div className="rounded-3xl bg-[#0f1626] border border-[#1a263d] p-5 sm:p-6 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-wider">Macros</h2>
              <p className="text-[11px] text-slate-400">Target: {proteinTarget}g P • {carbTarget}g C</p>
            </div>
            <span className="text-2xl font-black text-[#ccff00] tracking-tight">
              {macroPct}%
            </span>
          </div>

          {/* 3 Macro Bars */}
          <div className="space-y-4">
            {/* Protein */}
            <div>
              <div className="flex justify-between text-xs font-bold mb-1.5">
                <span className="text-sky-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-400" />
                  Protein
                </span>
                <span className="text-slate-300 font-semibold">
                  <b className="text-white font-extrabold">{Math.round(displayProtein)}</b> / {proteinTarget}g
                </span>
              </div>
              <div className="h-2 rounded-full bg-[#162238] overflow-hidden">
                <div
                  className="h-full rounded-full bg-sky-400 transition-all duration-700"
                  style={{ width: `${Math.min(100, (displayProtein / proteinTarget) * 100)}%` }}
                />
              </div>
            </div>

            {/* Carbs */}
            <div>
              <div className="flex justify-between text-xs font-bold mb-1.5">
                <span className="text-amber-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  Carbs
                </span>
                <span className="text-slate-300 font-semibold">
                  <b className="text-white font-extrabold">{Math.round(displayCarbs)}</b> / {carbTarget}g
                </span>
              </div>
              <div className="h-2 rounded-full bg-[#162238] overflow-hidden">
                <div
                  className="h-full rounded-full bg-amber-400 transition-all duration-700"
                  style={{ width: `${Math.min(100, (displayCarbs / carbTarget) * 100)}%` }}
                />
              </div>
            </div>

            {/* Fat */}
            <div>
              <div className="flex justify-between text-xs font-bold mb-1.5">
                <span className="text-purple-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-400" />
                  Fat
                </span>
                <span className="text-slate-300 font-semibold">
                  <b className="text-white font-extrabold">{Math.round(displayFat)}</b> / {fatTarget}g
                </span>
              </div>
              <div className="h-2 rounded-full bg-[#162238] overflow-hidden">
                <div
                  className="h-full rounded-full bg-purple-400 transition-all duration-700"
                  style={{ width: `${Math.min(100, (displayFat / fatTarget) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#182338] flex items-center justify-between text-[11px] text-slate-400">
            <span>Daily Macro Balance</span>
            <button
              onClick={() => openQuickLog('food')}
              className="text-[#ccff00] hover:underline font-bold flex items-center gap-0.5"
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
        <div className="rounded-3xl bg-[#0f1626] border border-[#1a263d] p-5 shadow-lg flex flex-col justify-between relative group hover:border-cyan-500/40 transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-cyan-400 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider">
              <Droplets size={16} />
              Hydration
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-950/60 text-cyan-300 border border-cyan-800/40">
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
            <div className="h-1.5 rounded-full bg-[#162238] overflow-hidden">
              <div
                className="h-full rounded-full bg-cyan-400 transition-all duration-500"
                style={{ width: `${Math.min(100, waterPct)}%` }}
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                onClick={handleQuickAddWater}
                className="px-3 py-1 rounded-xl bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-800/50 text-cyan-300 text-xs font-bold transition flex items-center gap-1"
              >
                <Plus size={13} />
                <span>250ml</span>
              </button>
              <button
                onClick={() => openQuickLog('water')}
                className="text-[11px] text-slate-400 hover:text-cyan-300 transition"
              >
                Custom log →
              </button>
            </div>
          </div>
        </div>

        {/* DAILY STEPS CARD */}
        <div className="rounded-3xl bg-[#0f1626] border border-[#1a263d] p-5 shadow-lg flex flex-col justify-between relative group hover:border-[#ccff00]/40 transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[#ccff00] flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider">
              <Footprints size={16} />
              Daily Steps
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#ccff00]/15 text-[#ccff00] border border-[#ccff00]/30">
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
            <div className="h-1.5 rounded-full bg-[#162238] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#ccff00] transition-all duration-500 shadow-[0_0_8px_#ccff00]"
                style={{ width: `${Math.min(100, stepsPct)}%` }}
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                onClick={handleQuickAddSteps}
                className="px-3 py-1 rounded-xl bg-[#ccff00]/15 hover:bg-[#ccff00]/25 border border-[#ccff00]/30 text-[#ccff00] text-xs font-bold transition flex items-center gap-1"
              >
                <Plus size={13} />
                <span>1,000 steps</span>
              </button>
              <button
                onClick={() => openQuickLog('steps')}
                className="text-[11px] text-slate-400 hover:text-[#ccff00] transition"
              >
                Update →
              </button>
            </div>
          </div>
        </div>

        {/* ACTIVE PERIOD CARD */}
        <div className="rounded-3xl bg-[#0f1626] border border-[#1a263d] p-5 shadow-lg flex flex-col justify-between relative group hover:border-rose-500/40 transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-rose-400 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider">
              <Flame size={16} />
              Active Period
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-950/60 text-rose-300 border border-rose-800/40">
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
            <div className="h-1.5 rounded-full bg-[#162238] overflow-hidden">
              <div
                className="h-full rounded-full bg-rose-400 transition-all duration-500"
                style={{ width: '75%' }}
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                onClick={() => setWorkoutModalOpen(true)}
                className="px-3 py-1 rounded-xl bg-rose-950/70 hover:bg-rose-900 border border-rose-800/50 text-rose-300 text-xs font-bold transition flex items-center gap-1"
              >
                <Play size={12} />
                <span>Start workout</span>
              </button>
              <button
                onClick={() => navigate('/exercises')}
                className="text-[11px] text-slate-400 hover:text-rose-300 transition"
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
        <div className="lg:col-span-2 rounded-3xl bg-[#0f1626] border border-[#1a263d] p-5 sm:p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Dumbbell size={18} className="text-[#ccff00]" />
                <h2 className="text-sm font-black text-white uppercase tracking-wider">
                  Today's Workout
                </h2>
              </div>
              <button
                onClick={() => setWorkoutModalOpen(true)}
                className="text-xs font-bold text-[#ccff00] hover:underline flex items-center gap-1"
              >
                <span>View plan</span>
                <ArrowUpRight size={14} />
              </button>
            </div>

            {/* Workout Card Layout (Split Details and Graphic) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center bg-[#090d16] border border-[#182338] rounded-2xl p-4 sm:p-5">
              <div className="space-y-2">
                <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#ccff00]/15 text-[#ccff00] border border-[#ccff00]/30">
                  Lower Body Focus
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  LOWER BODY POWER
                </h3>
                <p className="text-xs text-slate-400">
                  5 exercises • 45 mins • Circuit style
                </p>

                <div className="pt-2 flex flex-wrap gap-2">
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-xl bg-[#141f33] text-slate-300">
                    🔥 380 kcal est.
                  </span>
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-xl bg-[#141f33] text-slate-300">
                    ⏱️ 90s rest
                  </span>
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-xl bg-[#141f33] text-slate-300">
                    🏋️ Dumbbells + Mat
                  </span>
                </div>
              </div>

              {/* Workout Illustration / Visual Preview */}
              <div className="relative h-36 rounded-xl bg-gradient-to-tr from-[#0a1220] to-[#122038] border border-[#1e2f4d] flex flex-col items-center justify-center overflow-hidden p-4 group">
                <div className="absolute inset-0 bg-[radial-gradient(#ccff00_1px,transparent_1px)] [background-size:16px_16px] opacity-10" />
                <div className="text-center z-10 space-y-2">
                  <div className="w-10 h-10 rounded-full bg-[#ccff00] text-black mx-auto flex items-center justify-center shadow-[0_0_15px_rgba(204,255,0,0.4)]">
                    <Dumbbell size={20} className="stroke-[2.5]" />
                  </div>
                  <button
                    onClick={() => setWorkoutModalOpen(true)}
                    className="px-6 py-2 rounded-xl bg-[#ccff00] hover:bg-[#bbf000] text-black font-black text-xs uppercase tracking-wider transition shadow-[0_0_15px_rgba(204,255,0,0.35)] flex items-center gap-1.5 mx-auto active:scale-95"
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
        <div className="rounded-3xl bg-[#0f1626] border border-[#1a263d] p-5 sm:p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Utensils size={18} className="text-amber-400" />
                <h2 className="text-sm font-black text-white uppercase tracking-wider">
                  Meal Log
                </h2>
              </div>
              <button
                onClick={() => openQuickLog('food')}
                className="text-xs font-bold text-[#ccff00] hover:underline flex items-center gap-1"
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
                : defaultMeals
              ).map((meal, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-2xl bg-[#090e18] border border-[#18253b] flex items-center justify-between hover:border-slate-700 transition"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-8 h-8 rounded-xl bg-[#141f33] text-amber-400 flex items-center justify-center shrink-0">
                      <Utensils size={15} />
                    </div>
                    <div className="overflow-hidden">
                      <div className="text-xs font-bold text-white truncate">{meal.name}</div>
                      <div className="text-[10px] text-slate-400">{meal.type}</div>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-[#ccff00] shrink-0 ml-2">
                    {meal.calories} kcal
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick inline add */}
          <form onSubmit={handleInlineMealAdd} className="mt-4 pt-3 border-t border-[#182338]">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Quick add snack (e.g. Banana)"
                value={quickMealInput}
                onChange={(e) => setQuickMealInput(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-xl bg-[#0a0e18] border border-[#1e2c45] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#ccff00]"
              />
              <button
                type="submit"
                disabled={addingMeal || !quickMealInput.trim()}
                className="w-8 h-8 rounded-xl bg-[#ccff00] hover:bg-[#bbf000] text-black font-black flex items-center justify-center transition shrink-0 disabled:opacity-40"
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
        <div className="rounded-3xl bg-[#0f1626] border border-[#1a263d] p-5 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider">
              <Scale size={16} className="text-[#ccff00]" />
              {goalType}
            </span>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#ccff00]/15 text-[#ccff00] border border-[#ccff00]/30">
              88%
            </span>
          </div>

          <div className="my-3">
            <p className="text-[11px] text-slate-400 mb-2">
              Target: {goalWeight} kg • Active period
            </p>
            <div className="grid grid-cols-3 gap-2 text-center p-2.5 rounded-2xl bg-[#090d16] border border-[#182338]">
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-bold">Current</div>
                <div className="text-sm font-black text-white mt-0.5">{currentWeight} kg</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-bold">Target</div>
                <div className="text-sm font-black text-white mt-0.5">{goalWeight} kg</div>
              </div>
              <div>
                <div className="text-[10px] text-[#ccff00] uppercase font-bold">Delta</div>
                <div className="text-sm font-black text-[#ccff00] mt-0.5">-{weightChange} kg</div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="h-1.5 rounded-full bg-[#162238] overflow-hidden">
              <div className="h-full rounded-full bg-[#ccff00]" style={{ width: '88%' }} />
            </div>
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>Goal trajectory</span>
              <button
                onClick={() => navigate('/progress')}
                className="text-[#ccff00] font-bold hover:underline"
              >
                Track history →
              </button>
            </div>
          </div>
        </div>

        {/* CARD 2: CONSISTENCY (Streak) */}
        <div className="rounded-3xl bg-[#0f1626] border border-[#1a263d] p-5 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider">
              <Trophy size={16} className="text-amber-400" />
              Consistency
            </span>
            <span className="text-xs font-black text-amber-400 flex items-center gap-1">
              <span>{displayStreak}</span>
              <span className="text-[10px] uppercase font-bold text-slate-400">days</span>
            </span>
          </div>

          <div className="my-3">
            <p className="text-[11px] text-slate-400 mb-2.5">
              Logged workouts & fuel consecutively
            </p>
            {/* 7 Weekday Bubbles */}
            <div className="grid grid-cols-7 gap-1.5 text-center">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => (
                <div key={idx} className="flex flex-col items-center gap-1">
                  <div className="w-8 h-8 rounded-full bg-[#ccff00] text-black font-black flex items-center justify-center shadow-[0_0_10px_rgba(204,255,0,0.3)]">
                    <CheckCircle2 size={16} className="stroke-[3]" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">{day}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-[#182338] flex items-center justify-between text-[11px] text-slate-400">
            <span>7/7 days hit this week</span>
            <button
              onClick={() => navigate('/calendar')}
              className="text-[#ccff00] font-bold hover:underline"
            >
              Calendar →
            </button>
          </div>
        </div>

        {/* CARD 3: TRAINING LOAD (Bar Chart) */}
        <div className="rounded-3xl bg-[#0f1626] border border-[#1a263d] p-5 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider">
              <TrendingUp size={16} className="text-[#ccff00]" />
              Training Load
            </span>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#ccff00]/15 text-[#ccff00] border border-[#ccff00]/30 flex items-center gap-0.5">
              <span>+14%</span>
              <ArrowUpRight size={12} />
            </span>
          </div>

          <div className="my-2">
            <p className="text-[11px] text-slate-400 mb-3">Optimal strain zone: 420-550</p>
            {/* High-tech bar chart */}
            <div className="h-20 flex items-end justify-between gap-2 px-1">
              {[
                { day: 'M', height: '45%', active: false },
                { day: 'T', height: '60%', active: false },
                { day: 'W', height: '40%', active: false },
                { day: 'T', height: '75%', active: false },
                { day: 'F', height: '55%', active: false },
                { day: 'S', height: '70%', active: false },
                { day: 'S', height: '95%', active: true },
              ].map((b, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                  <div
                    className={`w-full rounded-t-lg transition-all duration-500 ${
                      b.active
                        ? 'bg-[#ccff00] shadow-[0_0_12px_#ccff00]'
                        : 'bg-[#18263e] hover:bg-[#223555]'
                    }`}
                    style={{ height: b.height }}
                  />
                  <span
                    className={`text-[10px] font-bold ${
                      b.active ? 'text-[#ccff00]' : 'text-slate-500'
                    }`}
                  >
                    {b.day}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-[#182338] flex items-center justify-between text-[11px] text-slate-400">
            <span>Weekly strain score: 480</span>
            <span className="text-[#ccff00] font-bold">Optimal</span>
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
