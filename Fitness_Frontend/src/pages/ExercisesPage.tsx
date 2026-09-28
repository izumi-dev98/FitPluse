import { useEffect, useMemo, useState } from "react";
import { Dumbbell, Pencil, Plus, Search, Trash2 } from "lucide-react";
import Swal from "sweetalert2";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../lib/api";
import { useAuthStore } from "../store/auth";
import { qk, useDailyExercises, useExercises } from "../lib/queries";
import type { Exercise } from "../lib/database";
import { PageHeader, Card, PaginationBar, EmptyState } from "../components/ui";
import {
  CustomFieldsModal,
  EXERCISE_BASE_FIELDS,
} from "../components/CustomFieldsModal";

const PAGE_SIZE = 8;

function formatDate(value?: string) {
  return value ? String(value).slice(0, 10) : "—";
}

export default function ExercisesPage() {
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [libPage, setLibPage] = useState(1);
  const [logPage, setLogPage] = useState(1);
  const [editExercise, setEditExercise] = useState<Exercise | null>(null);

  // Custom fields modal state - start empty, user adds fields
  const [customFields] = useState<
    import("../components/CustomFieldsModal").CustomField[]
  >([]);

  const user = useAuthStore((s) => s.user);
  const uid = user?.id;
  const qc = useQueryClient();

  // Shared cached queries — same keys Daily uses, so the log modal stays fresh.
  const items = useExercises(uid).data ?? [];
  const logs = useDailyExercises(uid).data ?? [];

  async function handleCreateExercise(data: Record<string, unknown>) {
    if (!data.name || !uid) return;
    setCreating(true);
    try {
      await apiClient.createExercise({ user_id: uid, ...data });
      setCreateOpen(false);
      qc.invalidateQueries({ queryKey: qk.exercises(uid) });
      Swal.fire({
        icon: "success",
        title: "Exercise added",
        timer: 1400,
        showConfirmButton: false,
      });
    } catch {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Add exercise failed.",
        confirmButtonText: "OK",
        confirmButtonColor: "#65a30d",
      });
    }
    setCreating(false);
  }

  async function handleUpdateExercise(data: Record<string, unknown>) {
    if (!editExercise || !data.name) return;
    setCreating(true);
    try {
      await apiClient.updateExercise(editExercise.id, {
        user_id: uid,
        ...data,
      });
      setEditExercise(null);
      qc.invalidateQueries({ queryKey: qk.exercises(uid) });
      Swal.fire({
        icon: "success",
        title: "Exercise updated",
        timer: 1400,
        showConfirmButton: false,
      });
    } catch (err: unknown) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: (err instanceof Error ? err.message : null) || "Update failed.",
        confirmButtonText: "OK",
        confirmButtonColor: "#65a30d",
      });
    }
    setCreating(false);
  }

  async function handleDeleteExercise(item: Exercise) {
    const result = await Swal.fire({
      title: `Delete ${item.name}?`,
      text: "This cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      confirmButtonColor: "#dc2626",
    });
    if (!result.isConfirmed) return;
    try {
      await apiClient.deleteExercise(item.id);
      qc.invalidateQueries({ queryKey: qk.exercises(uid) });
    } catch (err: unknown) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: (err instanceof Error ? err.message : null) || "Delete failed.",
        confirmButtonText: "OK",
        confirmButtonColor: "#65a30d",
      });
    }
  }

  const filtered = useMemo(
    () =>
      items.filter((i) => i.name?.toLowerCase().includes(search.toLowerCase())),
    [items, search],
  );
  const libPageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pagedItems = filtered.slice(
    (libPage - 1) * PAGE_SIZE,
    libPage * PAGE_SIZE,
  );
  const sortedLogs = useMemo(
    () =>
      [...logs].sort((a, b) =>
        String(b.created_at || "").localeCompare(String(a.created_at || "")),
      ),
    [logs],
  );
  const logPageCount = Math.max(1, Math.ceil(sortedLogs.length / PAGE_SIZE));
  const pagedLogs = sortedLogs.slice(
    (logPage - 1) * PAGE_SIZE,
    logPage * PAGE_SIZE,
  );

  useEffect(() => {
    setLibPage(1);
  }, [search]);
  useEffect(() => {
    if (libPage > libPageCount) setLibPage(libPageCount);
  }, [libPage, libPageCount]);
  useEffect(() => {
    if (logPage > logPageCount) setLogPage(logPageCount);
  }, [logPage, logPageCount]);

  return (
    <div>
      <PageHeader
        title="Workouts"
        subtitle="Keep your personal exercise library. Create items with custom fields."
        icon={Dumbbell}
        action={
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-400 hover:bg-brand-300 text-ink text-sm font-bold"
          >
            <Plus size={16} /> My Exercise
          </button>
        }
      />

      <div>
        <Card className="overflow-hidden p-0">
          <div className="p-5 pb-3">
            <h2 className="text-lg font-bold text-white mb-1">My exercises</h2>
            <p className="text-slate-400 text-sm mb-4">
              Browse your saved exercises or add a new item.
            </p>
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search exercises..."
                className="w-full pl-9 p-3 rounded-xl bg-ink border border-panel-border text-white text-sm"
              />
            </div>
          </div>
          {filtered.length === 0 ? (
            <EmptyState
              title="No exercises yet"
              hint="Use My Exercise to add your first item."
            />
          ) : (
            <div className="overflow-x-auto pb-8 lg:pb-0">
              <table className="w-full text-sm min-w-[480px]">
                <thead>
                  <tr className="text-left text-[11px] text-slate-500 border-y border-panel-border">
                    <th className="px-4 py-2.5 font-semibold">Name</th>
                    <th className="px-3 py-2.5 font-semibold">Type</th>
                    <th className="px-3 py-2.5 font-semibold">Description</th>
                    <th className="px-3 py-2.5 font-semibold text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pagedItems.map((x) => {
                    return (
                      <tr
                        key={x.id}
                        className="border-b border-panel-border hover:bg-white/[0.03]"
                      >
                        <td className="px-4 py-3 font-bold text-white">
                          {x.name}
                        </td>
                        <td className="px-3 py-3 text-slate-400">
                          {x.exercise_type}
                        </td>
                        <td className="px-3 py-3 text-slate-500 text-xs">
                          {x.description || "—"}
                        </td>
                        <td className="px-3 py-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setEditExercise(x)}
                            className="p-1.5 text-slate-400 hover:text-brand-400"
                            aria-label="Edit exercise"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteExercise(x)}
                            className="p-1.5 text-slate-400 hover:text-red-400"
                            aria-label="Delete exercise"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <PaginationBar
                page={libPage}
                pageCount={libPageCount}
                total={filtered.length}
                pageSize={PAGE_SIZE}
                onPage={setLibPage}
              />
            </div>
          )}
        </Card>
      </div>

      <Card className="mt-6 overflow-hidden p-0">
        <div className="p-5 pb-3">
          <h2 className="text-lg font-bold text-white">Exercise log</h2>
          <p className="text-slate-400 text-sm">
            Logged workouts, newest first.
          </p>
        </div>
        {sortedLogs.length === 0 ? (
          <EmptyState
            title="No exercise logs yet"
            hint="Log workouts from the Daily page."
          />
        ) : (
          <div className="overflow-x-auto pb-8 lg:pb-0">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-left text-[11px] text-slate-500 border-y border-panel-border">
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-3 py-2.5">Exercise</th>
                  <th className="px-3 py-2.5">Sets × reps</th>
                  <th className="px-3 py-2.5">Minutes</th>
                  <th className="px-3 py-2.5">kcal</th>
                </tr>
              </thead>
              <tbody>
                {pagedLogs.map((log) => (
                  <tr key={log.id} className="border-b border-panel-border">
                    <td className="px-4 py-3 text-slate-400">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="px-3 py-3 text-white">
                      {log.exercises?.name ||
                        log.exercise_name ||
                        items.find(
                          (item) => String(item.id) === String(log.exercise_id),
                        )?.name ||
                        "—"}
                    </td>
                    <td className="px-3 py-3 text-slate-300">
                      {log.sets}×{log.reps}
                    </td>
                    <td className="px-3 py-3 text-slate-400">
                      {log.duration_minutes}
                    </td>
                    <td className="px-3 py-3 text-brand-400 font-semibold">
                      {log.calories_burned}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <PaginationBar
              page={logPage}
              pageCount={logPageCount}
              total={sortedLogs.length}
              pageSize={PAGE_SIZE}
              onPage={setLogPage}
            />
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
        allowCustomFields={false}
      />
      {editExercise && (
        <CustomFieldsModal
          open={Boolean(editExercise)}
          title="Edit exercise"
          onClose={() => setEditExercise(null)}
          onSubmit={handleUpdateExercise}
          submitting={creating}
          initialFields={[]}
          baseFields={EXERCISE_BASE_FIELDS.map((field) => ({
            ...field,
            value: String(
              (editExercise as unknown as Record<string, unknown>)[field.id] ??
                field.value ??
                "",
            ),
          }))}
          submitLabel="Update exercise"
          allowCustomFields={false}
        />
      )}
    </div>
  );
}
