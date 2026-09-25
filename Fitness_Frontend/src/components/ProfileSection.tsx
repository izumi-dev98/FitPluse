import { useState } from 'react';
import { useAppStore } from '../store/store';
import { apiClient } from '../lib/api';
import { profileSchema } from '../lib/schemas';
import Swal from 'sweetalert2';

export default function ProfileSection() {
  const { openModal } = useAppStore();
  const [form, setForm] = useState({ name: '', age: 25, height_cm: 170, weight_kg: 70, gender: 'male' as const, activity_level: 'moderately_active' as const });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = profileSchema.safeParse({ ...form, age: Number(form.age), height_cm: Number(form.height_cm), weight_kg: Number(form.weight_kg) });
    if (!parsed.success) {
      Swal.fire('Validation Error', parsed.error.issues.map((i) => i.message).join('\n'), 'error');
      return;
    }
    setSaving(true);
    try {
      const profile = await apiClient.createProfile(form);
      Swal.fire('Profile Created', `Profile saved!`, 'success');
      openModal('Profile Created', JSON.stringify(profile, null, 2));
    } catch (err: any) {
      Swal.fire('Error', err.message || 'Failed to save profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section id="profile" className="max-w-4xl mx-auto px-6 py-16">
      <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-2">Profile</h2>
      <p className="text-slate-400 mb-8">Set your base info to calculate BMR and TDEE.</p>
      <form onSubmit={handleSubmit} className="grid md:grid-cols-3 gap-4 bg-slate-900/60 border border-brand-600/20 rounded-2xl p-6 shadow-xl">
        <input required placeholder="Name" className="p-3 rounded-xl bg-slate-950 border border-slate-800 focus:outline-none focus:border-brand-500" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        <input required type="number" placeholder="Age" className="p-3 rounded-xl bg-slate-950 border border-slate-800 focus:outline-none focus:border-brand-500" value={form.age} onChange={e => setForm({ ...form, age: Number(e.target.value) })} />
        <input required type="number" placeholder="Weight (kg)" className="p-3 rounded-xl bg-slate-950 border border-slate-800 focus:outline-none focus:border-brand-500" value={form.weight_kg} onChange={e => setForm({ ...form, weight_kg: Number(e.target.value) })} />
        <input required type="number" placeholder="Height (cm)" className="p-3 rounded-xl bg-slate-950 border border-slate-800 focus:outline-none focus:border-brand-500" value={form.height_cm} onChange={e => setForm({ ...form, height_cm: Number(e.target.value) })} />
        <select className="p-3 rounded-xl bg-slate-950 border border-slate-800 focus:outline-none focus:border-brand-500" value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value as any })}>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </select>
        <select className="p-3 rounded-xl bg-slate-950 border border-slate-800 focus:outline-none focus:border-brand-500" value={form.activity_level} onChange={e => setForm({ ...form, activity_level: e.target.value as any })}>
          <option value="sedentary">Sedentary</option>
          <option value="lightly_active">Lightly Active</option>
          <option value="moderately_active">Moderately Active</option>
          <option value="very_active">Very Active</option>
          <option value="extremely_active">Extremely Active</option>
        </select>
        <button type="submit" disabled={saving} className="col-span-1 md:col-span-3 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold transition shadow-lg shadow-brand-600/20">
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </form>
    </section>
  );
}