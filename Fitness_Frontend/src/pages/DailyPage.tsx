import { useState, useRef, type ElementType } from 'react';
import { CalendarDays, Plus, X, Utensils, Dumbbell, Image as ImageIcon, Target, Droplets, Footprints } from 'lucide-react';
import Swal from 'sweetalert2';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { useAuthStore } from '../store/auth';
import { Card, EmptyState, MacroRow, PageHeader, Ring } from '../components/ui';
import {
  ensureTodayRecord,
  useBodyImages,
  useDailyExercises,
  useDailyFoods,
  useDailyRecords,
  useExercises,
  useFoods,
  useGoals,
  useInvalidateDaily,
  useWaterIntake,
} from '../lib/queries';

type TabType = 'food' | 'exercise' | 'water' | 'body';
const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const;
const WATER_GOAL = 2500;
const STEPS_GOAL = 8000;

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function DailyPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('food');

  const [foodSearch, setFoodSearch] = useState('');
  const [selectedFood, setSelectedFood] = useState<any>(null);
  const [foodQty, setFoodQty] = useState(1);
  const [foodMeal, setFoodMeal] = useState('Breakfast');

  const [exerciseSearch, setExerciseSearch] = useState('');
  const [selectedExercise, setSelectedExercise] = useState<any>(null);
  const [exLog, setExLog] = useState({ sets: 3, reps: 10, duration_minutes: 30, calories_burned: 200 });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageType, setImageType] = useState<'front' | 'side' | 'back'>('front');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [stepInput, setStepInput] = useState('');

  const user = useAuthStore((s) => s.user);
  const uid = user?.id;
  const qc = useQueryClient();
  const invalidateDaily = useInvalidateDaily();

  // Shared cached queries (same keys as Dashboard) — revisits render instantly.
  const goalsQ = useGoals(uid);
  const recordsQ = useDailyRecords(uid);
  const foodsQ = useFoods(uid);
  const exercisesQ = useExercises(uid);
  const bodyImagesQ = useBodyImages(uid);
  const waterQ = useWaterIntake(uid);
  const dailyExercisesQ = useDailyExercises(uid);

  const goals = goalsQ.data ?? [];
  const records = recordsQ.data ?? [];
  const foods = foodsQ.data ?? [];
  const exercises = exercisesQ.data ?? [];
  const bodyImages = bodyImagesQ.data ?? [];
  const waters = waterQ.data ?? [];
  const allLoggedExercises = dailyExercisesQ.data ?? [];

  const today = todayStr();
  const rec = records.find((r: any) => r.record_date === today);
  const dailyFoodsQ = useDailyFoods(uid, rec?.id);
  const loggedFoods = dailyFoodsQ.data ?? [];

  const active = goals.find((g: any) => g.status === 'active');
  const goalCalories = active ? Number(active.target_calories ?? active.target_value) || null : null;
  const proteinTarget = active ? Number(active.protein_target) || 0 : 0;
  const fatTarget = active ? Number(active.fat_target) || 0 : 0;
  const carbTarget = active ? Number(active.carb_target) || 0 : 0;

  const loggedExercises = rec?.id
    ? allLoggedExercises.filter((e: any) => e.daily_record_id === rec.id)
    : [];
  const steps = Number(rec?.steps) || 0;
  const todayWater = waters.filter(
    (w: any) => String(w.recorded_at || w.created_at || '').slice(0, 10) === today,
  );
  const water =
    todayWater.reduce((s: number, w: any) => s + (Number(w.amount_ml) || 0), 0) ||
    Number(rec?.water_ml) ||
    0;

  async function persistRecord(patch: { water_ml?: number; steps?: number; calories_consumed?: number; calories_burned?: number }) {
    if (!uid) return;
    const todayRec = await ensureTodayRecord(qc, uid);
    await apiClient.createDailyRecord({
      user_id: uid,
      record_date: todayStr(),
      calories_consumed: patch.calories_consumed ?? todayRec?.calories_consumed ?? 0,
      calories_burned: patch.calories_burned ?? todayRec?.calories_burned ?? 0,
      water_ml: patch.water_ml ?? todayRec?.water_ml ?? 0,
      steps: patch.steps ?? todayRec?.steps ?? 0,
    });
    invalidateDaily(uid);
  }

  async function handleLogFood() {
    if (!selectedFood || !uid) return;
    try {
      const rec = await ensureTodayRecord(qc, uid);
      const q = Number(foodQty) || 1;
      await apiClient.createDailyFood({
        user_id: uid, daily_record_id: rec.id, food_id: selectedFood.id,
        meal_type: foodMeal, quantity: q,
        calories: (Number(selectedFood.calories) || 0) * q,
        protein: (Number(selectedFood.protein) || 0) * q,
        carbohydrates: (Number(selectedFood.carbohydrates) || 0) * q,
        fat: (Number(selectedFood.fat) || 0) * q,
      });
      setSelectedFood(null);
      setFoodQty(1);
      invalidateDaily(uid);
      Swal.fire({ icon: 'success', title: 'Food logged', timer: 1200, showConfirmButton: false });
    } catch {
      Swal.fire({ icon: 'error', title: 'Could not log food', confirmButtonColor: '#65a30d' });
    }
  }

  async function handleLogExercise() {
    if (!selectedExercise || !uid) return;
    try {
      const rec = await ensureTodayRecord(qc, uid);
      await apiClient.createDailyExercise({
        user_id: uid, daily_record_id: rec.id, exercise_id: selectedExercise.id,
        ...exLog,
      });
      setSelectedExercise(null);
      setExLog({ sets: 3, reps: 10, duration_minutes: 30, calories_burned: 200 });
      invalidateDaily(uid);
      Swal.fire({ icon: 'success', title: 'Workout logged', timer: 1200, showConfirmButton: false });
    } catch {
      Swal.fire({ icon: 'error', title: 'Could not log exercise', confirmButtonColor: '#65a30d' });
    }
  }

  async function handleUploadImage() {
    if (!imageFile || !uid) return;
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Could not read image'));
        reader.readAsDataURL(imageFile);
      });
      if (!apiClient.createBodyProgressImage) throw new Error('Image upload is unavailable');
      await apiClient.createBodyProgressImage({
        user_id: uid,
        image_url: base64,
        image_type: imageType,
      });
      setImageFile(null);
      setImagePreview(null);
      invalidateDaily(uid);
      Swal.fire({ icon: 'success', title: 'Photo saved', text: 'Your progress image was added.', timer: 1400, showConfirmButton: false });
    } catch {
      Swal.fire({ icon: 'error', title: 'Could not save photo', text: 'Please try again.', confirmButtonColor: '#65a30d' });
    }
  }

  async function addWater(ml: number) {
    if (!uid) return;
    try {
      await apiClient.createWaterIntake({ user_id: uid, amount_ml: ml });
      await persistRecord({ water_ml: water + ml });
      invalidateDaily(uid);
      Swal.fire({ icon: 'success', title: 'Water added', text: `${ml} ml added to today.`, timer: 1200, showConfirmButton: false });
    } catch {
      Swal.fire({ icon: 'error', title: 'Could not log water', confirmButtonColor: '#65a30d' });
    }
  }

  async function saveSteps() {
    if (!uid) return;
    const n = Number(stepInput);
    if (!n && n !== 0) return;
    try {
      await persistRecord({ steps: n });
      setStepInput('');
      invalidateDaily(uid);
      Swal.fire({ icon: 'success', title: 'Steps saved', text: `${n.toLocaleString()} steps saved for today.`, timer: 1200, showConfirmButton: false });
    } catch {
      Swal.fire({ icon: 'error', title: 'Could not save steps', confirmButtonColor: '#65a30d' });
    }
  }

  const filteredFoods = foods.filter(f => f.name?.toLowerCase().includes(foodSearch.toLowerCase()));
  const filteredExercises = exercises.filter(e => e.name?.toLowerCase().includes(exerciseSearch.toLowerCase()));

  const tabs: { key: TabType; label: string; icon: ElementType }[] = [
    { key: 'food', label: 'Food', icon: Utensils },
    { key: 'exercise', label: 'Exercise', icon: Dumbbell },
    { key: 'water', label: 'Water & Steps', icon: Droplets },
    { key: 'body', label: 'Photo', icon: ImageIcon },
  ];

  const todayFoodCal = loggedFoods.reduce((s: number, f: any) => s + (Number(f.calories) || 0), 0);
  const todayProtein = loggedFoods.reduce((s: number, f: any) => s + (Number(f.protein) || 0), 0);
  const todayFat = loggedFoods.reduce((s: number, f: any) => s + (Number(f.fat) || 0), 0);
  const todayCarbs = loggedFoods.reduce((s: number, f: any) => s + (Number(f.carbohydrates) || 0), 0);
  const todayExBurned = loggedExercises.reduce((s: number, e: any) => s + (Number(e.calories_burned) || 0), 0);
  const remaining = goalCalories != null ? goalCalories - todayFoodCal : null;
  const pct = goalCalories ? Math.round((todayFoodCal / goalCalories) * 100) : 0;

  function openLog(tab: TabType) {
    setActiveTab(tab);
    setModalOpen(true);
  }

  return (
    <div>
      <PageHeader
        title="Today's log"
        subtitle="Track food, workouts, water, and steps in one place."
        icon={CalendarDays}
        action={
          <button onClick={() => openLog('food')}
            className="px-5 py-2.5 rounded-xl bg-brand-400 hover:bg-brand-300 text-slate-950 font-bold shadow-lg shadow-brand-400/20 flex items-center gap-2">
            <Plus size={18} /> Add log
          </button>
        }
      />

      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        <Card className="lg:col-span-2 flex flex-col sm:flex-row items-center gap-6">
          <Ring percent={pct}>
            <div className="text-3xl font-extrabold text-white">{Math.round(todayFoodCal)}</div>
            <div className="text-[11px] text-slate-400">kcal eaten</div>
          </Ring>
          <div className="flex-1 w-full">
            <div className="grid grid-cols-3 gap-2 text-center mb-4">
              <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-3">
                <div className="text-[11px] text-slate-500">Target</div>
                <div className="font-bold text-white">{goalCalories ?? '—'}</div>
              </div>
              <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-3">
                <div className="text-[11px] text-slate-500">Left</div>
                <div className={`font-bold ${remaining != null && remaining < 0 ? 'text-amber-400' : 'text-brand-400'}`}>
                  {remaining == null ? '—' : remaining}
                </div>
              </div>
              <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-3">
                <div className="text-[11px] text-slate-500">Burned</div>
                <div className="font-bold text-orange-400">{todayExBurned}</div>
              </div>
            </div>
            <div className="space-y-3">
              <MacroRow label="Protein" current={todayProtein} target={proteinTarget} color="text-protein" bar="bg-protein" />
              <MacroRow label="Carbs" current={todayCarbs} target={carbTarget} color="text-carbs" bar="bg-carbs" />
              <MacroRow label="Fat" current={todayFat} target={fatTarget} color="text-fat" bar="bg-fat" />
            </div>
            {!goalCalories && (
              <a href="/goals" className="inline-flex items-center gap-1 text-sm text-brand-400 font-semibold mt-3">
                <Target size={14} /> Set a goal to see remaining calories
              </a>
            )}
          </div>
        </Card>

        <div className="space-y-3">
          <Card>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-white flex items-center gap-2"><Droplets size={16} className="text-sky-400" /> Water</span>
              <span className="text-xs text-slate-500">{water} / {WATER_GOAL} ml</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-3">
              <div className="h-full bg-sky-400 rounded-full" style={{ width: `${Math.min(100, Math.round((water / WATER_GOAL) * 100))}%` }} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[250, 500, 750].map((ml) => (
                <button key={ml} onClick={() => addWater(ml)}
                  className="py-2 rounded-lg bg-slate-800 hover:bg-sky-900/40 text-xs font-bold text-slate-200 border border-slate-700">
                  +{ml}
                </button>
              ))}
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-white flex items-center gap-2"><Footprints size={16} className="text-brand-400" /> Steps</span>
              <span className="text-xs text-slate-500">{steps.toLocaleString()} / {STEPS_GOAL.toLocaleString()}</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-3">
              <div className="h-full bg-brand-500 rounded-full" style={{ width: `${Math.min(100, Math.round((steps / STEPS_GOAL) * 100))}%` }} />
            </div>
            <div className="flex gap-2">
              <input type="number" min={0} placeholder="Steps today" value={stepInput} onChange={(e) => setStepInput(e.target.value)}
                className="flex-1 p-2 rounded-lg bg-ink border border-slate-700 text-white text-sm" />
              <button onClick={saveSteps} className="px-3 rounded-lg bg-brand-400 hover:bg-brand-300 text-slate-950 text-sm font-bold">Save</button>
            </div>
          </Card>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white flex items-center gap-2"><Utensils size={18} className="text-yellow-400" /> Meals</h3>
            <button onClick={() => openLog('food')} className="text-xs font-bold text-brand-400">+ Food</button>
          </div>
          {loggedFoods.length === 0 ? (
            <EmptyState title="No food yet" hint="Log breakfast, lunch, dinner, or a snack." action={
              <button onClick={() => openLog('food')} className="px-4 py-2 rounded-xl bg-brand-400 text-slate-950 text-sm font-bold">Log food</button>
            } />
          ) : (
            <div className="space-y-4">
              {MEALS.map((meal) => {
                const items = loggedFoods.filter((f) => f.meal_type === meal);
                if (!items.length) return null;
                const kcal = items.reduce((s, f) => s + (Number(f.calories) || 0), 0);
                return (
                  <div key={meal}>
                    <div className="flex justify-between text-xs uppercase tracking-wide text-slate-500 mb-1.5">
                      <span>{meal}</span>
                      <span>{kcal} kcal</span>
                    </div>
                    <div className="space-y-1.5">
                      {items.map((f: any) => (
                        <div key={f.id} className="flex items-center justify-between bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2">
                          <div>
                            <span className="text-white text-sm font-medium">{f.name}</span>
                            <span className="text-slate-500 ml-2 text-xs">×{f.quantity}</span>
                          </div>
                          <div className="text-brand-400 text-sm font-bold">{f.calories} kcal</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white flex items-center gap-2"><Dumbbell size={18} className="text-brand-400" /> Workouts</h3>
            <button onClick={() => openLog('exercise')} className="text-xs font-bold text-brand-400">+ Exercise</button>
          </div>
          {loggedExercises.length === 0 ? (
            <EmptyState title="No workout yet" hint="Log sets, reps, or cardio minutes." action={
              <button onClick={() => openLog('exercise')} className="px-4 py-2 rounded-xl bg-brand-400 text-slate-950 text-sm font-bold">Log workout</button>
            } />
          ) : (
            <div className="space-y-1.5">
              {loggedExercises.map((e: any) => (
                <div key={e.id} className="flex items-center justify-between bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2">
                  <div>
                    <span className="text-white text-sm font-medium">{e.name}</span>
                    <span className="text-slate-500 ml-2 text-xs">{e.sets}×{e.reps} · {e.duration_minutes} min</span>
                  </div>
                  <div className="text-orange-400 text-sm font-bold">{e.calories_burned} kcal</div>
                </div>
              ))}
              <div className="pt-2 text-sm flex justify-between text-slate-400">
                <span>Total burned</span>
                <span className="text-orange-400 font-bold">{todayExBurned} kcal</span>
              </div>
            </div>
          )}
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-white flex items-center gap-2"><ImageIcon size={18} className="text-purple-400" /> Body photos</h3>
          <button onClick={() => openLog('body')} className="text-xs font-bold text-brand-400">+ Photo</button>
        </div>
        {bodyImages.length === 0 ? (
          <p className="text-slate-500 text-sm">Add front, side, or back photos to see visual progress.</p>
        ) : (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {bodyImages.map((img: any, i: number) => (
              <div key={img.id ?? i} className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
                {img.image_url?.startsWith('data:') || img.image_url?.startsWith('http') ? (
                  <img src={img.image_url} alt={img.image_type} className="w-full h-28 object-cover" />
                ) : (
                  <div className="h-28 bg-slate-800 flex items-center justify-center">
                    <ImageIcon size={20} className="text-slate-600" />
                  </div>
                )}
                <div className="p-1.5 text-center text-[11px] text-slate-400 capitalize">{img.image_type}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setModalOpen(false)}>
          <div className="bg-panel border border-brand-600/30 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-800 sticky top-0 bg-panel rounded-t-3xl z-10">
              <h3 className="text-lg font-bold text-white">Add to today</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white" aria-label="Close"><X size={22} /></button>
            </div>
            <div className="flex gap-1 px-5 pt-4 overflow-x-auto">
              {tabs.map((t) => (
                <button key={t.key} onClick={() => setActiveTab(t.key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap ${
                    activeTab === t.key ? 'bg-brand-400 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}>
                  <t.icon size={16} /> {t.label}
                </button>
              ))}
            </div>
            <div className="p-5">
              {activeTab === 'food' && (
                <div className="space-y-3">
                  <input type="text" value={foodSearch} onChange={(e) => setFoodSearch(e.target.value)} placeholder="Search foods..."
                    className="w-full p-3 rounded-xl bg-ink border border-slate-700 text-white text-sm focus:outline-none focus:border-brand-500" />
                  <div className="grid gap-2 max-h-40 overflow-y-auto">
                    {filteredFoods.slice(0, 10).map((f) => (
                      <button key={f.id} onClick={() => { setSelectedFood(f); setFoodSearch(''); }}
                        className={`text-left p-3 rounded-xl border text-sm ${
                          selectedFood?.id === f.id ? 'border-brand-500 bg-brand-900/20' : 'border-slate-800 bg-slate-950/40'
                        }`}>
                        <div className="text-white font-medium">{f.name}</div>
                        <div className="text-slate-400 text-xs">{f.calories} kcal · P {f.protein}g · C {f.carbohydrates}g · F {f.fat}g</div>
                      </button>
                    ))}
                    {filteredFoods.length === 0 && <p className="text-slate-500 text-sm text-center py-4">No foods yet. Add some on the Foods page.</p>}
                  </div>
                  {selectedFood && (
                    <div className="bg-slate-950/60 border border-brand-600/20 rounded-xl p-4 space-y-3">
                      <div className="text-brand-400 font-bold text-sm">{selectedFood.name}</div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-slate-400">Meal</label>
                          <select value={foodMeal} onChange={(e) => setFoodMeal(e.target.value)} className="w-full p-2 rounded-lg bg-ink border border-slate-700 text-white text-sm">
                            {MEALS.map((m) => <option key={m}>{m}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-slate-400">Quantity</label>
                          <input type="number" min={0.25} step={0.25} value={foodQty} onChange={(e) => setFoodQty(Number(e.target.value))}
                            className="w-full p-2 rounded-lg bg-ink border border-slate-700 text-white text-sm" />
                        </div>
                      </div>
                      <button onClick={handleLogFood} className="w-full py-2.5 rounded-xl bg-brand-400 hover:bg-brand-300 text-slate-950 font-bold text-sm">
                        Add to log
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'exercise' && (
                <div className="space-y-3">
                  <input type="text" value={exerciseSearch} onChange={(e) => setExerciseSearch(e.target.value)} placeholder="Search exercises..."
                    className="w-full p-3 rounded-xl bg-ink border border-slate-700 text-white text-sm" />
                  <div className="grid gap-2 max-h-40 overflow-y-auto">
                    {filteredExercises.slice(0, 10).map((e) => (
                      <button key={e.id} onClick={() => { setSelectedExercise(e); setExerciseSearch(''); }}
                        className={`text-left p-3 rounded-xl border text-sm ${
                          selectedExercise?.id === e.id ? 'border-brand-500 bg-brand-900/20' : 'border-slate-800 bg-slate-950/40'
                        }`}>
                        <div className="text-white font-medium">{e.name}</div>
                        <div className="text-slate-400 text-xs">{e.exercise_type}</div>
                      </button>
                    ))}
                    {filteredExercises.length === 0 && <p className="text-slate-500 text-sm text-center py-4">No exercises yet. Add some on the Workout page.</p>}
                  </div>
                  {selectedExercise && (
                    <div className="bg-slate-950/60 border border-brand-600/20 rounded-xl p-4 space-y-3">
                      <div className="text-brand-400 font-bold text-sm">{selectedExercise.name}</div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-slate-400">Sets</label>
                          <input type="number" value={exLog.sets} onChange={(e) => setExLog({ ...exLog, sets: Number(e.target.value) })} className="w-full p-2 rounded-lg bg-ink border border-slate-700 text-white text-sm" />
                        </div>
                        <div>
                          <label className="text-xs text-slate-400">Reps</label>
                          <input type="number" value={exLog.reps} onChange={(e) => setExLog({ ...exLog, reps: Number(e.target.value) })} className="w-full p-2 rounded-lg bg-ink border border-slate-700 text-white text-sm" />
                        </div>
                        <div>
                          <label className="text-xs text-slate-400">Minutes</label>
                          <input type="number" value={exLog.duration_minutes} onChange={(e) => setExLog({ ...exLog, duration_minutes: Number(e.target.value) })} className="w-full p-2 rounded-lg bg-ink border border-slate-700 text-white text-sm" />
                        </div>
                        <div>
                          <label className="text-xs text-slate-400">kcal burned</label>
                          <input type="number" value={exLog.calories_burned} onChange={(e) => setExLog({ ...exLog, calories_burned: Number(e.target.value) })} className="w-full p-2 rounded-lg bg-ink border border-slate-700 text-white text-sm" />
                        </div>
                      </div>
                      <button onClick={handleLogExercise} className="w-full py-2.5 rounded-xl bg-brand-400 hover:bg-brand-300 text-slate-950 font-bold text-sm">Add to log</button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'water' && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-400">Quick-add water or set today’s step count.</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[250, 500, 750].map((ml) => (
                      <button key={ml} onClick={() => addWater(ml)} className="py-3 rounded-xl bg-sky-950/50 border border-sky-800 text-sky-200 font-bold">+{ml} ml</button>
                    ))}
                  </div>
                  <p className="text-sm text-white">Today: <b className="text-sky-400">{water} ml</b></p>
                  <div className="flex gap-2">
                    <input type="number" placeholder="Steps" value={stepInput} onChange={(e) => setStepInput(e.target.value)} className="flex-1 p-3 rounded-xl bg-ink border border-slate-700 text-white text-sm" />
                    <button onClick={saveSteps} className="px-4 rounded-xl bg-brand-400 text-slate-950 font-bold">Save</button>
                  </div>
                </div>
              )}

              {activeTab === 'body' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    {(['front', 'side', 'back'] as const).map((t) => (
                      <button key={t} onClick={() => setImageType(t)}
                        className={`py-2 rounded-xl text-sm font-bold capitalize ${imageType === t ? 'bg-brand-400 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                  <input type="file" accept="image/*" ref={fileInputRef} className="hidden"
                    onChange={(e) => { if (e.target.files?.[0]) { setImageFile(e.target.files[0]); setImagePreview(URL.createObjectURL(e.target.files[0])); } }} />
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold">
                    {imagePreview ? 'Change image' : 'Choose image'}
                  </button>
                  {imagePreview && <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover rounded-xl" />}
                  {imageFile && (
                    <button onClick={handleUploadImage} className="w-full py-2.5 rounded-xl bg-brand-400 text-slate-950 font-bold">Upload photo</button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
