import { useState } from 'react';
import { apiClient } from '../lib/api';
import { bmrSchema } from '../lib/schemas';
import Swal from 'sweetalert2';

export default function Calculator() {
  const [form, setForm] = useState({ gender: 'male' as const, weight_kg: 70, height_cm: 175, age: 30, activity_level: 'moderately_active' as const });
  const [results, setResults] = useState<{ bmr?: number; tdee?: number; target?: number; macros?: any } | null>(null);

  const handleCalc = async () => {
    const parsed = bmrSchema.safeParse({ ...form, weight_kg: Number(form.weight_kg), height_cm: Number(form.height_cm), age: Number(form.age) });
    if (!parsed.success) { Swal.fire('Validation Error', parsed.error.issues.map((i: any) => i.message).join('\n'), 'error'); return; }
    try {
      const bmrRes = await apiClient.calcBMR(form);
      const tdeeRes = await apiClient.calcTDEE({ bmr: bmrRes.bmr, activity_level: form.activity_level });
      const targetRes = await apiClient.calcCalorieTarget({ tdee: tdeeRes.tdee, goal_type: 'maintain' });
      setResults({ bmr: bmrRes.bmr, tdee: tdeeRes.tdee, target: targetRes.targetCalories });
      Swal.fire('Calculated!', `BMR: ${bmrRes.bmr} kcal | TDEE: ${tdeeRes.tdee} kcal`, 'success');
    } catch (err: any) {
      Swal.fire('Error', err.message || 'Failed to calculate', 'error');
    }
  };

  return (
    <section id="calculator" className="max-w-4xl mx-auto px-6 py-16">
      <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-2">BMR & TDEE Calculator</h2>
      <p className="text-slate-400 mb-8">Calculate your energy needs based on Mifflin-St Jeor theory.</p>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-slate-900/60 border border-brand-600/20 rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="text-xl font-bold text-brand-400">Inputs</h3>
          <div className="grid grid-cols-2 gap-3">
            <input type="number" placeholder="Weight (kg)" className="p-3 rounded-xl bg-slate-950 border border-slate-800 focus:outline-none focus:border-brand-500" value={form.weight_kg} onChange={e => setForm({ ...form, weight_kg: Number(e.target.value) })} />
            <input type="number" placeholder="Height (cm)" className="p-3 rounded-xl bg-slate-950 border border-slate-800 focus:outline-none focus:border-brand-500" value={form.height_cm} onChange={e => setForm({ ...form, height_cm: Number(e.target.value) })} />
            <input type="number" placeholder="Age" className="p-3 rounded-xl bg-slate-950 border border-slate-800 focus:outline-none focus:border-brand-500" value={form.age} onChange={e => setForm({ ...form, age: Number(e.target.value) })} />
            <select className="p-3 rounded-xl bg-slate-950 border border-slate-800 focus:outline-none focus:border-brand-500" value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value as any })}>
              <option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
            </select>
          </div>
          <select className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 focus:outline-none focus:border-brand-500" value={form.activity_level} onChange={e => setForm({ ...form, activity_level: e.target.value as any })}>
            <option value="sedentary">Sedentary (1.2x)</option>
            <option value="lightly_active">Lightly Active (1.375x)</option>
            <option value="moderately_active">Moderately Active (1.55x)</option>
            <option value="very_active">Very Active (1.725x)</option>
            <option value="extremely_active">Extremely Active (1.9x)</option>
          </select>
          <button onClick={handleCalc} className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold transition shadow-lg shadow-brand-600/20">Calculate</button>
        </div>
        <div className="bg-gradient-to-br from-brand-900/30 to-brand-700/10 border border-brand-600/20 rounded-2xl p-6 shadow-xl">
          <h3 className="text-xl font-bold text-brand-400 mb-4">Results</h3>
          {results ? (
            <div className="space-y-3 text-sm md:text-base">
              <div className="flex justify-between border-b border-slate-700/50 py-2"><span className="text-slate-300">BMR</span><span className="font-bold text-white">{results.bmr} kcal</span></div>
              <div className="flex justify-between border-b border-slate-700/50 py-2"><span className="text-slate-300">TDEE</span><span className="font-bold text-white">{results.tdee} kcal</span></div>
              <div className="flex justify-between border-b border-slate-700/50 py-2"><span className="text-slate-300">Target (Maintain)</span><span className="font-bold text-brand-400">{results.target} kcal</span></div>
            </div>
          ) : (
            <p className="text-slate-500">Run calculation to see results.</p>
          )}
        </div>
      </div>
    </section>
  );
}