import { useEffect, useState, useRef } from 'react';
import { CalendarDays, Plus, X, Utensils, Dumbbell, Image as ImageIcon, Target } from 'lucide-react';
import Swal from 'sweetalert2';
import { apiClient } from '../lib/api';
import { useAuthStore } from '../store/auth';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';

type TabType = 'goal' | 'food' | 'exercise' | 'body';

const UploadIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

export default function DailyPage() {
  const [userId, setUserId] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('goal');

  // Goal data
  const [goalCalories, setGoalCalories] = useState<number | null>(null);
  const [proteinTarget, setProteinTarget] = useState(0);
  const [fatTarget, setFatTarget] = useState(0);
  const [carbTarget, setCarbTarget] = useState(0);

  // Food data
  const [foods, setFoods] = useState<any[]>([]);
  const [foodSearch, setFoodSearch] = useState('');
  const [selectedFood, setSelectedFood] = useState<any>(null);
  const [foodQty, setFoodQty] = useState(1);
  const [foodMeal, setFoodMeal] = useState('Breakfast');
  const [loggedFoods, setLoggedFoods] = useState<any[]>([]);

  // Exercise data
  const [exercises, setExercises] = useState<any[]>([]);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [selectedExercise, setSelectedExercise] = useState<any>(null);
  const [exLog, setExLog] = useState({ sets: 3, reps: 10, duration_minutes: 30, calories_burned: 200 });
  const [loggedExercises, setLoggedExercises] = useState<any[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Body progress image
  const [imageType, setImageType] = useState<'front' | 'side' | 'back'>('front');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [bodyImages, setBodyImages] = useState<any[]>([]);

  // Body image upload
  async function handleUploadImage() {
    if (!imageFile || !userId) return;
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        await apiClient.createBodyProgressImage?.({
          user_id: userId,
          image_url: base64,
          image_type: imageType,
        });
        setImageFile(null);
        setImagePreview(null);
        await loadBodyImages(userId);
      };
      reader.readAsDataURL(imageFile);
    } catch {}
  }

  // Load data
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!accessToken || !user?.id) return;
    setUserId(user.id);
    loadGoal(user.id);
    loadFoods(user.id);
    loadExercises(user.id);
    loadBodyImages(user.id);
    loadLoggedFoods(user.id);
    loadLoggedExercises(user.id);
  }, [accessToken, user?.id]);

  async function loadGoal(uid: string) {
    try {
      const goalsData = await apiClient.getGoals(uid);
      const goals = Array.isArray(goalsData) ? goalsData : [];
      const active = goals.find((g: any) => g.status === 'active');
      if (active) {
        // Backend saves to target_value, frontend also reads target_calories for backwards compat
        const targetCal = active.target_calories ?? active.target_value ?? 0;
        setGoalCalories(Number(targetCal) || null);
        setProteinTarget(Number(active.protein_target) || 0);
        setFatTarget(Number(active.fat_target) || 0);
        setCarbTarget(Number(active.carb_target) || 0);
      }
    } catch {}
  }

  async function loadFoods(uid: string) {
    try {
      const d = await apiClient.getFoods(uid);
      setFoods(Array.isArray(d) ? d : []);
    } catch { setFoods([]); }
  }

  async function loadExercises(uid: string) {
    try {
      const d = await apiClient.getExercises(uid);
      setExercises(Array.isArray(d) ? d : []);
    } catch { setExercises([]); }
  }

  async function loadBodyImages(uid: string) {
    try {
      const d = await apiClient.getBodyProgressImages?.(uid);
      setBodyImages(Array.isArray(d) ? d : []);
    } catch { setBodyImages([]); }
  }

  async function loadLoggedFoods(uid: string) {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const records = await apiClient.getDailyRecords(uid);
      const todayRecord = (Array.isArray(records) ? records : []).find((r: any) => r.record_date === today);
      if (todayRecord?.id) {
        const d = await apiClient.getDailyFoods(uid, todayRecord.id);
        setLoggedFoods(Array.isArray(d) ? d : []);
      }
    } catch { setLoggedFoods([]); }
  }

  async function loadLoggedExercises(uid: string) {
    try {
      const d = await apiClient.getDailyExercises(uid);
      const today = new Date().toISOString().slice(0, 10);
      const records = await apiClient.getDailyRecords(uid);
      const todayRecord = (Array.isArray(records) ? records : []).find((r: any) => r.record_date === today);
      if (todayRecord?.id) {
        const filtered = (Array.isArray(d) ? d : []).filter((e: any) => e.daily_record_id === todayRecord?.id);
        setLoggedExercises(filtered);
      }
    } catch { setLoggedExercises([]); }
  }

  // Food actions
  async function handleLogFood() {
    if (!selectedFood || !userId) return;
    try {
      // Create daily record if needed
      const today = new Date().toISOString().slice(0, 10);
      const records = await apiClient.getDailyRecords(userId);
      const todayRecord = (Array.isArray(records) ? records : []).find((r: any) => r.record_date === today);
      let recordId = todayRecord?.id;
      if (!recordId) {
        const rec = await apiClient.createDailyRecord({ user_id: userId, record_date: today, calories_consumed: 0, calories_burned: 0, water_ml: 0, steps: 0 });
        recordId = rec?.id;
      }
      const q = Number(foodQty) || 1;
      await apiClient.createDailyFood({
        user_id: userId, daily_record_id: recordId, food_id: selectedFood.id,
        meal_type: foodMeal, quantity: q,
        calories: (Number(selectedFood.calories) || 0) * q,
        protein: (Number(selectedFood.protein) || 0) * q,
        carbohydrates: (Number(selectedFood.carbohydrates) || 0) * q,
        fat: (Number(selectedFood.fat) || 0) * q,
      });
      setSelectedFood(null);
      setFoodQty(1);
      await loadLoggedFoods(userId);
    } catch {}
  }

  // Exercise actions
  async function handleLogExercise() {
    if (!selectedExercise || !userId) return;
    try {
      const today = new Date().toISOString().slice(0, 10);
      const records = await apiClient.getDailyRecords(userId);
      const todayRecord = (Array.isArray(records) ? records : []).find((r: any) => r.record_date === today);
      let recordId = todayRecord?.id;
      if (!recordId) {
        const rec = await apiClient.createDailyRecord({ user_id: userId, record_date: today, calories_consumed: 0, calories_burned: 0, water_ml: 0, steps: 0 });
        recordId = rec?.id;
      }
      await apiClient.createDailyExercise({
        user_id: userId, daily_record_id: recordId, exercise_id: selectedExercise.id,
        ...exLog,
      });
      setSelectedExercise(null);
      setExLog({ sets: 3, reps: 10, duration_minutes: 30, calories_burned: 200 });
      await loadLoggedExercises(userId);
    } catch {}
  }

  // Body image upload
  async function handleUploadImage() {
    if (!imageFile || !userId) return;
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        await apiClient.createBodyProgressImage?.({
          user_id: userId,
          image_url: base64,
          image_type: imageType,
        });
        setImageFile(null);
        setImagePreview(null);
        await loadBodyImages(userId);
      };
      reader.readAsDataURL(imageFile);
    } catch {}
  }

  // Filter foods/exercises by search
  const filteredFoods = foods.filter(f => f.name?.toLowerCase().includes(foodSearch.toLowerCase()));
  const filteredExercises = exercises.filter(e => e.name?.toLowerCase().includes(exerciseSearch.toLowerCase()));

  const tabs: { key: TabType; label: string; icon: React.ElementType }[] = [
    { key: 'goal', label: 'My Goal', icon: Target },
    { key: 'food', label: 'Food', icon: Utensils },
    { key: 'exercise', label: 'Exercise', icon: Dumbbell },
    { key: 'body', label: 'Body Image', icon: ImageIcon },
  ];

  const todayFoodCal = loggedFoods.reduce((s: number, f: any) => s + (Number(f.calories) || 0), 0);
  const todayExBurned = loggedExercises.reduce((s: number, e: any) => s + (Number(e.calories_burned) || 0), 0);

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-extrabold text-white flex items-center gap-2">
            <CalendarDays className="text-brand-400" /> Daily Tracker
          </h2>
          <p className="text-slate-400 text-sm">Log food, exercise, and track body progress</p>
        </div>
        <button onClick={() => setModalOpen(true)}
          className="px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-lg shadow-lg shadow-brand-600/20 transition flex items-center gap-2">
          <Plus size={22} /> Daily Tracker
        </button>
      </div>

      {/* Today's Summary Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-center">
          <Utensils size={20} className="text-yellow-400 mx-auto mb-1" />
          <div className="text-white font-bold text-lg">{todayFoodCal} kcal</div>
          <div className="text-xs text-slate-500">Food Eaten</div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-center">
          <Dumbbell size={20} className="text-brand-400 mx-auto mb-1" />
          <div className="text-white font-bold text-lg">{todayExBurned} kcal</div>
          <div className="text-xs text-slate-500">Exercise Burned</div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-center">
          <ImageIcon size={20} className="text-purple-400 mx-auto mb-1" />
          <div className="text-white font-bold text-lg">{bodyImages.length}</div>
          <div className="text-xs text-slate-500">Body Images</div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-center">
          <Target size={20} className="text-blue-400 mx-auto mb-1" />
          <div className="text-white font-bold text-lg">{goalCalories ?? '—'}</div>
          <div className="text-xs text-slate-500">Daily Target</div>
        </div>
      </div>

      {/* Show Only Food and Exercise */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Food Section */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Utensils size={22} className="text-yellow-400" /> Food Logged ({loggedFoods.length})
          </h3>
          {loggedFoods.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-4">No food logged yet. Click Daily Tracker → Food.</p>
          ) : (
            <div className="grid gap-2">
              {loggedFoods.map((f: any) => (
                <div key={f.id} className="flex items-center justify-between bg-slate-950/60 border border-slate-800 rounded-lg px-4 py-3">
                  <div>
                    <span className="text-white font-medium">{f.name}</span>
                    <span className="text-slate-500 ml-2 text-sm">x{f.quantity} · {f.meal_type}</span>
                  </div>
                  <div className="text-brand-400 font-bold">{f.calories} kcal</div>
                </div>
              ))}
            </div>
          )}
          {loggedFoods.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-800 text-sm">
              <div className="flex justify-between text-slate-400">
                <span>Total</span>
                <span className="text-white font-bold">{todayFoodCal} kcal</span>
              </div>
              <div className="flex justify-between text-slate-400 mt-1">
                <span>Protein</span>
                <span className="text-red-400 font-bold">{loggedFoods.reduce((s: number, f: any) => s + (Number(f.protein) || 0), 0)}g</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Carbs</span>
                <span className="text-yellow-400 font-bold">{loggedFoods.reduce((s: number, f: any) => s + (Number(f.carbohydrates) || 0), 0)}g</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Fat</span>
                <span className="text-blue-400 font-bold">{loggedFoods.reduce((s: number, f: any) => s + (Number(f.fat) || 0), 0)}g</span>
              </div>
            </div>
          )}
        </div>

        {/* Exercise Section */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Dumbbell size={22} className="text-brand-400" /> Exercises Logged ({loggedExercises.length})
          </h3>
          {loggedExercises.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-4">No exercise logged yet. Click Daily Tracker → Exercise.</p>
          ) : (
            <div className="grid gap-2">
              {loggedExercises.map((e: any) => (
                <div key={e.id} className="flex items-center justify-between bg-slate-950/60 border border-slate-800 rounded-lg px-4 py-3">
                  <div>
                    <span className="text-white font-medium">{e.name}</span>
                    <span className="text-slate-500 ml-2 text-sm">{e.sets}x{e.reps} · {e.duration_minutes}min</span>
                  </div>
                  <div className="text-brand-400 font-bold">{e.calories_burned} kcal</div>
                </div>
              ))}
            </div>
          )}
          {loggedExercises.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-800 text-sm">
              <div className="flex justify-between text-slate-400">
                <span>Total Burned</span>
                <span className="text-brand-400 font-bold">{todayExBurned} kcal</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Body Progress Images */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 mt-6">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <ImageIcon size={22} className="text-purple-400" /> Body Progress Images ({bodyImages.length})
        </h3>
        {bodyImages.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-4">No body images yet. Use Daily Tracker → Body.</p>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {bodyImages.map((img: any, i) => (
              <div key={i} className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
                {img.image_url?.startsWith('data:') ? (
                  <img src={img.image_url} alt={img.image_type} className="w-full h-32 object-cover" />
                ) : (
                  <div className="h-32 bg-slate-800 flex items-center justify-center">
                    <ImageIcon size={24} className="text-slate-600" />
                  </div>
                )}
                <div className="p-2 text-center text-xs text-slate-400 capitalize">{img.image_type}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===== POPUP MODAL ===== */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setModalOpen(false)}>
          <div
            className="bg-slate-900 border border-brand-600/30 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-800 sticky top-0 bg-slate-900 rounded-t-3xl z-10">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <CalendarDays size={22} className="text-brand-400" /> Daily Tracker
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white" aria-label="Close">
                <X size={22} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-6 pt-4 overflow-x-auto">
              {tabs.map(t => (
                <button key={t.key} onClick={() => setActiveTab(t.key)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition whitespace-nowrap ${
                    activeTab === t.key ? 'bg-brand-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}>
                  <t.icon size={16} /> {t.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {/* === GOAL TAB === */}
              {activeTab === 'goal' && (
                <div>
                  <h4 className="text-lg font-bold text-white mb-4">My Goal</h4>
                  {goalCalories ? (
                    <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-slate-400">Daily Calories</div>
                          <div className="text-brand-400 font-bold text-xl">{goalCalories} kcal</div>
                        </div>
                        <div>
                          <div className="text-slate-400">Protein</div>
                          <div className="text-red-400 font-bold">{proteinTarget}g</div>
                        </div>
                        <div>
                          <div className="text-slate-400">Fat</div>
                          <div className="text-blue-400 font-bold">{fatTarget}g</div>
                        </div>
                        <div>
                          <div className="text-slate-400">Carbs</div>
                          <div className="text-yellow-400 font-bold">{carbTarget}g</div>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500">Update your goal on the <a href="/goals" className="text-brand-400 underline">Goals</a> page.</p>
                    </div>
                  ) : (
                    <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 text-center">
                      <p className="text-slate-400 mb-3">No active goal set.</p>
                      <a href="/goals" className="inline-block px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-bold transition"
                        onClick={() => setModalOpen(false)}>
                        Set Your Goal →
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* === FOOD TAB === */}
              {activeTab === 'food' && (
                <div>
                  <h4 className="text-lg font-bold text-white mb-4">Log Food</h4>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <input type="text" value={foodSearch} onChange={e => setFoodSearch(e.target.value)}
                        placeholder="Search foods..."
                        className="flex-1 p-3 rounded-xl bg-ink border border-slate-700 text-white text-sm focus:outline-none focus:border-brand-500" />
                    </div>
                    <div className="grid gap-2 max-h-40 overflow-y-auto">
                      {filteredFoods.slice(0, 10).map(f => (
                        <button key={f.id} onClick={() => { setSelectedFood(f); setFoodSearch(''); }}
                          className={`text-left p-3 rounded-xl border text-sm transition ${
                            selectedFood?.id === f.id ? 'border-brand-500 bg-brand-900/20' : 'border-slate-800 bg-slate-950/40 hover:border-brand-500/40'
                          }`}>
                          <div className="text-white font-medium">{f.name}</div>
                          <div className="text-slate-400 text-xs">{f.calories} kcal · P {f.protein}g · C {f.carbohydrates}g · F {f.fat}g</div>
                        </button>
                      ))}
                    </div>
                    {selectedFood && (
                      <div className="bg-slate-950/60 border border-brand-600/20 rounded-xl p-4 space-y-3">
                        <div className="text-brand-400 font-bold text-sm">{selectedFood.name}</div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-slate-400">Meal</label>
                            <select value={foodMeal} onChange={e => setFoodMeal(e.target.value)}
                              className="w-full p-2 rounded-lg bg-ink border border-slate-700 text-white text-sm">
                              <option>Breakfast</option><option>Lunch</option><option>Dinner</option><option>Snack</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-slate-400">Quantity</label>
                            <input type="number" min={0.25} step={0.25} value={foodQty} onChange={e => setFoodQty(Number(e.target.value))}
                              className="w-full p-2 rounded-lg bg-ink border border-slate-700 text-white text-sm" />
                          </div>
                        </div>
                        <button onClick={handleLogFood}
                          className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm transition">
                          <Plus size={16} className="inline mr-1" /> Add to Log
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* === EXERCISE TAB === */}
              {activeTab === 'exercise' && (
                <div>
                  <h4 className="text-lg font-bold text-white mb-4">Log Exercise</h4>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <input type="text" value={exerciseSearch} onChange={e => setExerciseSearch(e.target.value)}
                        placeholder="Search exercises..."
                        className="flex-1 p-3 rounded-xl bg-ink border border-slate-700 text-white text-sm focus:outline-none focus:border-brand-500" />
                    </div>
                    <div className="grid gap-2 max-h-40 overflow-y-auto">
                      {filteredExercises.slice(0, 10).map(e => (
                        <button key={e.id} onClick={() => { setSelectedExercise(e); setExerciseSearch(''); }}
                          className={`text-left p-3 rounded-xl border text-sm transition ${
                            selectedExercise?.id === e.id ? 'border-brand-500 bg-brand-900/20' : 'border-slate-800 bg-slate-950/40 hover:border-brand-500/40'
                          }`}>
                          <div className="text-white font-medium">{e.name}</div>
                          <div className="text-slate-400 text-xs">{e.exercise_type}</div>
                        </button>
                      ))}
                    </div>
                    {selectedExercise && (
                      <div className="bg-slate-950/60 border border-brand-600/20 rounded-xl p-4 space-y-3">
                        <div className="text-brand-400 font-bold text-sm">{selectedExercise.name}</div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-slate-400">Sets</label>
                            <input type="number" value={exLog.sets} onChange={e => setExLog({...exLog, sets: Number(e.target.value)})}
                              className="w-full p-2 rounded-lg bg-ink border border-slate-700 text-white text-sm" />
                          </div>
                          <div>
                            <label className="text-xs text-slate-400">Reps</label>
                            <input type="number" value={exLog.reps} onChange={e => setExLog({...exLog, reps: Number(e.target.value)})}
                              className="w-full p-2 rounded-lg bg-ink border border-slate-700 text-white text-sm" />
                          </div>
                          <div>
                            <label className="text-xs text-slate-400">Minutes</label>
                            <input type="number" value={exLog.duration_minutes} onChange={e => setExLog({...exLog, duration_minutes: Number(e.target.value)})}
                              className="w-full p-2 rounded-lg bg-ink border border-slate-700 text-white text-sm" />
                          </div>
                          <div>
                            <label className="text-xs text-slate-400">kcal Burned</label>
                            <input type="number" value={exLog.calories_burned} onChange={e => setExLog({...exLog, calories_burned: Number(e.target.value)})}
                              className="w-full p-2 rounded-lg bg-ink border border-slate-700 text-white text-sm" />
                          </div>
                        </div>
                        <button onClick={handleLogExercise}
                          className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm transition">
                          <Plus size={16} className="inline mr-1" /> Add to Log
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* === BODY TAB === */}
              {activeTab === 'body' && (
                <div>
                  <h4 className="text-lg font-bold text-white mb-4">Body Progress Image</h4>
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      {(['front', 'side', 'back'] as const).map(t => (
                        <button key={t} onClick={() => setImageType(t)}
                          className={`py-2 rounded-xl text-sm font-bold capitalize transition ${
                            imageType === t ? 'bg-brand-600 text-white' : 'bg-slate-800 text-slate-400'
                          }`}>
                          {t}
                        </button>
                      ))}
                    </div>
                    <input type="file" accept="image/*" ref={fileInputRef}
                      onChange={e => { if (e.target.files?.[0]) { setImageFile(e.target.files[0]); setImagePreview(URL.createObjectURL(e.target.files[0])); } }}
                      className="hidden" id="body-image-input" />
                    <button type="button" onClick={() => fileInputRef.current?.click()}
                      className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition flex items-center justify-center gap-2">
                      <ImageIcon size={18} /> {imagePreview ? 'Change Image' : 'Choose Image'}
                    </button>
                    {imagePreview && (
                      <div className="relative">
                        <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover rounded-xl" />
                      </div>
                    )}
                    {imageFile && (
                      <button onClick={handleUploadImage}
                        className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold transition">
                        <UploadIcon /> Upload Body Progress
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
