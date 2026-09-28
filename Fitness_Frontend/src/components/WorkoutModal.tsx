import { useState, useEffect } from 'react';
import { X, Play, Pause, RotateCcw, CheckCircle2, Flame, Clock, Dumbbell, ShieldCheck } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { useAuthStore } from '../store/auth';
import { ensureTodayRecord, useInvalidateDaily } from '../lib/queries';

interface ExerciseItem {
  id: number;
  name: string;
  sets: string;
  reps: string;
  notes: string;
  done: boolean;
}

export default function WorkoutModal({
  open,
  onClose,
  initialRunning = false,
}: {
  open: boolean;
  onClose: () => void;
  initialRunning?: boolean;
}) {
  const [exercises, setExercises] = useState<ExerciseItem[]>([]);
  const [seconds, setSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(initialRunning);
  const [logging, setLogging] = useState(false);
  const [completed, setCompleted] = useState(false);

  const user = useAuthStore((s) => s.user);
  const uid = user?.id;
  const qc = useQueryClient();
  const invalidateDaily = useInvalidateDaily();

  useEffect(() => {
    if (initialRunning) setTimerRunning(true);
  }, [initialRunning]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (timerRunning) {
      interval = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerRunning]);

  if (!open) return null;

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const toggleExercise = (id: number) => {
    setExercises((prev) =>
      prev.map((ex) => (ex.id === id ? { ...ex, done: !ex.done } : ex))
    );
  };

  const completedCount = exercises.filter((e) => e.done).length;

  const handleFinishWorkout = async () => {
    if (!uid) return;
    setLogging(true);
    try {
      const todayRec = await ensureTodayRecord(qc, uid);
      const minutes = Math.max(1, Math.round(seconds / 60));
      await apiClient.createDailyExercise({
        user_id: uid,
        daily_record_id: todayRec?.id,
        exercise_name: '',
        duration_minutes: minutes,
        calories_burned: 0,
        sets: 0,
        reps: 0,
      });
      invalidateDaily(uid);
      setCompleted(true);
      setTimerRunning(false);
      setTimeout(() => {
        setCompleted(false);
        onClose();
      }, 1500);
    } catch {
      alert('Could not record workout. Please try again.');
    } finally {
      setLogging(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="border border-panel-border bg-panel-card rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top */}
        <div className="flex items-center justify-between p-5 border-b border-panel-border">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-brand-400/15 text-brand-300 mb-1">
              Custom workout
            </div>
            <h3 className="text-xl font-black text-white tracking-tight">Custom Workout</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white transition hover:bg-white/5"
          >
            <X size={18} />
          </button>
        </div>

        {/* Stopwatch & Metrics Banner */}
        <div className="p-5 border-b border-panel-border bg-ink flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-2xl border border-panel-border bg-ink/60 flex items-center gap-2">
              <Clock size={18} className="text-[#ccff00] animate-pulse" />
              <span className="text-2xl font-mono font-black text-white tracking-wider">
                {formatTimer(seconds)}
              </span>
            </div>
            <button
              onClick={() => setTimerRunning(!timerRunning)}
              className={`p-2.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
                timerRunning
                  ? 'border border-panel-border text-slate-300 hover:text-white'
                  : 'bg-brand-400 hover:bg-brand-300 text-ink font-extrabold'
              }`}
            >
              {timerRunning ? <Pause size={16} /> : <Play size={16} />}
              <span className="text-xs">{timerRunning ? 'Pause' : 'Start'}</span>
            </button>
            <button
              onClick={() => {
                setTimerRunning(false);
                setSeconds(0);
              }}
              className="p-2.5 rounded-xl text-slate-400 hover:text-white transition hover:bg-white/5"
              title="Reset Timer"
            >
              <RotateCcw size={16} />
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs font-semibold">
            <div className="flex items-center gap-1 text-slate-300">
              <Flame size={14} className="text-slate-400" />
              <span>~{Math.round(seconds * 0.16)} kcal</span>
            </div>
            <div className="flex items-center gap-1 text-slate-300">
              <Dumbbell size={14} className="text-slate-400" />
              <span>{completedCount}/{exercises.length} sets</span>
            </div>
          </div>
        </div>

        {/* Exercises Checklist */}
        <div className="p-5 max-h-[50vh] overflow-y-auto space-y-2.5">
          <p className="text-xs font-semibold text-slate-400 mb-2">
            Workout routine ({exercises.length} movements)
          </p>

          {exercises.map((ex) => (
            <div
              key={ex.id}
              onClick={() => toggleExercise(ex.id)}
              className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                ex.done
                  ? 'border-brand-500/30 bg-brand-400/10 text-slate-300'
                  : 'border-panel-border bg-panel-card hover:border-slate-600 text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className={`w-6 h-6 rounded-lg border flex items-center justify-center transition shrink-0 ${
                    ex.done
                      ? 'bg-brand-400 border-brand-400 text-ink'
                      : 'border-slate-600 bg-white/5'
                  }`}
                >
                  {ex.done && <CheckCircle2 size={16} className="stroke-[3]" />}
                </button>
                <div>
                  <div className={`text-sm font-bold ${ex.done ? 'line-through text-slate-400' : 'text-white'}`}>
                    {ex.name}
                  </div>
                  <div className="text-xs text-slate-400">
                    <span className="text-brand-300 font-medium">{ex.sets}</span> • {ex.reps} •{' '}
                    <span className="italic text-slate-500">{ex.notes}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Button */}
        <div className="p-5 border-t border-panel-border bg-panel-card flex items-center justify-between gap-4">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <ShieldCheck size={16} className="text-slate-400" />
            <span>Records to daily burn</span>
          </div>

          <button
            onClick={handleFinishWorkout}
            disabled={logging || completed}
            className="px-6 py-3 rounded-xl bg-brand-400 hover:bg-brand-300 text-ink font-extrabold text-sm transition disabled:opacity-50 flex items-center gap-2"
          >
            {completed ? (
              <>
                <CheckCircle2 size={18} />
                <span>Workout logged</span>
              </>
            ) : logging ? (
              'Saving...'
            ) : (
              'Finish & log workout'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
