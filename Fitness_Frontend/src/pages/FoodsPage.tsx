import { useEffect, useState } from 'react';
import { Apple, Plus, Search } from 'lucide-react';
import Swal from 'sweetalert2';
import { apiClient } from '../lib/api';
import { useAuthStore } from '../store/auth';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const todayStr = () => new Date().toISOString().slice(0, 10);

export default function FoodsPage() {
  const [userId, setUserId] = useState('');
  const [foods, setFoods] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [date, setDate] = useState(todayStr());
  const [meal, setMeal] = useState('Breakfast');
  const [qty, setQty] = useState(1);
  const [selectedId, setSelectedId] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ name: '', serving_size: 100, serving_unit: 'g', calories: 0, protein: 0, carbohydrates: 0, fat: 0, fiber: 0 });

  async function loadFoods(uid: string) {
    try {
      const d = await apiClient.getFoods(uid);
      setFoods(Array.isArray(d) ? d : []);
    } catch { setFoods([]); }
  }
  async function loadLogs(uid: string) {
    try {
      const d = await apiClient.getDailyFoods(uid);
      setLogs(Array.isArray(d) ? d : []);
    } catch { setLogs([]); }
  }

  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!accessToken || !user?.id) return;
    setUserId(user.id);
    loadFoods(user.id);
    loadLogs(user.id);
  }, [accessToken, user?.id]);

  async function handleAddFood(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name) return;
    setError('');
    try {
      await apiClient.createFood({ user_id: userId, ...form });
      setForm({ name: '', serving_size: 100, serving_unit: 'g', calories: 0, protein: 0, carbohydrates: 0, fat: 0, fiber: 0 });
      await loadFoods(userId);
    } catch (err: any) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message || 'Add food failed.', confirmButtonText: 'OK', confirmButtonColor: '#22c55e' });
    }
  }

  async function handleLogFood() {
    const food = foods.find(f => String(f.id) === String(selectedId));
    if (!food || !userId) return;
    setSaving(true);
    setError('');
    try {
      // Ensure daily_records row exists for date (upsert)
      const rec = await apiClient.createDailyRecord({ user_id: userId, record_date: date });
      const recordId = rec?.id;
      const q = Number(qty) || 1;
      await apiClient.createDailyFood({
        user_id: userId,
        daily_record_id: recordId || null,
        food_id: food.id,
        meal_type: meal,
        quantity: q,
        calories: (Number(food.calories) || 0) * q,
        protein: (Number(food.protein) || 0) * q,
        carbohydrates: (Number(food.carbohydrates) || 0) * q,
        fat: (Number(food.fat) || 0) * q,
      });
      await loadLogs(userId);
    } catch (err: any) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message || 'Log failed.', confirmButtonText: 'OK', confirmButtonColor: '#22c55e' });
    }
    setSaving(false);
  }

  const filtered = foods.filter(f => f.name?.toLowerCase().includes(search.toLowerCase()));
  const dayLogs = logs.filter(l => {
    if (date && l.created_at) return String(l.created_at).slice(0, 10) === date;
    return true;
  }).slice(0, 20);
  const dayTotal = dayLogs.reduce((s, l) => s + (Number(l.calories) || 0), 0);

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-10 grid md:grid-cols-2 gap-6">
      <div>
        <h2 className="text-2xl font-extrabold text-white mb-1 flex items-center gap-2"><Apple className="text-brand-400" /> Foods</h2>
        <p className="text-slate-400 text-sm mb-4">Library → log to daily</p>
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search foods..."
            className="w-full pl-9 p-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm" />
        </div>
        <div className="grid gap-2 max-h-[320px] overflow-y-auto mb-4">
          {filtered.map(f => (
            <button key={f.id} onClick={() => setSelectedId(String(f.id))}
              className={`text-left p-3 rounded-xl border text-sm transition ${String(selectedId) === String(f.id) ? 'border-brand-500 bg-brand-900/20' : 'border-slate-800 bg-slate-900/40 hover:border-brand-500/40'}`}>
              <div className="font-bold text-white">{f.name} <span className="text-slate-500 font-normal">· {f.serving_size}{f.serving_unit}</span></div>
              <div className="text-slate-400 text-xs">{f.calories} kcal · P {f.protein}g · C {f.carbohydrates}g · F {f.fat}g</div>
            </button>
          ))}
          {filtered.length === 0 && <p className="text-slate-500 text-sm text-center">No foods — add below.</p>}
        </div>
        <form onSubmit={handleAddFood} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-2">
          <div className="text-sm font-bold text-white">Add food</div>
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Name" required
            className="w-full p-2.5 rounded-lg bg-ink border border-slate-700 text-white text-sm" />
          <div className="grid grid-cols-3 gap-2">
            <input type="number" value={form.serving_size} onChange={e => setForm({ ...form, serving_size: Number(e.target.value) })} placeholder="Size" className="p-2.5 rounded-lg bg-ink border border-slate-700 text-white text-sm" />
            <input value={form.serving_unit} onChange={e => setForm({ ...form, serving_unit: e.target.value })} placeholder="g" className="p-2.5 rounded-lg bg-ink border border-slate-700 text-white text-sm" />
            <input type="number" value={form.calories} onChange={e => setForm({ ...form, calories: Number(e.target.value) })} placeholder="kcal" className="p-2.5 rounded-lg bg-ink border border-slate-700 text-white text-sm" />
            <input type="number" value={form.protein} onChange={e => setForm({ ...form, protein: Number(e.target.value) })} placeholder="P g" className="p-2.5 rounded-lg bg-ink border border-slate-700 text-white text-sm" />
            <input type="number" value={form.carbohydrates} onChange={e => setForm({ ...form, carbohydrates: Number(e.target.value) })} placeholder="C g" className="p-2.5 rounded-lg bg-ink border border-slate-700 text-white text-sm" />
            <input type="number" value={form.fat} onChange={e => setForm({ ...form, fat: Number(e.target.value) })} placeholder="F g" className="p-2.5 rounded-lg bg-ink border border-slate-700 text-white text-sm" />
          </div>
          <button className="w-full py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-bold">Add</button>
        </form>
      </div>

      <div>
        <h2 className="text-2xl font-extrabold text-white mb-1">Daily Foods</h2>
        <p className="text-slate-400 text-sm mb-4">Total today: <b className="text-brand-400">{Math.round(dayTotal)} kcal</b></p>
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3 mb-4">
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="p-2.5 rounded-lg bg-ink border border-slate-700 text-white text-sm" />
            <select value={meal} onChange={e => setMeal(e.target.value)} className="p-2.5 rounded-lg bg-ink border border-slate-700 text-white text-sm">
              <option>Breakfast</option><option>Lunch</option><option>Dinner</option><option>Snack</option>
            </select>
          </div>
          <div className="flex gap-2">
            <input type="number" min={0.25} step={0.25} value={qty} onChange={e => setQty(Number(e.target.value))} className="w-24 p-2.5 rounded-lg bg-ink border border-slate-700 text-white text-sm" />
            <button onClick={handleLogFood} disabled={!selectedId || saving} className="flex-1 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2">
              <Plus size={16} /> {saving ? 'Logging...' : 'Add to Daily'}
            </button>
          </div>
          {!selectedId && <p className="text-xs text-slate-500">Select a food on the left first.</p>}
        </div>
        {error && <div className="text-red-400 text-sm mb-3">{error}</div>}
        <div className="grid gap-2">
          {dayLogs.map(l => (
            <div key={l.id} className="p-3 rounded-xl border border-slate-800 bg-slate-900/40 text-sm flex justify-between">
              <div><b className="text-white">{l.meal_type}</b> <span className="text-slate-400">x{l.quantity}</span></div>
              <div className="text-brand-400 font-bold">{l.calories} kcal</div>
            </div>
          ))}
          {dayLogs.length === 0 && <p className="text-slate-500 text-sm text-center">No logs yet.</p>}
        </div>
      </div>
    </div>
  );
}
