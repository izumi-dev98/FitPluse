import { useEffect, useMemo, useState } from 'react';
import { Apple, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import Swal from 'sweetalert2';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { useAuthStore } from '../store/auth';
import { qk } from '../lib/queries';
import { PageHeader, Card, PaginationBar, EmptyState } from '../components/ui';
import { CustomFieldsModal, FOOD_BASE_FIELDS } from '../components/CustomFieldsModal';

const PAGE_SIZE = 8;

function formatDate(value?: string) {
  return value ? String(value).slice(0, 10) : '—';
}

export default function FoodsPage() {
  const [userId, setUserId] = useState('');
  const [foods, setFoods] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [libPage, setLibPage] = useState(1);
  const [logPage, setLogPage] = useState(1);
  const [editFood, setEditFood] = useState<any>(null);
  
  // Custom fields modal state - start empty, user adds fields
  const [customFields] = useState<import('../components/CustomFieldsModal').CustomField[]>([]);

  async function loadFoods(uid: string) {
    try {
      const d = await apiClient.getFoods(uid);
      setFoods(Array.isArray(d) ? d : []);
    } catch { setFoods([]); }
  }
  async function loadLogs(uid: string) {
    try {
      const data = await apiClient.getDailyFoods(uid);
      setLogs(Array.isArray(data) ? data : []);
    } catch { setLogs([]); }
  }
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  useEffect(() => {
    if (!accessToken || !user?.id) return;
    setUserId(user.id);
    loadFoods(user.id);
    loadLogs(user.id);
  }, [accessToken, user?.id]);

  async function handleCreateFood(data: Record<string, any>) {
    if (!data.name) return;
    setCreating(true);
    try {
      await apiClient.createFood({ user_id: userId, ...data });
      setCreateOpen(false);
      await loadFoods(userId);
      qc.invalidateQueries({ queryKey: qk.foods(userId) });
      Swal.fire({ icon: 'success', title: 'Food added', timer: 1400, showConfirmButton: false });
    } catch (err: any) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message || 'Add food failed.', confirmButtonText: 'OK', confirmButtonColor: '#65a30d' });
    }
    setCreating(false);
  }

  async function handleUpdateFood(data: Record<string, any>) {
    if (!editFood || !data.name) return;
    setCreating(true);
    try {
      await apiClient.updateFood(editFood.id, { user_id: userId, ...data });
      setEditFood(null);
      await loadFoods(userId);
      qc.invalidateQueries({ queryKey: qk.foods(userId) });
      Swal.fire({ icon: 'success', title: 'Food updated', timer: 1400, showConfirmButton: false });
    } catch (err: any) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message || 'Update failed.', confirmButtonText: 'OK', confirmButtonColor: '#65a30d' });
    }
    setCreating(false);
  }

  async function handleDeleteFood(food: any) {
    const result = await Swal.fire({ title: `Delete ${food.name}?`, text: 'This cannot be undone.', icon: 'warning', showCancelButton: true, confirmButtonText: 'Delete', confirmButtonColor: '#dc2626' });
    if (!result.isConfirmed) return;
    try {
      await apiClient.deleteFood(food.id);
      await loadFoods(userId);
      qc.invalidateQueries({ queryKey: qk.foods(userId) });
    } catch (err: any) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message || 'Delete failed.', confirmButtonText: 'OK', confirmButtonColor: '#65a30d' });
    }
  }

  const filtered = useMemo(
    () => foods.filter((f) => f.name?.toLowerCase().includes(search.toLowerCase())),
    [foods, search],
  );

  const libPageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pagedFoods = filtered.slice((libPage - 1) * PAGE_SIZE, libPage * PAGE_SIZE);
  const sortedLogs = useMemo(() => [...logs].sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || ''))), [logs]);
  const logPageCount = Math.max(1, Math.ceil(sortedLogs.length / PAGE_SIZE));
  const pagedLogs = sortedLogs.slice((logPage - 1) * PAGE_SIZE, logPage * PAGE_SIZE);

  useEffect(() => { setLibPage(1); }, [search]);
  useEffect(() => { if (libPage > libPageCount) setLibPage(libPageCount); }, [libPage, libPageCount]);
  useEffect(() => { if (logPage > logPageCount) setLogPage(logPageCount); }, [logPage, logPageCount]);

  return (
    <div>
      <PageHeader
        title="Foods"
        subtitle="Keep your personal food library. Create items with custom fields."
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

      <div>
        <Card className="overflow-hidden p-0">
          <div className="p-5 pb-3">
            <h2 className="text-lg font-bold text-white mb-1">My foods</h2>
            <p className="text-slate-400 text-sm mb-4">Browse your saved foods or add a new item.</p>
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
                    <th className="px-3 py-2.5 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedFoods.map((f) => {
                    return (
                      <tr
                        key={f.id}
                        className="border-b border-slate-800/70 hover:bg-slate-900/50"
                      >
                        <td className="px-4 py-3 font-bold text-white">{f.name}</td>
                        <td className="px-3 py-3 text-slate-400">{f.serving_size}{f.serving_unit}</td>
                        <td className="px-3 py-3 text-brand-400 font-semibold">{f.calories}</td>
                        <td className="px-3 py-3 text-slate-400 text-xs">
                          P {f.protein}g · C {f.carbohydrates}g · F {f.fat}g
                        </td>
                        <td className="px-3 py-3 text-right whitespace-nowrap">
                          <button type="button" onClick={() => setEditFood(f)} className="p-1.5 text-slate-400 hover:text-brand-400" aria-label="Edit food"><Pencil size={15} /></button>
                          <button type="button" onClick={() => handleDeleteFood(f)} className="p-1.5 text-slate-400 hover:text-red-400" aria-label="Delete food"><Trash2 size={15} /></button>
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

      </div>

      <Card className="mt-6 overflow-hidden p-0">
        <div className="p-5 pb-3"><h2 className="text-lg font-bold text-white">Food log</h2><p className="text-slate-400 text-sm">Logged meals, newest first.</p></div>
        {sortedLogs.length === 0 ? <EmptyState title="No food logs yet" hint="Log meals from the Daily page." /> : <div className="overflow-x-auto"><table className="w-full text-sm min-w-[640px]"><thead><tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 border-y border-slate-800"><th className="px-4 py-2.5">Date</th><th className="px-3 py-2.5">Food</th><th className="px-3 py-2.5">Meal</th><th className="px-3 py-2.5">Qty</th><th className="px-3 py-2.5">kcal</th></tr></thead><tbody>{pagedLogs.map((log) => <tr key={log.id} className="border-b border-slate-800/70"><td className="px-4 py-3 text-slate-400">{formatDate(log.created_at)}</td><td className="px-3 py-3 text-white">{log.foods?.name || log.food_name || foods.find((food) => String(food.id) === String(log.food_id))?.name || '—'}</td><td className="px-3 py-3 text-slate-300">{log.meal_type}</td><td className="px-3 py-3 text-slate-400">×{log.quantity}</td><td className="px-3 py-3 text-brand-400 font-semibold">{log.calories}</td></tr>)}</tbody></table><PaginationBar page={logPage} pageCount={logPageCount} total={sortedLogs.length} pageSize={PAGE_SIZE} onPage={setLogPage} /></div>}
      </Card>

      <CustomFieldsModal
        open={createOpen}
        title="Create my food"
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreateFood}
        submitting={creating}
        initialFields={customFields}
        baseFields={FOOD_BASE_FIELDS}
        submitLabel="Save food"
        allowCustomFields={false}
      />
      {editFood && <CustomFieldsModal open={Boolean(editFood)} title="Edit food" onClose={() => setEditFood(null)} onSubmit={handleUpdateFood} submitting={creating} initialFields={[]} baseFields={FOOD_BASE_FIELDS.map((field) => ({ ...field, value: String(editFood[field.id] ?? field.value ?? '') }))} submitLabel="Update food" allowCustomFields={false} />}
    </div>
  );
}