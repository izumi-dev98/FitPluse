import { useEffect, useMemo, useState } from 'react';
import { Dumbbell, Plus, Search } from 'lucide-react';
import Swal from 'sweetalert2';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { useAuthStore } from '../store/auth';
import { qk, useInvalidateDaily } from '../lib/queries';
import { PageHeader, Card, PaginationBar, EmptyState } from '../components/ui';
import { CustomFieldsModal, EXERCISE_BASE_FIELDS, EXERCISE_CUSTOM_FIELD_SUGGESTIONS } from '../components/CustomFieldsModal';

const todayStr = () => new Date().toISOString().slice(0, 10);
const PAGE_SIZE = 8;

function formatDate(value?: string) {
  if (!value) return '—';
  return String(value).slice(0, 10);
}

export default function ExercisesPage() {
  const [userId, setUserId] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [date, setDate] = useState(todayStr());
  const [selectedId, setSelectedId] = useState('');
  const [saving, setSaving] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [libPage, setLibPage] = useState(1);
  const [logPage, setLogPage] = useState(1);
  const [log, setLog] = useState({ sets: 3, reps: 10, duration_minutes: 30, calories_burned: 200, distance_km: 0 });
  
  // Custom fields modal state - start empty, user adds fields
  const [customFields] = useState<import('../components/CustomFieldsModal').CustomField[]>([]);

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
  const qc = useQueryClient();
  const invalidateDaily = useInvalidateDaily();

  useEffect(() => {
    if (!accessToken || !user?.id) return;
    setUserId(user.id);
    load(user.id);
  }, [accessToken, user?.id]);

  async function handleCreateExercise(data: Record<string, any>) {
    if (!data.name || !userId) return;
    setCreating(true);
    try {
      await apiClient.createExercise({ user_id: userId, ...data });
      setCreateOpen(false);
      await load(userId);
      qc.invalidateQueries({ queryKey: qk.exercises(userId) });
      Swal.fire({ icon: 'success', title: 'Exercise added', timer: 1400, showConfirmButton: false });
    } catch {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Add exercise failed.', confirmButtonText: 'OK', confirmButtonColor: '#65a30d' });
    }
    setCreating(false);
  }

  async function handleLog() {
    if (!selectedId || !userId) return;
    setSaving(true);
    try {
      const rec = await apiClient.createDailyRecord({ user_id: userId, record_date: date });
      await apiClient.createDailyExercise({
        user_id: userId,
        daily_record_id: rec?.id || null,
        exercise_id: selectedId,
        ...log,
      });
      await load(userId);
      invalidateDaily(userId);
      Swal.fire({ icon: 'success', title: 'Logged', timer: 1200, showConfirmButton: false });
    } catch {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Log failed. Check backend daily-exercises + daily-records.', confirmButtonText: 'OK', confirmButtonColor: '#65a30d' });
    }
    setSaving(false);
  }

  const nameById = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach((x) => map.set(String(x.id), x.name));
    return map;
  }, [items]);

  const filtered = useMemo(
    () => items.filter((i) => i.name?.toLowerCase().includes(search.toLowerCase())),
    [items, search],
  );
  const libPageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pagedItems = filtered.slice((libPage - 1) * PAGE_SIZE, libPage * PAGE_SIZE);

  const sortedLogs = useMemo(
    () => [...logs].sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || ''))),
    [logs],
  );
  const logPageCount = Math.max(1, Math.ceil(sortedLogs.length / PAGE_SIZE));
  const pagedLogs = sortedLogs.slice((logPage - 1) * PAGE_SIZE, logPage * PAGE_SIZE);
  const dayTotal = logs
    .filter((l) => !date || String(l.created_at || '').slice(0, 10) === date)
    .reduce((s, l) => s + (Number(l.calories_burned) || 0), 0);

  useEffect(() => { setLibPage(1); }, [search]);
  useEffect(() => { if (libPage > libPageCount) setLibPage(libPageCount); }, [libPage, libPageCount]);
  useEffect(() => { if (logPage > logPageCount) setLogPage(logPageCount); }, [logPage, logPageCount]);

  const selected = items.find((x) => String(x.id) === String(selectedId));

  return (
    <div>
      <PageHeader
        title="Workouts"
        subtitle="Save exercises, then log sets and calories burned. Create items with custom fields."
        icon={Dumbbell}
        action={
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-400 hover:bg-brand-300 text-slate-950 text-sm font-bold"
          >
            <Plus size={16} /> My Exercise
          </button>
        }
      />

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="overflow-hidden p-0">
          <div className="p-5 pb-3">
            <h2 className="text-lg font-bold text-white mb-1">My exercises</h2>
            <p className="text-slate-400 text-sm mb-4">Select a row, then log it on the right.</p>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search exercises..."
                className="w-full pl-9 p-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm"
              />
            </div>
          </div>
          {filtered.length === 0 ? (
            <EmptyState title="No exercises yet" hint="Use My Exercise to add your first item." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[480px]">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 border-y border-slate-800">
                    <th className="px-4 py-2.5 font-semibold">Name</th>
                    <th className="px-3 py-2.5 font-semibold">Type</th>
                    <th className="px-3 py-2.5 font-semibold">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedItems.map((x) => {
                    const active = String(selectedId) === String(x.id);
                    return (
                      <tr
                        key={x.id}
                        onClick={() => setSelectedId(String(x.id))}
                        className={`border-b border-slate-800/70 cursor-pointer ${active ? 'bg-brand-900/20' : 'hover:bg-slate-900/50'}`}
                      >
                        <td className="px-4 py-3 font-bold text-white">{x.name}</td>
                        <td className="px-3 py-3 text-slate-400">{x.exercise_type}</td>
                        <td className="px-3 py-3 text-slate-500 text-xs">{x.description || '—'}</td>
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
          <h2 className="text-lg font-bold text-white mb-1">Log exercise</h2>
          <p className="text-slate-400 text-sm mb-4">
            Burned {date}: <b className="text-brand-400">{Math.round(dayTotal)} kcal</b>
            {selected && <span className="ml-2 text-slate-500">· {selected.name}</span>}
          </p>
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full p-2.5 rounded-lg bg-ink border border-slate-700 text-white text-sm" />
            <div className="grid grid-cols-2 gap-2">
              <input type="number" value={log.sets} onChange={(e) => setLog({ ...log, sets: Number(e.target.value) })} placeholder="Sets" className="p-2.5 rounded-lg bg-ink border border-slate-700 text-white text-sm" />
              <input type="number" value={log.reps} onChange={(e) => setLog({ ...log, reps: Number(e.target.value) })} placeholder="Reps" className="p-2.5 rounded-lg bg-ink border border-slate-700 text-white text-sm" />
              <input type="number" value={log.duration_minutes} onChange={(e) => setLog({ ...log, duration_minutes: Number(e.target.value) })} placeholder="Minutes" className="p-2.5 rounded-lg bg-ink border border-slate-700 text-white text-sm" />
              <input type="number" value={log.calories_burned} onChange={(e) => setLog({ ...log, calories_burned: Number(e.target.value) })} placeholder="kcal burned" className="p-2.5 rounded-lg bg-ink border border-slate-700 text-white text-sm" />
            </div>
            <button onClick={handleLog} disabled={!selectedId || saving} className="w-full py-2.5 rounded-xl bg-brand-400 hover:bg-brand-300 text-slate-950 text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2">
              <Plus size={16} /> {saving ? 'Logging...' : 'Add to Daily'}
            </button>
            {!selectedId && <p className="text-xs text-slate-500">Select an exercise in the list first.</p>}
          </div>
        </Card>
      </div>

      <Card className="mt-6 overflow-hidden p-0">
        <div className="p-5 pb-3">
          <h2 className="text-lg font-bold text-white">Exercise log</h2>
          <p className="text-slate-400 text-sm">All logged workouts, newest first.</p>
        </div>
        {sortedLogs.length === 0 ? (
          <EmptyState title="No logs yet" hint="Select an exercise and add it to daily." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 border-y border-slate-800">
                  <th className="px-4 py-2.5 font-semibold">Date</th>
                  <th className="px-3 py-2.5 font-semibold">Exercise</th>
                  <th className="px-3 py-2.5 font-semibold">Sets × reps</th>
                  <th className="px-3 py-2.5 font-semibold">Minutes</th>
                  <th className="px-3 py-2.5 font-semibold">kcal</th>
                </tr>
              </thead>
              <tbody>
                {pagedLogs.map((l) => (
                  <tr key={l.id} className="border-b border-slate-800/70">
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{formatDate(l.created_at)}</td>
                    <td className="px-3 py-3 text-white font-medium">{l.exercises?.name || l.exercise_name || nameById.get(String(l.exercise_id)) || '—'}</td>
                    <td className="px-3 py-3 text-slate-300">{l.sets}×{l.reps}</td>
                    <td className="px-3 py-3 text-slate-400">{l.duration_minutes}</td>
                    <td className="px-3 py-3 text-brand-400 font-semibold">{l.calories_burned}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <PaginationBar page={logPage} pageCount={logPageCount} total={sortedLogs.length} pageSize={PAGE_SIZE} onPage={setLogPage} />
          </div>
        )}
      </Card>

      <CustomFieldsModal
        open={createOpen}
        title="Create my exercise"
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreateExercise}
        submitting={creating}
        initialFields={customFields}
        baseFields={EXERCISE_BASE_FIELDS}
        submitLabel="Save exercise"
        suggestions={EXERCISE_CUSTOM_FIELD_SUGGESTIONS}
      />
    </div>
  );
}