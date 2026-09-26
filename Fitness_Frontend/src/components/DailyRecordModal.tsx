import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Droplets, Dumbbell, Flame, Footprints, Target, Utensils, X } from 'lucide-react';
import { apiClient } from '../lib/api';
import { formatDay, todayKey, verdictClass, type DailyRow } from '../lib/dailyHistory';
import { Ring } from './ui';
import { fmtInt } from '../lib/format';

export default function DailyRecordModal({
  row,
  userId,
  onClose,
}: {
  row: DailyRow | null;
  userId?: string;
  onClose: () => void;
}) {
  const [foods, setFoods] = useState<any[]>([]);
  const [exercises, setExercises] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

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
        const foodList = Array.isArray(foodData) ? foodData : [];
        setFoods(
          row.id
            ? foodList.filter((f: any) => f.daily_record_id === row.id || dateOf(f) === row.date)
            : foodList.filter((f: any) => dateOf(f) === row.date),
        );
        const exList = Array.isArray(exData) ? exData : [];
        setExercises(
          row.id
            ? exList.filter((e: any) => e.daily_record_id === row.id || dateOf(e) === row.date)
            : exList.filter((e: any) => dateOf(e) === row.date),
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-5 border-b border-slate-800 sticky top-0 bg-slate-900 rounded-t-3xl z-10">
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Daily record</div>
            <h3 className="text-xl font-bold text-white">
              {formatDay(row.date, { weekday: 'long', month: 'long', day: 'numeric' })}
            </h3>
            <p className="text-sm text-slate-400 capitalize mt-0.5">
              {isToday ? 'Today · ' : ''}{row.goalType}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1" aria-label="Close">
            <X size={22} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="flex items-center gap-5">
            <Ring percent={pct} size={120}>
              <div className="text-[10px] text-slate-500 uppercase">Intake</div>
              <div className="text-lg font-extrabold text-white leading-tight">{fmtInt(row.consumed)}</div>
              <div className="text-[11px] text-slate-500">{row.target ? `/ ${fmtInt(row.target)}` : 'kcal'}</div>
            </Ring>
            <div className="flex-1 space-y-2">
              <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold border ${verdictClass[row.verdict.tone]}`}>
                {hasLog ? row.verdict.label : 'Not logged'}
              </span>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <Stat icon={Utensils} label="Intake" value={`${fmtInt(row.consumed)} kcal`} className="text-brand-300" />
                <Stat icon={Flame} label="Burned" value={`${fmtInt(row.burned)} kcal`} className="text-orange-300" />
                <Stat icon={Target} label="Net" value={`${fmtInt(row.net)} kcal`} className="text-white" />
                <Stat icon={Droplets} label="Water" value={`${fmtInt(row.water)} ml`} className="text-sky-300" />
              </div>
              <div className="text-sm text-violet-300 flex items-center gap-1.5">
                <Footprints size={14} /> {row.steps.toLocaleString()} steps
              </div>
            </div>
          </div>

          {row.notes && (
            <p className="text-sm text-slate-400 bg-slate-950/60 border border-slate-800 rounded-xl p-3">{row.notes}</p>
          )}

          <div>
            <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-1.5">
              <Utensils size={14} className="text-brand-400" /> Meals
            </h4>
            {loading ? (
              <p className="text-xs text-slate-500">Loading…</p>
            ) : foods.length === 0 ? (
              <p className="text-xs text-slate-500">No meals logged this day.</p>
            ) : (
              <ul className="space-y-1.5">
                {foods.map((f: any) => (
                  <li key={f.id} className="flex justify-between text-sm bg-slate-950/50 border border-slate-800 rounded-lg px-3 py-2">
                    <span className="text-slate-200">{f.foods?.name || f.name || f.meal_type || 'Food'}</span>
                    <span className="text-brand-300 font-semibold">{fmtInt(f.calories)} kcal</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-1.5">
              <Dumbbell size={14} className="text-orange-400" /> Workouts
            </h4>
            {loading ? (
              <p className="text-xs text-slate-500">Loading…</p>
            ) : exercises.length === 0 ? (
              <p className="text-xs text-slate-500">No workouts logged this day.</p>
            ) : (
              <ul className="space-y-1.5">
                {exercises.map((e: any) => (
                  <li key={e.id} className="flex justify-between text-sm bg-slate-950/50 border border-slate-800 rounded-lg px-3 py-2">
                    <span className="text-slate-200">{e.exercises?.name || e.name || 'Workout'}</span>
                    <span className="text-orange-300 font-semibold">{fmtInt(e.calories_burned)} kcal</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Link
            to="/daily"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-brand-400 hover:bg-brand-300 text-slate-950 font-bold"
          >
            <ArrowRight size={16} /> {isToday ? 'Log more today' : 'Open Daily Tracker'}
          </Link>
        </div>
      </div>
    </div>
  );
}

function dateOf(item: any) {
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
    <div className="bg-slate-950/50 border border-slate-800 rounded-lg px-2.5 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-slate-500 flex items-center gap-1">
        <Icon size={10} /> {label}
      </div>
      <div className={`text-xs font-bold ${className}`}>{value}</div>
    </div>
  );
}
