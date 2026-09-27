import { useState } from 'react';
import { X, Utensils, Dumbbell, Droplets, Footprints, Scale, Check, Plus, Sparkles } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { useAuthStore } from '../store/auth';
import { ensureTodayRecord, useInvalidateDaily } from '../lib/queries';

export type QuickLogTab = 'food' | 'workout' | 'water' | 'steps' | 'weight';

const FOOD_PRESETS = [
  { name: 'Oatmeal & Berries', meal: 'Breakfast', cal: 380, p: 14, c: 62, f: 6 },
  { name: 'Grilled Chicken & Rice', meal: 'Lunch', cal: 540, p: 48, c: 58, f: 10 },
  { name: 'Whey Protein Shake', meal: 'Snack', cal: 180, p: 30, c: 5, f: 2 },
  { name: 'Salmon & Sweet Potato', meal: 'Dinner', cal: 620, p: 42, c: 45, f: 22 },
];

const WORKOUT_PRESETS = [
  { name: 'Lower Body Power', duration: 45, burned: 380, sets: 4, reps: 10 },
  { name: 'Upper Body Hypertrophy', duration: 45, burned: 350, sets: 4, reps: 12 },
  { name: 'HIIT Cardio Circuit', duration: 30, burned: 300, sets: 3, reps: 20 },
  { name: 'Core & Mobility', duration: 25, burned: 160, sets: 3, reps: 15 },
];

export default function QuickLogModal({
  open,
  onClose,
  initialTab = 'food',
}: {
  open: boolean;
  onClose: () => void;
  initialTab?: QuickLogTab;
}) {
  const [tab, setTab] = useState<QuickLogTab>(initialTab);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Food form
  const [mealType, setMealType] = useState('Breakfast');
  const [foodName, setFoodName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');

  // Workout form
  const [workoutName, setWorkoutName] = useState('');
  const [duration, setDuration] = useState('30');
  const [burned, setBurned] = useState('250');
  const [sets, setSets] = useState('3');
  const [reps, setReps] = useState('12');

  // Water form
  const [waterAmount, setWaterAmount] = useState('250');

  // Steps form
  const [stepCount, setStepCount] = useState('1000');

  // Weight form
  const [weightKg, setWeightKg] = useState('');

  const user = useAuthStore((s) => s.user);
  const uid = user?.id;
  const qc = useQueryClient();
  const invalidateDaily = useInvalidateDaily();

  if (!open) return null;

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => {
      setSuccessMsg(null);
      onClose();
    }, 1200);
  };

  const applyFoodPreset = (p: typeof FOOD_PRESETS[0]) => {
    setFoodName(p.name);
    setMealType(p.meal);
    setCalories(String(p.cal));
    setProtein(String(p.p));
    setCarbs(String(p.c));
    setFat(String(p.f));
  };

  const applyWorkoutPreset = (p: typeof WORKOUT_PRESETS[0]) => {
    setWorkoutName(p.name);
    setDuration(String(p.duration));
    setBurned(String(p.burned));
    setSets(String(p.sets));
    setReps(String(p.reps));
  };

  const handleLogFood = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid || !foodName.trim() || !calories) return;
    setSubmitting(true);
    try {
      const todayRec = await ensureTodayRecord(qc, uid);
      await apiClient.createDailyFood({
        user_id: uid,
        daily_record_id: todayRec?.id,
        food_name: foodName.trim(),
        meal_type: mealType,
        calories: Number(calories) || 0,
        protein: Number(protein) || 0,
        carbohydrates: Number(carbs) || 0,
        fat: Number(fat) || 0,
        serving_size: '1 serving',
      });
      invalidateDaily(uid);
      showSuccess(`Logged ${foodName} (+${calories} kcal)!`);
    } catch {
      alert('Failed to log food. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogWorkout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid || !workoutName.trim()) return;
    setSubmitting(true);
    try {
      const todayRec = await ensureTodayRecord(qc, uid);
      await apiClient.createDailyExercise({
        user_id: uid,
        daily_record_id: todayRec?.id,
        exercise_name: workoutName.trim(),
        duration_minutes: Number(duration) || 0,
        calories_burned: Number(burned) || 0,
        sets: Number(sets) || 0,
        reps: Number(reps) || 0,
      });
      invalidateDaily(uid);
      showSuccess(`Logged ${workoutName} (-${burned} kcal)!`);
    } catch {
      alert('Failed to log workout. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogWater = async (amount: number) => {
    if (!uid) return;
    setSubmitting(true);
    try {
      await apiClient.createWaterIntake({
        user_id: uid,
        amount_ml: amount,
      });
      invalidateDaily(uid);
      showSuccess(`Added +${amount} ml water!`);
    } catch {
      alert('Failed to log water. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogSteps = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid || !stepCount) return;
    setSubmitting(true);
    try {
      const todayRec = await ensureTodayRecord(qc, uid);
      const current = Number(todayRec?.steps) || 0;
      const additional = Number(stepCount) || 0;
      if (todayRec?.id) {
        await apiClient.updateDailyRecord(todayRec.id, {
          steps: current + additional,
        });
      }
      invalidateDaily(uid);
      showSuccess(`Added +${additional.toLocaleString()} steps!`);
    } catch {
      alert('Failed to update steps.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogWeight = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid || !weightKg) return;
    setSubmitting(true);
    try {
      await apiClient.createWeightHistory({
        user_id: uid,
        weight: Number(weightKg),
        recorded_at: new Date().toISOString(),
      });
      qc.invalidateQueries({ queryKey: ['weight-history', uid] });
      showSuccess(`Weight updated to ${weightKg} kg!`);
    } catch {
      alert('Failed to log weight.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-[#0f1626] border border-[#1a263d] rounded-2xl sm:rounded-3xl w-full max-w-lg shadow-2xl flex flex-col max-h-[92dvh] sm:max-h-[88vh] overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow Header Accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-[#ccff00] blur-sm rounded-full pointer-events-none" />

        {/* Modal Top Header (Sticky) */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#182338] bg-[#0f1626] shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-[#ccff00] text-black font-black flex items-center justify-center text-sm shadow-[0_0_12px_rgba(204,255,0,0.35)] shrink-0">
              +
            </span>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white tracking-tight">Quick Log</h3>
              <p className="text-[11px] sm:text-xs text-slate-400">Record daily intake, workouts & stats</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white transition"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Responsive Tab Bar (Touch-friendly & Horizontal Scroll on Mobile) */}
        <div className="flex sm:grid sm:grid-cols-5 gap-1.5 p-2 bg-[#090d16] border-b border-[#182338] overflow-x-auto no-scrollbar shrink-0">
          {[
            { id: 'food', label: 'Food', icon: Utensils, color: 'text-amber-400' },
            { id: 'workout', label: 'Workout', icon: Dumbbell, color: 'text-[#ccff00]' },
            { id: 'water', label: 'Water', icon: Droplets, color: 'text-cyan-400' },
            { id: 'steps', label: 'Steps', icon: Footprints, color: 'text-emerald-400' },
            { id: 'weight', label: 'Weight', icon: Scale, color: 'text-indigo-400' },
          ].map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id as QuickLogTab)}
                className={`flex flex-col items-center justify-center gap-1 py-2 px-3 sm:px-1 min-w-[70px] sm:min-w-0 rounded-xl font-bold transition text-xs shrink-0 ${
                  active
                    ? 'bg-[#152033] text-white border border-[#223352] shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
                }`}
              >
                <t.icon size={16} className={active ? t.color : 'text-slate-500'} />
                <span className="text-[11px] tracking-tight">{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 overscroll-contain">
          {successMsg ? (
            <div className="py-12 text-center flex flex-col items-center justify-center gap-3">
              <div className="w-14 h-14 rounded-full bg-[#ccff00]/20 border border-[#ccff00] text-[#ccff00] flex items-center justify-center animate-bounce shadow-[0_0_20px_rgba(204,255,0,0.3)]">
                <Check size={28} className="stroke-[3]" />
              </div>
              <p className="text-white font-black text-base">{successMsg}</p>
            </div>
          ) : (
            <>
              {/* FOOD TAB */}
              {tab === 'food' && (
                <form onSubmit={handleLogFood} className="space-y-4">
                  {/* Meal Category Pills */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Meal Type
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {['Breakfast', 'Lunch', 'Dinner', 'Snack'].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setMealType(m)}
                          className={`py-2 px-1 rounded-xl text-xs font-bold transition flex items-center justify-center ${
                            mealType === m
                              ? 'bg-[#ccff00] text-black shadow-[0_0_10px_rgba(204,255,0,0.25)]'
                              : 'bg-[#141f33] text-slate-300 hover:bg-[#1a2842]'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quick Food Presets */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        <Sparkles size={12} className="text-[#ccff00]" />
                        <span>Quick Presets</span>
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {FOOD_PRESETS.map((p, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => applyFoodPreset(p)}
                          className="text-left p-2 rounded-xl bg-[#090d16] hover:bg-[#121c2e] border border-[#182338] hover:border-slate-600 transition"
                        >
                          <div className="text-xs font-bold text-white truncate">{p.name}</div>
                          <div className="text-[10px] text-slate-400 flex items-center justify-between mt-0.5">
                            <span className="text-[#ccff00] font-semibold">{p.cal} kcal</span>
                            <span>{p.p}g P</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Food / Item Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Grilled Chicken Quinoa Bowl"
                      value={foodName}
                      onChange={(e) => setFoodName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a0e18] border border-[#1e2c45] text-white text-base sm:text-sm focus:border-[#ccff00] focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">Calories</label>
                      <input
                        type="number"
                        required
                        placeholder="kcal"
                        value={calories}
                        onChange={(e) => setCalories(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-xl bg-[#0a0e18] border border-[#1e2c45] text-white text-base sm:text-sm focus:border-[#ccff00] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-sky-400 mb-1">Protein</label>
                      <input
                        type="number"
                        placeholder="g"
                        value={protein}
                        onChange={(e) => setProtein(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-xl bg-[#0a0e18] border border-[#1e2c45] text-white text-base sm:text-sm focus:border-sky-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-amber-400 mb-1">Carbs</label>
                      <input
                        type="number"
                        placeholder="g"
                        value={carbs}
                        onChange={(e) => setCarbs(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-xl bg-[#0a0e18] border border-[#1e2c45] text-white text-base sm:text-sm focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-purple-400 mb-1">Fat</label>
                      <input
                        type="number"
                        placeholder="g"
                        value={fat}
                        onChange={(e) => setFat(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-xl bg-[#0a0e18] border border-[#1e2c45] text-white text-base sm:text-sm focus:border-purple-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 rounded-xl bg-[#ccff00] hover:bg-[#bbf000] text-black font-black text-sm uppercase tracking-wider transition shadow-[0_0_15px_rgba(204,255,0,0.3)] disabled:opacity-50 active:scale-95"
                  >
                    {submitting ? 'Saving...' : 'Add Meal'}
                  </button>
                </form>
              )}

              {/* WORKOUT TAB */}
              {tab === 'workout' && (
                <form onSubmit={handleLogWorkout} className="space-y-4">
                  {/* Workout Presets */}
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 mb-1.5">
                      <Sparkles size={12} className="text-[#ccff00]" />
                      <span>Popular Routines</span>
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {WORKOUT_PRESETS.map((p, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => applyWorkoutPreset(p)}
                          className="text-left p-2 rounded-xl bg-[#090d16] hover:bg-[#121c2e] border border-[#182338] hover:border-slate-600 transition"
                        >
                          <div className="text-xs font-bold text-white truncate">{p.name}</div>
                          <div className="text-[10px] text-slate-400 flex items-center justify-between mt-0.5">
                            <span className="text-[#ccff00] font-semibold">~{p.burned} kcal</span>
                            <span>{p.duration}m</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Exercise / Routine Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Lower Body Power"
                      value={workoutName}
                      onChange={(e) => setWorkoutName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a0e18] border border-[#1e2c45] text-white text-base sm:text-sm focus:border-[#ccff00] focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1">Duration (minutes)</label>
                      <input
                        type="number"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#0a0e18] border border-[#1e2c45] text-white text-base sm:text-sm focus:border-[#ccff00] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#ccff00] mb-1">Calories Burned (kcal)</label>
                      <input
                        type="number"
                        value={burned}
                        onChange={(e) => setBurned(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#0a0e18] border border-[#1e2c45] text-white text-base sm:text-sm focus:border-[#ccff00] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1">Sets</label>
                      <input
                        type="number"
                        value={sets}
                        onChange={(e) => setSets(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#0a0e18] border border-[#1e2c45] text-white text-base sm:text-sm focus:border-[#ccff00] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1">Reps</label>
                      <input
                        type="number"
                        value={reps}
                        onChange={(e) => setReps(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#0a0e18] border border-[#1e2c45] text-white text-base sm:text-sm focus:border-[#ccff00] focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 rounded-xl bg-[#ccff00] hover:bg-[#bbf000] text-black font-black text-sm uppercase tracking-wider transition shadow-[0_0_15px_rgba(204,255,0,0.3)] disabled:opacity-50 active:scale-95"
                  >
                    {submitting ? 'Saving...' : 'Log Workout'}
                  </button>
                </form>
              )}

              {/* WATER TAB */}
              {tab === 'water' && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-400 text-center font-medium">
                    Tap a quick amount or enter a custom intake
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {[250, 500, 1000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => handleLogWater(amt)}
                        disabled={submitting}
                        className="py-4 px-2 rounded-2xl bg-[#141f33] hover:bg-cyan-950/60 border border-[#223352] hover:border-cyan-400 text-white font-extrabold text-sm transition flex flex-col items-center justify-center gap-1.5 active:scale-95"
                      >
                        <Droplets size={22} className="text-cyan-400" />
                        <span>+{amt} ml</span>
                      </button>
                    ))}
                  </div>

                  <div className="pt-3 border-t border-[#182338]">
                    <label className="block text-xs font-bold text-slate-300 mb-1">Custom Amount (ml)</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={waterAmount}
                        onChange={(e) => setWaterAmount(e.target.value)}
                        className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#0a0e18] border border-[#1e2c45] text-white text-base sm:text-sm focus:border-cyan-400 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleLogWater(Number(waterAmount) || 0)}
                        disabled={submitting || !waterAmount}
                        className="px-5 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-sm transition disabled:opacity-50 active:scale-95"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* STEPS TAB */}
              {tab === 'steps' && (
                <form onSubmit={handleLogSteps} className="space-y-4">
                  <p className="text-xs text-slate-400 text-center font-medium">
                    Quick-add steps to your daily progress
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {[1000, 2500, 5000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setStepCount(String(amt))}
                        className={`py-3 rounded-2xl border text-xs font-black transition flex items-center justify-center gap-1 ${
                          stepCount === String(amt)
                            ? 'bg-[#ccff00] text-black border-[#ccff00] shadow-[0_0_10px_rgba(204,255,0,0.3)]'
                            : 'bg-[#141f33] text-white border-[#223352] hover:border-slate-500'
                        }`}
                      >
                        <Plus size={14} className="stroke-[3]" /> {amt.toLocaleString()}
                      </button>
                    ))}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Additional Steps</label>
                    <input
                      type="number"
                      required
                      value={stepCount}
                      onChange={(e) => setStepCount(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a0e18] border border-[#1e2c45] text-white text-base sm:text-sm focus:border-[#ccff00] focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || !stepCount}
                    className="w-full py-3 rounded-xl bg-[#ccff00] hover:bg-[#bbf000] text-black font-black text-sm uppercase tracking-wider transition shadow-[0_0_15px_rgba(204,255,0,0.3)] disabled:opacity-50 active:scale-95"
                  >
                    {submitting ? 'Updating...' : 'Add Steps'}
                  </button>
                </form>
              )}

              {/* WEIGHT TAB */}
              {tab === 'weight' && (
                <form onSubmit={handleLogWeight} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Current Body Weight (kg)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      placeholder="e.g. 74.5"
                      value={weightKg}
                      onChange={(e) => setWeightKg(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a0e18] border border-[#1e2c45] text-white text-base sm:text-sm focus:border-indigo-400 focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting || !weightKg}
                    className="w-full py-3 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-black text-sm uppercase tracking-wider transition shadow-[0_0_15px_rgba(99,102,241,0.3)] disabled:opacity-50 active:scale-95"
                  >
                    {submitting ? 'Saving...' : 'Update Weight'}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
