import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Droplets, Dumbbell, Flame, Footprints, Target, Utensils, X, Sparkles, BookOpen } from 'lucide-react';
import { apiClient } from '../lib/api';
import { formatDay, todayKey, verdictClass, type DailyRow } from '../lib/dailyHistory';
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
  const [foods, setFoods] = useState<DailyFoodRow[]>([]);
  const [exercises, setExercises] = useState<DailyExerciseRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [showTheory, setShowTheory] = useState(false);

  useEffect(() => {
    if (!row || !userId) {
      setFoods([]);
      setExercises([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const [foodData, exData] = await Promise.all([
          apiClient.getDailyFoods(userId, row.id).catch(() => []),
          apiClient.getDailyExercises(userId).catch(() => []),
        ]);
        if (cancelled) return;
        const foodList: DailyFoodRow[] = Array.isArray(foodData) ? foodData : [];
        setFoods(
          row.id
            ? foodList.filter((f) => f.daily_record_id === row.id || dateOf(f) === row.date)
            : foodList.filter((f) => dateOf(f) === row.date),
        );
        const exList: DailyExerciseRow[] = Array.isArray(exData) ? exData : [];
        setExercises(
          row.id
            ? exList.filter((e) => e.daily_record_id === row.id || dateOf(e) === row.date)
            : exList.filter((e) => dateOf(e) === row.date),
        );
      } catch {
        if (!cancelled) {
          setFoods([]);
          setExercises([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [row?.id, row?.date, userId]);

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
        className="bg-[#0f1626] border border-[#1a263d] rounded-2xl sm:rounded-3xl w-full max-w-xl max-h-[92dvh] sm:max-h-[88vh] flex flex-col shadow-2xl overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-[#ccff00] blur-sm rounded-full pointer-events-none" />

        {/* Modal Top Header */}
        <div className="flex items-start justify-between p-4 sm:p-5 border-b border-[#182338] bg-[#0f1626] shrink-0">
          <div>
            <div className="text-[10px] sm:text-xs font-black text-[#ccff00] uppercase tracking-widest mb-0.5">
              Daily Performance Record
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
            className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white transition"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scroll Body */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto overscroll-contain">
          {/* Calorie Ring & Main Stats */}
          <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl bg-[#090d16] border border-[#182338]">
            <Ring percent={pct} size={120}>
              <div className="text-[9px] font-bold text-slate-500 uppercase">Intake</div>
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
                <Stat icon={Utensils} label="Intake" value={`${fmtInt(row.consumed)} kcal`} className="text-[#ccff00]" />
                <Stat icon={Flame} label="Burned" value={`${fmtInt(row.burned)} kcal`} className="text-orange-400" />
                <Stat icon={Target} label="Net" value={`${fmtInt(row.net)} kcal`} className="text-white" />
                <Stat icon={Droplets} label="Water" value={`${fmtInt(row.water)} ml`} className="text-cyan-400" />
              </div>

              <div className="text-xs text-[#ccff00] font-bold flex items-center gap-1.5 pt-0.5">
                <Footprints size={14} /> {row.steps.toLocaleString()} steps walked
              </div>
            </div>
          </div>

          {row.notes && (
            <div className="p-3.5 rounded-2xl bg-[#090e18] border border-[#182338]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Notes</span>
              <p className="text-xs text-slate-300 leading-relaxed">{row.notes}</p>
            </div>
          )}

          {/* Goal Theory & Nutritional Guidance Pill */}
          {guidance && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-[#121c2e] to-[#0c1424] border border-[#1f2e4a]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen size={16} className="text-[#ccff00]" />
                  <span className="text-xs font-black text-white uppercase tracking-wider">
                    Theory & Target Guidance
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTheory(!showTheory)}
                  className="text-[11px] font-bold text-[#ccff00] hover:underline"
                >
                  {showTheory ? 'Hide guidance' : 'View guidance'}
                </button>
              </div>

              {showTheory && (
                <div className="mt-3 pt-3 border-t border-[#1e2d45] space-y-2 text-xs">
                  <p className="text-slate-300 font-medium">{guidance.summary}</p>
                  <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                    <div className="p-2 rounded-xl bg-[#090d16] border border-[#182338]">
                      <span className="text-slate-500 font-bold block">Calorie Strategy</span>
                      <span className="text-[#ccff00] font-bold">{guidance.calories}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-[#090d16] border border-[#182338]">
                      <span className="text-slate-500 font-bold block">Protein Range</span>
                      <span className="text-sky-400 font-bold">{guidance.protein}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Logged Meals List */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-white mb-2.5 flex items-center gap-1.5">
              <Utensils size={15} className="text-amber-400" /> Logged Meals ({foods.length})
            </h4>
            {loading ? (
              <p className="text-xs text-slate-500">Loading meals…</p>
            ) : foods.length === 0 ? (
              <p className="text-xs text-slate-500 p-3 rounded-2xl bg-[#090d16] border border-[#182338]">
                No meals recorded for this date.
              </p>
            ) : (
              <div className="space-y-1.5">
                {foods.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center justify-between text-xs bg-[#090d16] border border-[#182338] rounded-xl px-3 py-2.5"
                  >
                    <div>
                      <span className="text-white font-bold block">{f.food_name || f.meal_type || 'Food'}</span>
                      <span className="text-[10px] text-slate-400">
                        {f.meal_type} {f.protein ? `• ${f.protein}g P` : ''} {f.carbohydrates ? `• ${f.carbohydrates}g C` : ''}
                      </span>
                    </div>
                    <span className="text-[#ccff00] font-extrabold">{fmtInt(f.calories)} kcal</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Logged Workouts List */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-white mb-2.5 flex items-center gap-1.5">
              <Dumbbell size={15} className="text-[#ccff00]" /> Logged Workouts ({exercises.length})
            </h4>
            {loading ? (
              <p className="text-xs text-slate-500">Loading workouts…</p>
            ) : exercises.length === 0 ? (
              <p className="text-xs text-slate-500 p-3 rounded-2xl bg-[#090d16] border border-[#182338]">
                No workouts recorded for this date.
              </p>
            ) : (
              <div className="space-y-1.5">
                {exercises.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between text-xs bg-[#090d16] border border-[#182338] rounded-xl px-3 py-2.5"
                  >
                    <div>
                      <span className="text-white font-bold block">{e.exercise_name || 'Workout'}</span>
                      <span className="text-[10px] text-slate-400">
                        {e.duration_minutes ? `${e.duration_minutes} mins` : ''}{e.sets ? ` • ${e.sets} sets` : ''}{e.reps ? ` • ${e.reps} reps` : ''}
                      </span>
                    </div>
                    <span className="text-orange-400 font-extrabold">{fmtInt(e.calories_burned)} kcal</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Link
            to="/daily"
            onClick={onClose}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[#ccff00] hover:bg-[#bbf000] text-black font-black text-xs uppercase tracking-wider transition shadow-[0_0_15px_rgba(204,255,0,0.3)] active:scale-95"
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
    <div className="bg-[#121c2e] border border-[#1c2940] rounded-xl px-2.5 py-1.5">
      <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
        <Icon size={11} /> {label}
      </div>
      <div className={`text-xs font-black mt-0.5 ${className}`}>{value}</div>
    </div>
  );
}
