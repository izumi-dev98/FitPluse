import { useState } from 'react';
import { X, Plus, Utensils, Flame, Droplets, Footprints, Dumbbell, Minus } from 'lucide-react';
import { apiClient } from '../lib/api';
import { useAuthStore } from '../store/auth';
import Swal from 'sweetalert2';
import { fmtInt } from '../lib/format';
import type { Food, Exercise } from '../lib/database';

type LogType = 'food' | 'exercise' | 'water' | 'steps';

interface AddLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeGoal: {
    target_calories: number | null;
    protein_target: number | null;
    fat_target: number | null;
    carb_target: number | null;
  } | null;
  onSuccess: () => void;
}

export default function AddLogModal({ isOpen, onClose, activeGoal, onSuccess }: AddLogModalProps) {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<LogType>('food');
  const [loading, setLoading] = useState(false);
  
  // Food
  const [foods, setFoods] = useState<Food[]>([]);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [foodQuantity, setFoodQuantity] = useState(100);
  const [foodMealType, setFoodMealType] = useState('breakfast');
  const [searchFood, setSearchFood] = useState('');
  
  // Exercise
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [exerciseDuration, setExerciseDuration] = useState(30);
  const [exerciseCalories, setExerciseCalories] = useState(0);
  
  // Water
  const [waterAmount, setWaterAmount] = useState(250);
  
  // Steps
  const [stepsAmount, setStepsAmount] = useState(1000);

  const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];

  // Load foods and exercises on open
  const loadData = async () => {
    if (!user?.id) return;
    try {
      const [foodData, exData] = await Promise.all([
        apiClient.getFoods(user.id).catch(() => []),
        apiClient.getExercises(user.id).catch(() => []),
      ]);
      setFoods(Array.isArray(foodData) ? foodData : []);
      setExercises(Array.isArray(exData) ? exData : []);
    } catch {}
  };

  // Load when modal opens
  const prevIsOpenRef = { current: isOpen };
  if (isOpen && !prevIsOpenRef.current) {
    loadData();
  }
  prevIsOpenRef.current = isOpen;

  const handleSave = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      
      // Get or create today's daily record
      let dailyRecord = null;
      const records = await apiClient.getDailyRecords(user.id).catch(() => []);
      const todayRecord = (Array.isArray(records) ? records : []).find(r => r.record_date === today);
      
      if (todayRecord) {
        dailyRecord = todayRecord;
      } else {
        const newRecord = await apiClient.createDailyRecord({
          user_id: user.id,
          record_date: today,
          calories_consumed: 0,
          calories_burned: 0,
          water_ml: 0,
          steps: 0,
        });
        dailyRecord = newRecord;
      }

      if (!dailyRecord) throw new Error('Failed to create daily record');

      if (activeTab === 'food' && selectedFood) {
        const calories = Math.round((selectedFood.calories || 0) * foodQuantity / 100);
        const protein = Math.round((selectedFood.protein || 0) * foodQuantity / 100);
        const fat = Math.round((selectedFood.fat || 0) * foodQuantity / 100);
        const carbs = Math.round((selectedFood.carbohydrates || 0) * foodQuantity / 100);
        
        await apiClient.createDailyFood({
          user_id: user.id,
          daily_record_id: dailyRecord.id,
          food_id: selectedFood.id,
          quantity: foodQuantity,
          meal_type: foodMealType,
          calories,
          protein,
          fat,
          carbohydrates: carbs,
        });
        
        // Update daily record totals
        await apiClient.updateDailyRecord(dailyRecord.id, {
          calories_consumed: (dailyRecord.calories_consumed || 0) + calories,
        });
      }
      
      if (activeTab === 'exercise' && selectedExercise) {
        await apiClient.createDailyExercise({
          user_id: user.id,
          daily_record_id: dailyRecord.id,
          exercise_id: selectedExercise.id,
          duration_minutes: exerciseDuration,
          calories_burned: exerciseCalories,
        });
        
        await apiClient.updateDailyRecord(dailyRecord.id, {
          calories_burned: (dailyRecord.calories_burned || 0) + exerciseCalories,
        });
      }
      
      if (activeTab === 'water') {
        await apiClient.updateDailyRecord(dailyRecord.id, {
          water_ml: (dailyRecord.water_ml || 0) + waterAmount,
        });
        await apiClient.createWaterIntake({
          user_id: user.id,
          amount_ml: waterAmount,
        });
      }
      
      if (activeTab === 'steps') {
        await apiClient.updateDailyRecord(dailyRecord.id, {
          steps: stepsAmount,
        });
      }

      onSuccess();
      onClose();
      Swal.fire({
        icon: 'success',
        title: 'Logged!',
        timer: 1500,
        timerProgressBar: true,
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
      });
    } catch (e) {
      Swal.fire({
        icon: 'error',
        title: 'Failed to log',
        text: e instanceof Error ? e.message : 'Please try again',
      });
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  const filteredFoods = foods.filter(f => 
    f.name.toLowerCase().includes(searchFood.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-slate-900 border border-brand-600/30 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 sticky top-0 bg-slate-900 rounded-t-3xl z-10">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Plus size={20} className="text-brand-400" /> Add Log for Today
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1" aria-label="Close">
            <X size={22} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 p-1 bg-slate-950/50" role="tablist">
          {[
            { id: 'food', label: 'Food', icon: Utensils },
            { id: 'exercise', label: 'Exercise', icon: Flame },
            { id: 'water', label: 'Water', icon: Droplets },
            { id: 'steps', label: 'Steps', icon: Footprints },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              role="tab"
              aria-selected={activeTab === id}
              onClick={() => setActiveTab(id as LogType)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition ${
                activeTab === id
                  ? 'bg-brand-400 text-slate-950 shadow-lg shadow-brand-400/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Food Tab */}
          {activeTab === 'food' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-2">Search Foods</label>
                <input
                  type="text"
                  placeholder="Search your foods..."
                  value={searchFood}
                  onChange={(e) => setSearchFood(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-brand-500"
                />
              </div>
              
              <div className="max-h-60 overflow-y-auto space-y-2">
                {filteredFoods.length === 0 ? (
                  <p className="text-slate-500 text-center py-4">No foods found. Add foods in the Foods page.</p>
                ) : (
                  filteredFoods.map((food) => (
                    <button
                      key={food.id}
                      type="button"
                      onClick={() => setSelectedFood(food)}
                      className={`w-full text-left p-3 rounded-xl border transition ${
                        selectedFood?.id === food.id
                          ? 'border-brand-400 bg-brand-400/10'
                          : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-white">{food.name}</div>
                          <div className="text-xs text-slate-500">
                            {fmtInt(food.calories || 0)} kcal / {food.serving_size || 100}g
                            · P: {food.protein || 0}g F: {food.fat || 0}g C: {food.carbohydrates || 0}g
                          </div>
                        </div>
                        {selectedFood?.id === food.id && (
                          <span className="text-brand-400 font-bold">✓</span>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>

              {selectedFood && (
                <div className="bg-slate-950/50 border border-brand-500/30 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{selectedFood.name}</span>
                    <button onClick={() => setSelectedFood(null)} className="text-slate-400 hover:text-white">
                      <X size={18} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Quantity (g)</label>
                      <input
                        type="number"
                        min="1"
                        max="5000"
                        value={foodQuantity}
                        onChange={(e) => setFoodQuantity(Number(e.target.value))}
                        className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Meal</label>
                      <select
                        value={foodMealType}
                        onChange={(e) => setFoodMealType(e.target.value)}
                        className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-brand-500"
                      >
                        {mealTypes.map(m => (
                          <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center bg-slate-900 rounded-lg p-3">
                    <div><div className="text-xs text-slate-500">Calories</div><div className="font-bold text-brand-300">{fmtInt(Math.round((selectedFood.calories || 0) * foodQuantity / 100))}</div></div>
                    <div><div className="text-xs text-slate-500">Protein</div><div className="font-bold text-red-400">{fmtInt(Math.round((selectedFood.protein || 0) * foodQuantity / 100))}g</div></div>
                    <div><div className="text-xs text-slate-500">Fat</div><div className="font-bold text-blue-400">{fmtInt(Math.round((selectedFood.fat || 0) * foodQuantity / 100))}g</div></div>
                    <div><div className="text-xs text-slate-500">Carbs</div><div className="font-bold text-yellow-400">{fmtInt(Math.round((selectedFood.carbohydrates || 0) * foodQuantity / 100))}g</div></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Exercise Tab */}
          {activeTab === 'exercise' && (
            <div className="space-y-4">
              <div className="max-h-60 overflow-y-auto space-y-2">
                {exercises.length === 0 ? (
                  <p className="text-slate-500 text-center py-4">No exercises found. Add exercises in the Exercises page.</p>
                ) : (
                  exercises.map((ex) => (
                    <button
                      key={ex.id}
                      type="button"
                      onClick={() => {
                        setSelectedExercise(ex);
                        setExerciseCalories(ex.calories_burned || 0);
                      }}
                      className={`w-full text-left p-3 rounded-xl border transition ${
                        selectedExercise?.id === ex.id
                          ? 'border-brand-400 bg-brand-400/10'
                          : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-white">{ex.name}</div>
                          <div className="text-xs text-slate-500">
                            {ex.exercise_type || 'Custom'} · {ex.calories_burned || 0} kcal/30min
                          </div>
                        </div>
                        {selectedExercise?.id === ex.id && (
                          <span className="text-brand-400 font-bold">✓</span>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>

              {selectedExercise && (
                <div className="bg-slate-950/50 border border-brand-500/30 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{selectedExercise.name}</span>
                    <button onClick={() => setSelectedExercise(null)} className="text-slate-400 hover:text-white">
                      <X size={18} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Duration (min)</label>
                      <input
                        type="number"
                        min="1"
                        max="300"
                        value={exerciseDuration}
                        onChange={(e) => setExerciseDuration(Number(e.target.value))}
                        className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Calories Burned</label>
                      <input
                        type="number"
                        min="0"
                        max="2000"
                        value={exerciseCalories}
                        onChange={(e) => setExerciseCalories(Number(e.target.value))}
                        className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-brand-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Water Tab */}
          {activeTab === 'water' && (
            <div className="space-y-4 text-center py-8">
              <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-sky-500/20 mb-4">
                <Droplets size={48} className="text-sky-400" />
              </div>
              <p className="text-slate-400">Add water intake</p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setWaterAmount(Math.max(50, waterAmount - 50))}
                  className="w-12 h-12 rounded-xl bg-slate-800 text-white font-bold text-xl hover:bg-slate-700"
                >
                  <Minus size={20} />
                </button>
                <input
                  type="number"
                  min="50"
                  max="5000"
                  step="50"
                  value={waterAmount}
                  onChange={(e) => setWaterAmount(Number(e.target.value))}
                  className="w-24 text-center text-xl font-bold bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-brand-500"
                />
                <button
                  onClick={() => setWaterAmount(Math.min(5000, waterAmount + 50))}
                  className="w-12 h-12 rounded-xl bg-slate-800 text-white font-bold text-xl hover:bg-slate-700"
                >
                  <Plus size={20} />
                </button>
              </div>
              <p className="text-sm text-slate-500">{waterAmount} ml</p>
              <div className="flex gap-2 justify-center mt-4">
                {[250, 500, 750, 1000].map(amt => (
                  <button
                    key={amt}
                    onClick={() => setWaterAmount(amt)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-medium text-white"
                  >
                    +{amt}ml
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Steps Tab */}
          {activeTab === 'steps' && (
            <div className="space-y-4 text-center py-8">
              <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-violet-500/20 mb-4">
                <Footprints size={48} className="text-violet-400" />
              </div>
              <p className="text-slate-400">Set today's step count</p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setStepsAmount(Math.max(0, stepsAmount - 500))}
                  className="w-12 h-12 rounded-xl bg-slate-800 text-white font-bold text-xl hover:bg-slate-700"
                >
                  <Minus size={20} />
                </button>
                <input
                  type="number"
                  min="0"
                  max="50000"
                  step="100"
                  value={stepsAmount}
                  onChange={(e) => setStepsAmount(Number(e.target.value))}
                  className="w-32 text-center text-xl font-bold bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-brand-500"
                />
                <button
                  onClick={() => setStepsAmount(Math.min(50000, stepsAmount + 500))}
                  className="w-12 h-12 rounded-xl bg-slate-800 text-white font-bold text-xl hover:bg-slate-700"
                >
                  <Plus size={20} />
                </button>
              </div>
              <p className="text-sm text-slate-500">{stepsAmount.toLocaleString()} steps</p>
              <div className="flex gap-2 justify-center mt-4 flex-wrap">
                {[1000, 5000, 7500, 10000, 15000].map(amt => (
                  <button
                    key={amt}
                    onClick={() => setStepsAmount(amt)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-medium text-white"
                  >
                    {amt.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={loading || (
              (activeTab === 'food' && !selectedFood) ||
              (activeTab === 'exercise' && !selectedExercise)
            )}
            className="w-full py-3.5 rounded-xl bg-brand-400 hover:bg-brand-300 text-slate-950 font-bold text-lg transition shadow-lg shadow-brand-400/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Saving...
              </>
            ) : (
              <>
                <Plus size={18} /> Save Log
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}