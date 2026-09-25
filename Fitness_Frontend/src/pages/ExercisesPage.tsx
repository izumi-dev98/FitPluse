import { useEffect, useState } from 'react';
import { Dumbbell, Plus, Search } from 'lucide-react';
import Swal from 'sweetalert2';
import { apiClient } from '../lib/api';
import { useAuthStore } from '../store/auth';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const todayStr = () => new Date().toISOString().slice(0, 10);

export default function ExercisesPage() {
  const [userId, setUserId] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [date, setDate] = useState(todayStr());
  const [selectedId, setSelectedId] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ name: '', exercise_type: 'Strength', description: '' });
  const [log, setLog] = useState({ sets: 3, reps: 10, duration_minutes: 30, calories_burned: 200, distance_km: 0 });

  async function load(uid: string) {
    try {
      const d = await apiClient.getExercises(uid);
      setItems(Array.isArray(d) ? d : []);
    } catch { setItems([]); }
    try {
      const l = await apiClient.getDailyExercises(uid);
      setLogs(Array.isArray(l) ? l : []);
    } catch { setLogs([]); }
  }

  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!accessToken || !user?.id) return;
    setUserId(user.id);
    load(user.id);
  }, [accessToken, user?.id]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !userId) return;
    setError('');
    try {
      await apiClient.createExercise({ user_id: userId, ...form });
      setForm({ name: '', exercise_type: 'Strength', description: '' });
      await load(userId);
    } catch {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Add exercise failed.', confirmButtonText: 'OK', confirmButtonColor: '#22c55e' });
    }
  }

  async function handleLog() {
    if (!selectedId || !userId) return;
    setSaving(true);
    setError('');
    try {
      const rec = await apiClient.createDailyRecord({ user_id: userId, record_date: date });
      await apiClient.createDailyExercise({
        user_id: userId,
        daily_record_id: rec?.id || null,
        exercise_id: selectedId,
        ...log,
      });
      await load(userId);
    } catch {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Log failed. Check backend daily-exercises + daily-records.', confirmButtonText: 'OK', confirmButtonColor: '#22c55e' });
    }
    setSaving(false);
  }

  const filtered = items.filter(i => i.name?.toLowerCase().includes(search.toLowerCase()));
  const dayTotal = logs.slice(0, 20).reduce((s, l) => s + (Number(l.calories_burned) || 0), 0);

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-10 grid md:grid-cols-2 gap-6">
      <div>
        <h2 className="text-2xl font-extrabold text-white mb-1 flex items-center gap-2"><Dumbbell className="text-brand-400" /> Exercises</h2>
        <p className="text-slate-400 text-sm mb-4">Library → log to daily</p>
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search exercises..."
            className="w-full pl-9 p-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm" />
        </div>
        <div className="grid gap-2 max-h-[320px] overflow-y-auto mb-4">
          {filtered.map(x => (
            <button key={x.id} onClick={() => setSelectedId(String(x.id))}
              className={`text-left p-3 rounded-xl border text-sm transition ${String(selectedId) === String(x.id) ? 'border-brand-500 bg-brand-900/20' : 'border-slate-800 bg-slate-900/40 hover:border-brand-500/40'}`}>
              <div className="font-bold text-white">{x.name} <span className="text-slate-500 font-normal">· {x.exercise_type}</span></div>
              {x.description && <div className="text-slate-400 text-xs mt-1">{x.description}</div>}
            </button>
          ))}
          {filtered.length === 0 && <p className="text-slate-500 text-sm text-center">No exercises — add below.</p>}
        </div>
        <form onSubmit={handleAdd} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-2">
          <div className="text-sm font-bold text-white">Add exercise</div>
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Name e.g. Push-ups" required
            className="w-full p-2.5 rounded-lg bg-ink border border-slate-700 text-white text-sm" />
          <div className="grid grid-cols-2 gap-2">
            <select value={form.exercise_type} onChange={e => setForm({ ...form, exercise_type: e.target.value })}
              className="p-2.5 rounded-lg bg-ink border border-slate-700 text-white text-sm">
              <option>Strength</option><option>Cardio</option><option>Flexibility</option><option>Sports</option>
            </select>
            <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Description"
              className="p-2.5 rounded-lg bg-ink border border-slate-700 text-white text-sm" />
          </div>
          <button className="w-full py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-bold">Add</button>
        </form>
      </div>

      <div>
        <h2 className="text-2xl font-extrabold text-white mb-1">Daily Exercises</h2>
        <p className="text-slate-400 text-sm mb-4">Burned: <b className="text-brand-400">{Math.round(dayTotal)} kcal</b></p>
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3 mb-4">
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="w-full p-2.5 rounded-lg bg-ink border border-slate-700 text-white text-sm" />
          <div className="grid grid-cols-2 gap-2">
            <input type="number" value={log.sets} onChange={e => setLog({ ...log, sets: Number(e.target.value) })} placeholder="Sets" className="p-2.5 rounded-lg bg-ink border border-slate-700 text-white text-sm" />
            <input type="number" value={log.reps} onChange={e => setLog({ ...log, reps: Number(e.target.value) })} placeholder="Reps" className="p-2.5 rounded-lg bg-ink border border-slate-700 text-white text-sm" />
            <input type="number" value={log.duration_minutes} onChange={e => setLog({ ...log, duration_minutes: Number(e.target.value) })} placeholder="Minutes" className="p-2.5 rounded-lg bg-ink border border-slate-700 text-white text-sm" />
            <input type="number" value={log.calories_burned} onChange={e => setLog({ ...log, calories_burned: Number(e.target.value) })} placeholder="kcal burned" className="p-2.5 rounded-lg bg-ink border border-slate-700 text-white text-sm" />
          </div>
          <button onClick={handleLog} disabled={!selectedId || saving}
            className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2">
            <Plus size={16} /> {saving ? 'Logging...' : 'Add to Daily'}
          </button>
          {!selectedId && <p className="text-xs text-slate-500">Select an exercise on the left first.</p>}
        </div>
        {error && <div className="text-red-400 text-sm mb-3">{error}</div>}
        <div className="grid gap-2">
          {logs.slice(0, 20).map(l => (
            <div key={l.id} className="p-3 rounded-xl border border-slate-800 bg-slate-900/40 text-sm flex justify-between">
              <div className="text-white">{l.sets}x{l.reps} · {l.duration_minutes} min</div>
              <div className="text-brand-400 font-bold">{l.calories_burned} kcal</div>
            </div>
          ))}
          {logs.length === 0 && <p className="text-slate-500 text-sm text-center">No logs yet.</p>}
        </div>
      </div>
    </div>
  );
}
