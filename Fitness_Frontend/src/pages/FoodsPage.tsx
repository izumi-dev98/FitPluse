import { useEffect, useMemo, useState } from 'react';
import { Apple, Plus, Search } from 'lucide-react';
import Swal from 'sweetalert2';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { useAuthStore } from '../store/auth';
import { qk, useInvalidateDaily } from '../lib/queries';
import { PageHeader, Card, Modal, PaginationBar, EmptyState } from '../components/ui';

const todayStr = () => new Date().toISOString().slice(0, 10);
const PAGE_SIZE = 8;
const emptyForm = { name: '', serving_size: 100, serving_unit: 'g', calories: 0, protein: 0, carbohydrates: 0, fat: 0, fiber: 0 };

function formatDate(value?: string) {
  if (!value) return '—';
  return String(value).slice(0, 10);
}

export default function FoodsPage() {
  const [userId, setUserId] = useState('');
  const [foods, setFoods] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [date, setDate] = useState(todayStr());
  const [meal, setMeal] = useState('Breakfast');
  const [qty, setQty] = useState(1);
  const [selectedId, setSelectedId] = useState('');
  const [saving, setSaving] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [libPage, setLibPage] = useState(1);
  const [logPage, setLogPage] = useState(1);
  const [form, setForm] = useState(emptyForm);

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
  const qc = useQueryClient();
  const invalidateDaily = useInvalidateDaily();

  useEffect(() => {
    if (!accessToken || !user?.id) return;
    setUserId(user.id);
    loadFoods(user.id);
    loadLogs(user.id);
  }, [accessToken, user?.id]);

  async function handleAddFood(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name) return;
    setCreating(true);
    try {
      await apiClient.createFood({ user_id: userId, ...form });
      setForm(emptyForm);
      setCreateOpen(false);
      await loadFoods(userId);
      // Refresh the shared catalog cache so the Daily log modal lists the new food.
      qc.invalidateQueries({ queryKey: qk.foods(userId) });
      Swal.fire({ icon: 'success', title: 'Food added', timer: 1400, showConfirmButton: false });
    } catch (err: any) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message || 'Add food failed.', confirmButtonText: 'OK', confirmButtonColor: '#65a30d' });
    }
    setCreating(false);
  }

  async function handleLogFood() {
    const food = foods.find(f => String(f.id) === String(selectedId));
    if (!food || !userId) return;
    setSaving(true);
    try {
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
      invalidateDaily(userId);
      Swal.fire({ icon: 'success', title: 'Logged', timer: 1200, showConfirmButton: false });
    } catch (err: any) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message || 'Log failed.', confirmButtonText: 'OK', confirmButtonColor: '#65a30d' });
    }
    setSaving(false);
  }

  const foodNameById = useMemo(() => {
    const map = new Map<string, string>();
    foods.forEach((f) => map.set(String(f.id), f.name));
    return map;
  }, [foods]);

  const filtered = useMemo(
    () => foods.filter((f) => f.name?.toLowerCase().includes(search.toLowerCase())),
    [foods, search],
  );

  const libPageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pagedFoods = filtered.slice((libPage - 1) * PAGE_SIZE, libPage * PAGE_SIZE);

  const sortedLogs = useMemo(
    () => [...logs].sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || ''))),
    [logs],
  );
  const logPageCount = Math.max(1, Math.ceil(sortedLogs.length / PAGE_SIZE));
  const pagedLogs = sortedLogs.slice((logPage - 1) * PAGE_SIZE, logPage * PAGE_SIZE);
  const dayTotal = logs
    .filter((l) => !date || String(l.created_at || '').slice(0, 10) === date)
    .reduce((s, l) => s + (Number(l.calories) || 0), 0);

  useEffect(() => { setLibPage(1); }, [search]);
  useEffect(() => { if (libPage > libPageCount) setLibPage(libPageCount); }, [libPage, libPageCount]);
  useEffect(() => { if (logPage > logPageCount) setLogPage(logPageCount); }, [logPage, logPageCount]);

  const selectedFood = foods.find((f) => String(f.id) === String(selectedId));

  return (
    <div>
      <PageHeader
        title="Foods"
        subtitle="Keep your food library, then log meals. Create items in a popup."
        icon={Apple}
        action={
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-400 hover:bg-brand-300 text-slate-950 text-sm font-bold"
          >
            <Plus size={16} /> My Food
          </button>
        }
      />

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="overflow-hidden p-0">
          <div className="p-5 pb-3">
            <h2 className="text-lg font-bold text-white mb-1">My foods</h2>
            <p className="text-slate-400 text-sm mb-4">Select a row, then log it on the right.</p>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search foods..."
                className="w-full pl-9 p-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm"
              />
            </div>
          </div>
          {filtered.length === 0 ? (
            <EmptyState title="No foods yet" hint="Use My Food to add your first item." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[520px]">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 border-y border-slate-800">
                    <th className="px-4 py-2.5 font-semibold">Name</th>
                    <th className="px-3 py-2.5 font-semibold">Serving</th>
                    <th className="px-3 py-2.5 font-semibold">kcal</th>
                    <th className="px-3 py-2.5 font-semibold">Macros</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedFoods.map((f) => {
                    const active = String(selectedId) === String(f.id);
                    return (
                      <tr
                        key={f.id}
                        onClick={() => setSelectedId(String(f.id))}
                        className={`border-b border-slate-800/70 cursor-pointer ${active ? 'bg-brand-900/20' : 'hover:bg-slate-900/50'}`}
                      >
                        <td className="px-4 py-3 font-bold text-white">{f.name}</td>
                        <td className="px-3 py-3 text-slate-400">{f.serving_size}{f.serving_unit}</td>
                        <td className="px-3 py-3 text-brand-400 font-semibold">{f.calories}</td>
                        <td className="px-3 py-3 text-slate-400 text-xs">
                          P {f.protein}g · C {f.carbohydrates}g · F {f.fat}g
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <PaginationBar page={libPage} pageCount={libPageCount} total={filtered.length} pageSize={PAGE_SIZE} onPage={setLibPage} />
            </div>
          )}
        </Card>

        <Card>
          <h2 className="text-lg font-bold text-white mb-1">Log food</h2>
          <p className="text-slate-400 text-sm mb-4">
            {date}: <b className="text-brand-400">{Math.round(dayTotal)} kcal</b>
            {selectedFood && <span className="ml-2 text-slate-500">· {selectedFood.name}</span>}
          </p>
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="p-2.5 rounded-lg bg-ink border border-slate-700 text-white text-sm" />
              <select value={meal} onChange={(e) => setMeal(e.target.value)} className="p-2.5 rounded-lg bg-ink border border-slate-700 text-white text-sm">
                <option>Breakfast</option><option>Lunch</option><option>Dinner</option><option>Snack</option>
              </select>
            </div>
            <div className="flex gap-2">
              <input type="number" min={0.25} step={0.25} value={qty} onChange={(e) => setQty(Number(e.target.value))} className="w-24 p-2.5 rounded-lg bg-ink border border-slate-700 text-white text-sm" />
              <button onClick={handleLogFood} disabled={!selectedId || saving} className="flex-1 py-2.5 rounded-xl bg-brand-400 hover:bg-brand-300 text-slate-950 text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2">
                <Plus size={16} /> {saving ? 'Logging...' : 'Add to Daily'}
              </button>
            </div>
            {!selectedId && <p className="text-xs text-slate-500">Select a food in the list first.</p>}
          </div>
        </Card>
      </div>

      <Card className="mt-6 overflow-hidden p-0">
        <div className="p-5 pb-3">
          <h2 className="text-lg font-bold text-white">Food log</h2>
          <p className="text-slate-400 text-sm">All logged meals, newest first.</p>
        </div>
        {sortedLogs.length === 0 ? (
          <EmptyState title="No logs yet" hint="Select a food and add it to daily." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 border-y border-slate-800">
                  <th className="px-4 py-2.5 font-semibold">Date</th>
                  <th className="px-3 py-2.5 font-semibold">Food</th>
                  <th className="px-3 py-2.5 font-semibold">Meal</th>
                  <th className="px-3 py-2.5 font-semibold">Qty</th>
                  <th className="px-3 py-2.5 font-semibold">kcal</th>
                  <th className="px-3 py-2.5 font-semibold">Macros</th>
                </tr>
              </thead>
              <tbody>
                {pagedLogs.map((l) => (
                  <tr key={l.id} className="border-b border-slate-800/70">
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{formatDate(l.created_at)}</td>
                    <td className="px-3 py-3 text-white font-medium">{l.foods?.name || l.food_name || foodNameById.get(String(l.food_id)) || '—'}</td>
                    <td className="px-3 py-3 text-slate-300">{l.meal_type}</td>
                    <td className="px-3 py-3 text-slate-400">×{l.quantity}</td>
                    <td className="px-3 py-3 text-brand-400 font-semibold">{l.calories}</td>
                    <td className="px-3 py-3 text-slate-400 text-xs">
                      P {l.protein ?? 0}g · C {l.carbohydrates ?? 0}g · F {l.fat ?? 0}g
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <PaginationBar page={logPage} pageCount={logPageCount} total={sortedLogs.length} pageSize={PAGE_SIZE} onPage={setLogPage} />
          </div>
        )}
      </Card>

      <Modal open={createOpen} title="Create my food" onClose={() => setCreateOpen(false)}>
        <form onSubmit={handleAddFood} className="space-y-3">
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Name"
            required
            className="w-full p-2.5 rounded-lg bg-ink border border-slate-700 text-white text-sm"
          />
          <div className="grid grid-cols-3 gap-2">
            <input type="number" value={form.serving_size} onChange={(e) => setForm({ ...form, serving_size: Number(e.target.value) })} placeholder="Size" className="p-2.5 rounded-lg bg-ink border border-slate-700 text-white text-sm" />
            <input value={form.serving_unit} onChange={(e) => setForm({ ...form, serving_unit: e.target.value })} placeholder="g" className="p-2.5 rounded-lg bg-ink border border-slate-700 text-white text-sm" />
            <input type="number" value={form.calories} onChange={(e) => setForm({ ...form, calories: Number(e.target.value) })} placeholder="kcal" className="p-2.5 rounded-lg bg-ink border border-slate-700 text-white text-sm" />
            <input type="number" value={form.protein} onChange={(e) => setForm({ ...form, protein: Number(e.target.value) })} placeholder="P g" className="p-2.5 rounded-lg bg-ink border border-slate-700 text-white text-sm" />
            <input type="number" value={form.carbohydrates} onChange={(e) => setForm({ ...form, carbohydrates: Number(e.target.value) })} placeholder="C g" className="p-2.5 rounded-lg bg-ink border border-slate-700 text-white text-sm" />
            <input type="number" value={form.fat} onChange={(e) => setForm({ ...form, fat: Number(e.target.value) })} placeholder="F g" className="p-2.5 rounded-lg bg-ink border border-slate-700 text-white text-sm" />
          </div>
          <button disabled={creating} className="w-full py-2.5 rounded-xl bg-brand-400 hover:bg-brand-300 text-slate-950 text-sm font-bold disabled:opacity-50">
            {creating ? 'Saving...' : 'Save food'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
