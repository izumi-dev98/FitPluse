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

const DEFAULT_EXERCISES: ExerciseItem[] = [
  { id: 1, name: 'Barbell Back Squat', sets: '4 sets', reps: '10 reps', notes: 'Warm up then 75% 1RM', done: false },
  { id: 2, name: 'Romanian Deadlifts', sets: '3 sets', reps: '12 reps', notes: 'Focus on hamstring stretch', done: false },
  { id: 3, name: 'Bulgarian Split Squats', sets: '3 sets', reps: '10 reps/leg', notes: 'Elevate rear foot on bench', done: false },
  { id: 4, name: 'Standing Calf Raises', sets: '4 sets', reps: '15 reps', notes: '2 second pause at top', done: false },
  { id: 5, name: 'Dumbbell Walking Lunges', sets: '3 sets', reps: '12 reps/leg', notes: 'Maintain torso upright', done: false },
];

export default function WorkoutModal({
  open,
  onClose,
  initialRunning = false,
}: {
  open: boolean;
  onClose: () => void;
  initialRunning?: boolean;
}) {
  const [exercises, setExercises] = useState<ExerciseItem[]>(DEFAULT_EXERCISES);
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
      const minutes = Math.max(1, Math.round(seconds / 60)) || 45;
      await apiClient.createDailyExercise({
        user_id: uid,
        daily_record_id: todayRec?.id,
        exercise_name: 'Lower Body Power',
        duration_minutes: minutes,
        calories_burned: 380,
        sets: 17,
        reps: 150,
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-[#0f1626] border border-[#1a263d] rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#ccff00] to-transparent" />

        {/* Modal Top */}
        <div className="flex items-center justify-between p-5 border-b border-[#182338]">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#ccff00]/15 text-[#ccff00] border border-[#ccff00]/30 mb-1">
              Lower Body Focus
            </div>
            <h3 className="text-xl font-black text-white tracking-tight">Lower Body Power</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Stopwatch & Metrics Banner */}
        <div className="p-5 bg-[#090d16] border-b border-[#182338] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-2xl bg-[#141f33] border border-[#1e2c45] flex items-center gap-2">
              <Clock size={18} className="text-[#ccff00] animate-pulse" />
              <span className="text-2xl font-mono font-black text-white tracking-wider">
                {formatTimer(seconds)}
              </span>
            </div>
            <button
              onClick={() => setTimerRunning(!timerRunning)}
              className={`p-2.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
                timerRunning
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30'
                  : 'bg-[#ccff00] text-black font-extrabold shadow-[0_0_12px_rgba(204,255,0,0.3)] hover:bg-[#bbf000]'
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
              className="p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white transition"
              title="Reset Timer"
            >
              <RotateCcw size={16} />
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs font-semibold">
            <div className="flex items-center gap-1 text-slate-300">
              <Flame size={14} className="text-orange-400" />
              <span>~380 kcal</span>
            </div>
            <div className="flex items-center gap-1 text-slate-300">
              <Dumbbell size={14} className="text-[#ccff00]" />
              <span>{completedCount}/{exercises.length} sets</span>
            </div>
          </div>
        </div>

        {/* Exercises Checklist */}
        <div className="p-5 max-h-[50vh] overflow-y-auto space-y-2.5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Workout Routine ({exercises.length} Movements)
          </p>

          {exercises.map((ex) => (
            <div
              key={ex.id}
              onClick={() => toggleExercise(ex.id)}
              className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                ex.done
                  ? 'bg-[#142322] border-[#2dd4bf]/40 text-slate-300'
                  : 'bg-[#121a2c] border-[#1c2940] hover:border-slate-600 text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className={`w-6 h-6 rounded-lg border flex items-center justify-center transition shrink-0 ${
                    ex.done
                      ? 'bg-[#ccff00] border-[#ccff00] text-black shadow-[0_0_8px_rgba(204,255,0,0.3)]'
                      : 'border-slate-600 bg-slate-900/60'
                  }`}
                >
                  {ex.done && <CheckCircle2 size={16} className="stroke-[3]" />}
                </button>
                <div>
                  <div className={`text-sm font-bold ${ex.done ? 'line-through text-slate-400' : 'text-white'}`}>
                    {ex.name}
                  </div>
                  <div className="text-xs text-slate-400">
                    <span className="text-[#ccff00] font-medium">{ex.sets}</span> • {ex.reps} •{' '}
                    <span className="italic text-slate-500">{ex.notes}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Button */}
        <div className="p-5 border-t border-[#182338] bg-[#090d16] flex items-center justify-between gap-4">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <ShieldCheck size={16} className="text-[#ccff00]" />
            <span>Records to Daily Burn</span>
          </div>

          <button
            onClick={handleFinishWorkout}
            disabled={logging || completed}
            className="px-6 py-3 rounded-xl bg-[#ccff00] hover:bg-[#bbf000] text-black font-extrabold text-sm transition shadow-[0_0_15px_rgba(204,255,0,0.3)] disabled:opacity-50 flex items-center gap-2"
          >
            {completed ? (
              <>
                <CheckCircle2 size={18} />
                <span>Workout Logged!</span>
              </>
            ) : logging ? (
              'Saving...'
            ) : (
              'Finish & Log Workout (+380 kcal)'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
