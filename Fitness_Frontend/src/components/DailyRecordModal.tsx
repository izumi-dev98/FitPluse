import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Droplets, Dumbbell, Flame, Footprints, Target, Utensils, X, BookOpen } from 'lucide-react';
import { formatDay, todayKey, verdictClass, type DailyRow } from '../lib/dailyHistory';
import { useDailyExercises, useDailyFoods, useExercises, useFoods } from '../lib/queries';
import { Ring } from './ui';
import { fmtInt } from '../lib/format';
import type { DailyExerciseRow, DailyFoodRow } from '../lib/database';
import { GOAL_GUIDANCE, type GoalType } from '../lib/theory';

export default function DailyRecordModal({
  row,
  userId,
  onClose,
}: {
  row: DailyRow | null;
  userId?: string;
  onClose: () => void;
}) {
  const [showTheory, setShowTheory] = useState(false);

  // Shared cached queries (per-record key, also used by Daily) — no refetch
  // when reopening a recently viewed day.
  const foodsQ = useDailyFoods(userId, row?.id);
  const exercisesQ = useDailyExercises(userId);
  // Backend returns raw child rows (food_id / exercise_id, no joined names),
  // so resolve display names from the user's own catalogs (shared cache
  // with the Foods/Workout pages).
  const foodsCatalogQ = useFoods(userId);
  const exercisesCatalogQ = useExercises(userId);
  const loading = foodsQ.isLoading || exercisesQ.isLoading;
  const foodNames = useMemo(
    () => new Map((foodsCatalogQ.data ?? []).map((f) => [String(f.id), f.name])),
    [foodsCatalogQ.data],
  );
  const exerciseNames = useMemo(
    () => new Map((exercisesCatalogQ.data ?? []).map((e) => [String(e.id), e.name])),
    [exercisesCatalogQ.data],
  );
  const foods = useMemo(() => {
    if (!row) return [];
    const foodList = foodsQ.data ?? [];
    return row.id
      ? foodList.filter((f) => f.daily_record_id === row.id || dateOf(f) === row.date)
      : foodList.filter((f) => dateOf(f) === row.date);
  }, [foodsQ.data, row?.id, row?.date]);
  const exercises = useMemo(() => {
    if (!row) return [];
    const exList = exercisesQ.data ?? [];
    return row.id
      ? exList.filter((e) => e.daily_record_id === row.id || dateOf(e) === row.date)
      : exList.filter((e) => dateOf(e) === row.date);
  }, [exercisesQ.data, row?.id, row?.date]);

  if (!row) return null;

  const pct = row.target > 0 ? Math.round((row.consumed / row.target) * 100) : 0;
  const isToday = row.date === todayKey();
  const hasLog = row.consumed > 0 || row.burned > 0 || row.water > 0 || row.steps > 0 || !!row.id;

  // Match goal guidance from theory.ts
  const rawGoalKey = row.goalType.toLowerCase().replace(/\s+/g, '_') as GoalType;
  const guidance = GOAL_GUIDANCE[rawGoalKey];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="border border-panel-border bg-panel-card rounded-3xl w-full max-w-xl max-h-[92dvh] sm:max-h-[88vh] flex flex-col shadow-2xl overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="flex items-start justify-between p-4 sm:p-5 border-b border-panel-border bg-panel-card shrink-0">
          <div>
            <div className="text-xs font-bold text-brand-400 mb-0.5">
              Daily performance record
            </div>
            <h3 className="text-lg sm:text-xl font-black text-white">
              {formatDay(row.date, { weekday: 'long', month: 'long', day: 'numeric' })}
            </h3>
            <p className="text-xs text-slate-400 capitalize mt-0.5">
              {isToday ? 'Today • ' : ''}
              <span className="text-slate-300 font-semibold">{row.goalType}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white transition hover:bg-white/5"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scroll Body */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto overscroll-contain">
          {/* Calorie Ring & Main Stats */}
          <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl border border-panel-border bg-ink/60">
            <Ring percent={pct} size={120}>
              <div className="text-[9px] font-bold text-slate-500">Intake</div>
              <div className="text-lg font-black text-white leading-tight">{fmtInt(row.consumed)}</div>
              <div className="text-[10px] text-slate-400 font-semibold">
                {row.target ? `/ ${fmtInt(row.target)}` : 'kcal'}
              </div>
            </Ring>

            <div className="flex-1 w-full space-y-2.5">
              <div className="flex items-center justify-between">
                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-extrabold border ${verdictClass[row.verdict.tone]}`}>
                  {hasLog ? row.verdict.label : 'Not logged'}
                </span>
                <span className="text-xs font-bold text-slate-400">
                  {pct}% of target
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <Stat icon={Utensils} label="Intake" value={`${fmtInt(row.consumed)} kcal`} className="text-brand-300" />
                <Stat icon={Flame} label="Burned" value={`${fmtInt(row.burned)} kcal`} className="text-slate-300" />
                <Stat icon={Target} label="Net" value={`${fmtInt(row.net)} kcal`} className="text-white" />
                <Stat icon={Droplets} label="Water" value={`${fmtInt(row.water)} ml`} className="text-slate-300" />
              </div>

              <div className="text-xs text-slate-300 font-bold flex items-center gap-1.5 pt-0.5">
                <Footprints size={14} /> {row.steps.toLocaleString()} steps walked
              </div>
            </div>
          </div>

          {row.notes && (
            <div className="p-3.5 rounded-2xl border border-panel-border bg-ink/60">
              <span className="text-[10px] font-bold text-slate-400 block mb-1">Notes</span>
              <p className="text-xs text-slate-300 leading-relaxed">{row.notes}</p>
            </div>
          )}

          {/* Goal Theory & Nutritional Guidance Pill */}
          {guidance && (
            <div className="p-4 rounded-2xl border border-panel-border bg-ink/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen size={16} className="text-slate-400" />
                  <span className="text-xs font-black text-white">
                    Theory & target guidance
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTheory(!showTheory)}
                  className="text-[11px] font-bold text-brand-400 hover:underline"
                >
                  {showTheory ? 'Hide guidance' : 'View guidance'}
                </button>
              </div>

              {showTheory && (
                <div className="mt-3 pt-3 border-t border-panel-border space-y-2 text-xs">
                  <p className="text-slate-300 font-medium">{guidance.summary}</p>
                  <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                    <div className="p-2 rounded-xl bg-ink border border-panel-border">
                      <span className="text-slate-500 font-bold block">Calorie Strategy</span>
                      <span className="text-brand-400 font-bold">{guidance.calories}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-ink border border-panel-border">
                      <span className="text-slate-500 font-bold block">Protein Range</span>
                      <span className="text-white font-bold">{guidance.protein}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Logged Meals List */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 mb-2.5 flex items-center gap-1.5">
              <Utensils size={15} className="text-slate-400" /> Logged meals ({foods.length})
            </h4>
            {loading ? (
              <p className="text-xs text-slate-500">Loading meals…</p>
            ) : foods.length === 0 ? (
              <p className="text-xs text-slate-500 p-3 rounded-2xl border border-panel-border bg-ink/60">
                No meals recorded for this date.
              </p>
            ) : (
              <div className="space-y-1.5">
                {foods.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center justify-between text-xs border border-panel-border bg-ink/60 rounded-xl px-3 py-2.5"
                  >
                    <div>
                      <span className="text-white font-bold block">{foodNames.get(String(f.food_id)) || f.food_name || f.meal_type || 'Food'}</span>
                      <span className="text-[10px] text-slate-400">
                        {f.meal_type} {f.protein ? `• ${f.protein}g P` : ''} {f.carbohydrates ? `• ${f.carbohydrates}g C` : ''}
                      </span>
                    </div>
                    <span className="text-white font-extrabold">{fmtInt(f.calories)} kcal</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Logged Workouts List */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 mb-2.5 flex items-center gap-1.5">
              <Dumbbell size={15} className="text-slate-400" /> Logged workouts ({exercises.length})
            </h4>
            {loading ? (
              <p className="text-xs text-slate-500">Loading workouts…</p>
            ) : exercises.length === 0 ? (
              <p className="text-xs text-slate-500 p-3 rounded-2xl border border-panel-border bg-ink/60">
                No workouts recorded for this date.
              </p>
            ) : (
              <div className="space-y-1.5">
                {exercises.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between text-xs border border-panel-border bg-ink/60 rounded-xl px-3 py-2.5"
                  >
                    <div>
                      <span className="text-white font-bold block">{exerciseNames.get(String(e.exercise_id)) || e.exercise_name || 'Workout'}</span>
                      <span className="text-[10px] text-slate-400">
                        {e.duration_minutes ? `${e.duration_minutes} mins` : ''}{e.sets ? ` • ${e.sets} sets` : ''}{e.reps ? ` • ${e.reps} reps` : ''}
                      </span>
                    </div>
                    <span className="text-white font-extrabold">{fmtInt(e.calories_burned)} kcal</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Link
            to="/daily"
            onClick={onClose}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-brand-400 hover:bg-brand-300 text-ink font-bold text-sm transition active:scale-95"
          >
            <ArrowRight size={15} className="stroke-[3]" />
            <span>{isToday ? 'Log more for today' : 'Open Daily Tracker'}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

function dateOf(item: DailyFoodRow | DailyExerciseRow) {
  return String(item.record_date || item.created_at || '').slice(0, 10);
}

function Stat({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: typeof Utensils;
  label: string;
  value: string;
  className: string;
}) {
  return (
    <div className="border border-panel-border bg-ink/60 rounded-xl px-2.5 py-1.5">
      <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
        <Icon size={11} /> {label}
      </div>
      <div className={`text-xs font-black mt-0.5 ${className}`}>{value}</div>
    </div>
  );
}
