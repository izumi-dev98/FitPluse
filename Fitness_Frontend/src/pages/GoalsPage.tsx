import { useEffect, useState } from 'react';
import { Target, X, Calculator } from 'lucide-react';
import Swal from 'sweetalert2';
import { apiClient } from '../lib/api';
import { useAuthStore } from '../store/auth';
import { calcBMR, calcTDEE, calcTarget, calcMacros, GOAL_LABELS, type GoalType } from '../lib/theory';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';

type CalcInputs = {
  goal_type: GoalType;
  gender: string;
  weight_kg: number;
  height_cm: number;
  age: number;
  activity_level: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extremely_active';
};

export default function GoalsPage() {
  const [showModal, setShowModal] = useState(false);
  const [userId, setUserId] = useState('');
  const [goals, setGoals] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CalcInputs>({
    goal_type: 'muscle_gain',
    gender: 'male',
    weight_kg: 70,
    height_cm: 175,
    age: 30,
    activity_level: 'moderately_active',
  });

  const bmr = Math.round(calcBMR(form.gender, Number(form.weight_kg) || 0, Number(form.height_cm) || 0, Number(form.age) || 0));
  const tdee = Math.round(calcTDEE(bmr, form.activity_level));
  const target = Math.round(calcTarget(tdee, form.goal_type));
  const macros = calcMacros(target, Number(form.weight_kg) || 0);

  async function loadGoals(uid: string) {
    try {
      const data = await apiClient.getGoals(uid);
      setGoals(Array.isArray(data) ? data : []);
    } catch { setGoals([]); }
  }

  useEffect(() => {
    const uid = useAuthStore.getState().user?.id;
    if (!uid) return;
    setUserId(uid);
    loadGoals(uid);
  }, []);

  async function handleSave() {
    if (!userId) return;
    setSaving(true);
    try {
      // 1. Verify with backend calculators (same theory)
      const bmrRes = await apiClient.calcBMR({
        gender: form.gender, weight_kg: Number(form.weight_kg),
        height_cm: Number(form.height_cm), age: Number(form.age),
      });
      const tdeeRes = await apiClient.calcTDEE({ bmr: bmrRes.bmr, activity_level: form.activity_level });
      const targetRes = await apiClient.calcCalorieTarget({ tdee: tdeeRes.tdee, goal_type: form.goal_type });
      const finalTarget = Math.round(targetRes.targetCalories ?? target);

      // 2. Save goal to backend
      await apiClient.createGoal({
        user_id: userId,
        goal_type: form.goal_type,
        target_value: finalTarget,
        target_calories: finalTarget,
        protein_target: macros.protein,
        fat_target: macros.fat,
        carb_target: macros.carbs,
        status: 'active',
      });
      await loadGoals(userId);
      setShowModal(false);
    } catch (e: any) {
      Swal.fire({
        icon: 'error',
        title: 'Save Failed',
        text: e.message || 'Failed to create goal. Make sure backend is running.',
        confirmButtonColor: '#22c55e',
        confirmButtonText: 'OK',
      });
    }
    setSaving(false);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-10 md:py-16">
      <div className="text-center mb-8">
        <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-2 flex items-center justify-center gap-3">
          <Target className="text-brand-400" size={30} /> Fitness Goals
        </h2>
        <p className="text-slate-400 text-sm md:text-base">BMR → TDEE → Goal → Daily Target → Macros</p>
      </div>

      {/* Only Your Goal button showing */}
      <div className="bg-slate-900/60 border border-brand-600/20 rounded-2xl p-8 md:p-10 shadow-xl text-center mb-8">
        <button
          onClick={() => setShowModal(true)}
          className="py-3 px-10 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold transition shadow-lg shadow-brand-600/20 text-base md:text-lg"
        >
          Your Goal
        </button>
        <p className="text-slate-500 text-xs md:text-sm mt-3">Tap to open calculator + goal selector</p>
      </div>

      {/* Saved goals history */}
      <div className="grid gap-3">
        {goals.map((g: any) => (
          <div key={g.id ?? g.goal_type + g.target_value} className="flex items-center justify-between bg-slate-900/40 border border-brand-600/10 rounded-xl px-5 py-4">
            <div>
              <span className="font-bold text-brand-400 capitalize">{String(g.goal_type).replace(/_/g, ' ')}</span>
              <span className="ml-3 text-slate-400 text-sm">Target: {g.target_value ?? g.target_calories ?? 'N/A'} kcal</span>
            </div>
            <span className="text-xs font-semibold uppercase px-3 py-1 rounded-full bg-brand-600/20 text-brand-300">{g.status ?? 'active'}</span>
          </div>
        ))}
        {goals.length === 0 && <p className="text-center text-slate-500 text-sm">No goals yet — click Your Goal.</p>}
      </div>

      {/* Popup modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setShowModal(false)}>
          <div
            className="bg-slate-900 border border-brand-600/30 rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-800 sticky top-0 bg-slate-900">
              <h3 className="text-xl font-bold text-white flex items-center gap-2"><Calculator size={20} className="text-brand-400" /> Your Goal</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white" aria-label="Close"><X size={22} /></button>
            </div>

            <div className="p-6 space-y-5">
              {/* Goals field */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Goals</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {(Object.keys(GOAL_LABELS) as GoalType[]).map(gt => (
                    <button
                      key={gt}
                      type="button"
                      onClick={() => setForm({ ...form, goal_type: gt })}
                      className={`px-3 py-2.5 rounded-xl text-xs md:text-sm font-bold border transition ${
                        form.goal_type === gt
                          ? 'bg-brand-600 border-brand-500 text-white shadow-lg shadow-brand-600/20'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-brand-500/50'
                      }`}
                    >
                      {GOAL_LABELS[gt]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Calculator fields */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Calculator — BMR inputs</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <span className="text-xs text-slate-500">Weight (kg)</span>
                    <input type="number" value={form.weight_kg} onChange={e => setForm({ ...form, weight_kg: Number(e.target.value) })}
                      className="w-full mt-1 p-3 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-brand-500" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">Height (cm)</span>
                    <input type="number" value={form.height_cm} onChange={e => setForm({ ...form, height_cm: Number(e.target.value) })}
                      className="w-full mt-1 p-3 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-brand-500" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">Age</span>
                    <input type="number" value={form.age} onChange={e => setForm({ ...form, age: Number(e.target.value) })}
                      className="w-full mt-1 p-3 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-brand-500" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">Gender</span>
                    <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}
                      className="w-full mt-1 p-3 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-brand-500">
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>
                  <div className="col-span-2 md:col-span-2">
                    <span className="text-xs text-slate-500">Activity</span>
                    <select value={form.activity_level} onChange={e => setForm({ ...form, activity_level: e.target.value as any })}
                      className="w-full mt-1 p-3 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-brand-500">
                      <option value="sedentary">Sedentary (1.20x)</option>
                      <option value="lightly_active">Lightly Active (1.375x)</option>
                      <option value="moderately_active">Moderately Active (1.55x)</option>
                      <option value="very_active">Very Active (1.725x)</option>
                      <option value="extremely_active">Extremely Active (1.90x)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Live theory result */}
              <div className="bg-brand-900/20 border border-brand-600/20 rounded-2xl p-4 text-sm">
                <div className="grid grid-cols-2 gap-2 text-slate-300">
                  <div>BMR: <b className="text-white">{bmr} kcal</b></div>
                  <div>TDEE: <b className="text-white">{tdee} kcal</b></div>
                  <div>Target: <b className="text-brand-400">{target} kcal</b></div>
                  <div>Protein: <b className="text-white">{macros.protein}g</b> · Fat: <b className="text-white">{macros.fat}g</b> · Carbs: <b className="text-white">{macros.carbs}g</b></div>
                </div>
                <p className="text-[11px] text-slate-500 mt-2">Mifflin-St Jeor + goal multiplier ({GOAL_LABELS[form.goal_type]}) — same as backend.</p>
              </div>

              <button onClick={handleSave} disabled={saving}
                className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold transition shadow-lg shadow-brand-600/20 disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Goal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
