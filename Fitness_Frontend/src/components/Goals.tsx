import { useState } from 'react';
import { apiClient } from '../lib/api';
import { goalSchema } from '../lib/schemas';
import Swal from 'sweetalert2';
import { useQuery } from '@tanstack/react-query';

export default function Goals() {
  const [form, setForm] = useState({ goal_type: 'muscle_gain' as const, target_value: 2400, status: 'active' as const });
  const userId = 'default-user'; // demo
  const { data, isLoading, refetch } = useQuery({ queryKey: ['goals', userId], queryFn: () => apiClient.getGoals(userId), enabled: false });

  const handleAdd = async () => {
    const parsed = goalSchema.safeParse({ ...form, user_id: userId, target_value: Number(form.target_value) });
    if (!parsed.success) { Swal.fire('Error', parsed.error.issues.map((i: any) => i.message).join('\n'), 'error'); return; }
    try {
      await apiClient.createGoal({ ...form, user_id: userId, target_value: Number(form.target_value) });
      Swal.fire('Added!', 'Goal saved.', 'success');
      refetch();
    } catch (err: any) { Swal.fire('Error', err.message, 'error'); }
  };

  return (
    <section id="goals" className="max-w-4xl mx-auto px-6 py-16">
      <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-2">Fitness Goals</h2>
      <p className="text-slate-400 mb-8">Set and track your fitness objectives.</p>
      <div className="bg-slate-900/60 border border-brand-600/20 rounded-2xl p-6 shadow-xl mb-6">
        <div className="grid md:grid-cols-2 gap-3">
          <select className="p-3 rounded-xl bg-slate-950 border border-slate-800 focus:outline-none focus:border-brand-500" value={form.goal_type} onChange={e => setForm({ ...form, goal_type: e.target.value as any })}>
            <option value="skinny_to_fit">Skinny → Fit</option>
            <option value="muscle_gain">Muscle Gain</option>
            <option value="weight_gain">Weight Gain</option>
            <option value="maintain">Maintain</option>
            <option value="fat_loss">Fat Loss</option>
            <option value="weight_loss">Weight Loss</option>
          </select>
          <input type="number" placeholder="Target Calories" className="p-3 rounded-xl bg-slate-950 border border-slate-800 focus:outline-none focus:border-brand-500" value={form.target_value} onChange={e => setForm({ ...form, target_value: Number(e.target.value) })} />
          <button onClick={handleAdd} className="col-span-1 md:col-span-2 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold transition shadow-lg shadow-brand-600/20">Add Goal</button>
        </div>
      </div>
      <div className="grid gap-3">
        {isLoading ? <p className="text-slate-400">Loading...</p> : (data || []).map((g: any) => (
          <div key={g.id} className="flex items-center justify-between bg-slate-900/40 border border-brand-600/10 rounded-xl px-5 py-4 hover:border-brand-500/40 transition">
            <div>
              <span className="font-bold text-brand-400 capitalize">{g.goal_type.replace(/_/g, ' ')}</span>
              <span className="ml-3 text-slate-400 text-sm">Target: {g.target_value || 'N/A'}</span>
            </div>
            <span className="text-xs font-semibold uppercase tracking-wide px-3 py-1 rounded-full bg-brand-600/20 text-brand-300">{g.status}</span>
          </div>
        ))}
      </div>
    </section>
  );
}