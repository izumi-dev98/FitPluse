import { useState, useRef, useMemo } from "react";
import {
  CalendarDays,
  Plus,
  X,
  Utensils,
  Dumbbell,
  Image as ImageIcon,
  Target,
  Droplets,
  Footprints,
} from "lucide-react";
import Swal from "sweetalert2";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../lib/api";
import { useAuthStore } from "../store/auth";
import { Card, EmptyState, MacroRow, PageHeader, Ring } from "../components/ui";
import QuickLogModal, { type QuickLogTab } from "../components/QuickLogModal";
import { fmtInt } from "../lib/format";
import type { GoalType } from "../lib/theory";
import {
  ensureTodayRecord,
  useBodyImages,
  useBurnTarget,
  useDailyExercises,
  useDailyFoods,
  useDailyRecords,
  useExercises,
  useFoods,
  useGoals,
  useInvalidateDaily,
  useWaterIntake,
} from "../lib/queries";



const MEALS = ["Breakfast", "Lunch", "Dinner", "Snack"] as const;
const WATER_GOAL = 2500;
const STEPS_GOAL = 8000;

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function DailyPage() {
  const [quickLogOpen, setQuickLogOpen] = useState(false);
  const [quickLogTab, setQuickLogTab] = useState<QuickLogTab>("food");
  const [photoOpen, setPhotoOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageType, setImageType] = useState<"front" | "side" | "back">(
    "front",
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [stepInput, setStepInput] = useState("");

  const user = useAuthStore((s) => s.user);
  const uid = user?.id;
  const qc = useQueryClient();
  const invalidateDaily = useInvalidateDaily();

  // Shared cached queries (same keys as Dashboard) — revisits render instantly.
  const goalsQ = useGoals(uid);
  const recordsQ = useDailyRecords(uid);
  const bodyImagesQ = useBodyImages(uid);
  const waterQ = useWaterIntake(uid);
  const dailyExercisesQ = useDailyExercises(uid);
  const burnTargetQ = useBurnTarget(uid);
  // User's own catalogs (shared cache with Foods/Workout pages) — the
  // backend returns raw log rows, so names resolve client-side.
  const foodsCatalogQ = useFoods(uid);
  const exercisesCatalogQ = useExercises(uid);

  const goals = goalsQ.data ?? [];
  const records = recordsQ.data ?? [];
  const bodyImages = bodyImagesQ.data ?? [];
  const waters = waterQ.data ?? [];
  const allLoggedExercises = dailyExercisesQ.data ?? [];

  const burnTarget = burnTargetQ.data;
  const foodNames = useMemo(
    () => new Map((foodsCatalogQ.data ?? []).map((f) => [String(f.id), f.name])),
    [foodsCatalogQ.data],
  );
  const exerciseNames = useMemo(
    () => new Map((exercisesCatalogQ.data ?? []).map((e) => [String(e.id), e.name])),
    [exercisesCatalogQ.data],
  );

  const today = todayStr();
  const rec = records.find((r) => r.record_date === today);
  const dailyFoodsQ = useDailyFoods(uid, rec?.id);
  const loggedFoods = dailyFoodsQ.data ?? [];

  const active = goals.find((g) => g.status === "active");
  const goalCalories = active
    ? Number(active.target_calories ?? active.target_value) || null
    : null;
  const proteinTarget = active ? Number(active.protein_target) || 0 : 0;
  const fatTarget = active ? Number(active.fat_target) || 0 : 0;
  const carbTarget = active ? Number(active.carb_target) || 0 : 0;

  const loggedExercises = rec?.id
    ? allLoggedExercises.filter((e) => e.daily_record_id === rec.id)
    : [];
  const steps = Number(rec?.steps) || 0;
  const todayWater = waters.filter(
    (w) =>
      String(w.recorded_at || w.created_at || "").slice(0, 10) === today,
  );
  const water =
    todayWater.reduce(
      (s: number, w) => s + (Number(w.amount_ml) || 0),
      0,
    ) ||
    Number(rec?.water_ml) ||
    0;

  async function persistRecord(patch: {
    water_ml?: number;
    steps?: number;
    calories_consumed?: number;
    calories_burned?: number;
  }) {
    if (!uid) return;
    const todayRec = await ensureTodayRecord(qc, uid);
    await apiClient.createDailyRecord({
      user_id: uid,
      record_date: todayStr(),
      calories_consumed:
        patch.calories_consumed ?? todayRec?.calories_consumed ?? 0,
      calories_burned: patch.calories_burned ?? todayRec?.calories_burned ?? 0,
      water_ml: patch.water_ml ?? todayRec?.water_ml ?? 0,
      steps: patch.steps ?? todayRec?.steps ?? 0,
    });
    invalidateDaily(uid);
  }

  async function handleUploadImage() {
    if (!imageFile || !uid) return;
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("Could not read image"));
        reader.readAsDataURL(imageFile);
      });
      if (!apiClient.createBodyProgressImage)
        throw new Error("Image upload is unavailable");
      await apiClient.createBodyProgressImage({
        user_id: uid,
        image_url: base64,
        image_type: imageType,
      });
      setImageFile(null);
      setImagePreview(null);
      setPhotoOpen(false);
      invalidateDaily(uid);
      Swal.fire({
        icon: "success",
        title: "Photo saved",
        text: "Your progress image was added.",
        timer: 1400,
        showConfirmButton: false,
      });
    } catch {
      Swal.fire({
        icon: "error",
        title: "Could not save photo",
        text: "Please try again.",
        confirmButtonColor: "#65a30d",
      });
    }
  }

  async function addWater(ml: number) {
    if (!uid) return;
    try {
      await apiClient.createWaterIntake({ user_id: uid, amount_ml: ml });
      await persistRecord({ water_ml: water + ml });
      invalidateDaily(uid);
      Swal.fire({
        icon: "success",
        title: "Water added",
        text: `${ml} ml added to today.`,
        timer: 1200,
        showConfirmButton: false,
      });
    } catch {
      Swal.fire({
        icon: "error",
        title: "Could not log water",
        confirmButtonColor: "#65a30d",
      });
    }
  }

  async function saveSteps() {
    if (!uid) return;
    const n = Number(stepInput);
    if (!n && n !== 0) return;
    try {
      await persistRecord({ steps: n });
      setStepInput("");
      invalidateDaily(uid);
      Swal.fire({
        icon: "success",
        title: "Steps saved",
        text: `${n.toLocaleString()} steps saved for today.`,
        timer: 1200,
        showConfirmButton: false,
      });
    } catch {
      Swal.fire({
        icon: "error",
        title: "Could not save steps",
        confirmButtonColor: "#65a30d",
      });
    }
  }

  function openQuickLog(tab: QuickLogTab) {
    setQuickLogTab(tab);
    setQuickLogOpen(true);
  }

  const todayFoodCal = loggedFoods.reduce(
    (s: number, f) => s + (Number(f.calories) || 0),
    0,
  );
  const todayProtein = loggedFoods.reduce(
    (s: number, f) => s + (Number(f.protein) || 0),
    0,
  );
  const todayFat = loggedFoods.reduce(
    (s: number, f) => s + (Number(f.fat) || 0),
    0,
  );
  const todayCarbs = loggedFoods.reduce(
    (s: number, f) => s + (Number(f.carbohydrates) || 0),
    0,
  );
  const todayExBurned = loggedExercises.reduce(
    (s: number, e) => s + (Number(e.calories_burned) || 0),
    0,
  );
  const remaining = goalCalories != null ? goalCalories - todayFoodCal : null;
  const pct = goalCalories
    ? Math.round((todayFoodCal / goalCalories) * 100)
    : 0;

  return (
    <div>
      <PageHeader
        title="Today's log"
        subtitle="Track food, workouts, water, and steps in one place."
        icon={CalendarDays}
        action={
          <button
            onClick={() => openQuickLog("food")}
            className="px-5 py-2.5 rounded-xl bg-brand-400 hover:bg-brand-300 text-ink font-bold shadow-lg shadow-brand-400/20 flex items-center gap-2"
          >
            <Plus size={18} /> Add log
          </button>
        }
      />

      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        <Card className="lg:col-span-2 flex flex-col sm:flex-row items-center gap-6">
          <Ring percent={pct}>
            <div className="text-3xl font-extrabold text-white">
              {fmtInt(todayFoodCal)}
            </div>
            <div className="text-[11px] text-slate-400">kcal eaten</div>
          </Ring>
          <div className="flex-1 w-full">
            <div className="grid grid-cols-3 gap-2 text-center mb-4">
              <div className="rounded-xl border border-panel-border bg-ink/60 p-3">
                <div className="text-[11px] text-slate-500">Target</div>
                <div className="font-bold text-white">
                  {fmtInt(goalCalories) ?? "—"}
                </div>
              </div>
              <div className="rounded-xl border border-panel-border bg-ink/60 p-3">
                <div className="text-[11px] text-slate-500">Left</div>
                <div
                  className={`font-bold ${remaining != null && remaining < 0 ? "text-amber-400" : "text-brand-400"}`}
                >
                  {remaining == null ? "—" : fmtInt(remaining)}
                </div>
              </div>
              <div className="rounded-xl border border-panel-border bg-ink/60 p-3">
                <div className="text-[11px] text-slate-500">Burned</div>
                <div className="font-bold text-white">
                  {fmtInt(todayExBurned)}
                </div>
                {burnTarget && (
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {burnTarget.offset !== 0 && (
                      <span>
                        {burnTarget.offset > 0 ? '+' : ''}
                        {fmtInt(burnTarget.offset)} kcal ·{' '}
                        {String(burnTarget.goalType).replace(/_/g, ' ')}
                      </span>
                    )}
                    {burnTarget.offset === 0 && 'Maintain goal'}
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-3">
              <MacroRow
                label="Protein"
                current={todayProtein}
                target={proteinTarget}
                color="text-protein"
                bar="bg-protein"
              />
              <MacroRow
                label="Carbs"
                current={todayCarbs}
                target={carbTarget}
                color="text-carbs"
                bar="bg-carbs"
              />
              <MacroRow
                label="Fat"
                current={todayFat}
                target={fatTarget}
                color="text-fat"
                bar="bg-fat"
              />
            </div>
            {!goalCalories && (
              <a
                href="/goals"
                className="inline-flex items-center gap-1 text-sm text-brand-400 font-semibold mt-3"
              >
                <Target size={14} /> Set a goal to see remaining calories
              </a>
            )}
          </div>
        </Card>

        <div className="space-y-3">
          <Card>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <Droplets size={16} className="text-slate-400" /> Water
              </span>
              <span className="text-xs text-slate-500">
                {fmtInt(water)} / {fmtInt(WATER_GOAL)} ml
              </span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-3">
              <div
                className="h-full bg-water rounded-full"
                style={{
                  width: `${Math.min(100, Math.round((water / WATER_GOAL) * 100))}%`,
                }}
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[250, 500, 750].map((ml) => (
                <button
                  key={ml}
                  onClick={() => addWater(ml)}
                  className="py-2 rounded-lg border border-panel-border bg-ink text-xs font-bold text-slate-300 hover:text-white"
                >
                  +{ml}
                </button>
              ))}
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <Footprints size={16} className="text-brand-400" /> Steps
              </span>
              <span className="text-xs text-slate-500">
                {steps.toLocaleString()} / {STEPS_GOAL.toLocaleString()}
              </span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-3">
              <div
                className="h-full bg-brand-500 rounded-full"
                style={{
                  width: `${Math.min(100, Math.round((steps / STEPS_GOAL) * 100))}%`,
                }}
              />
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                min={0}
                placeholder="Steps today"
                value={stepInput}
                onChange={(e) => setStepInput(e.target.value)}
                className="flex-1 p-2 rounded-lg bg-ink border border-slate-700 text-white text-sm"
              />
              <button
                onClick={saveSteps}
                className="px-3 rounded-lg bg-brand-400 hover:bg-brand-300 text-ink text-sm font-bold"
              >
                Save
              </button>
            </div>
          </Card>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white flex items-center gap-2">
              <Utensils size={18} className="text-slate-400" /> Meals
            </h3>
            <button
              onClick={() => openQuickLog("food")}
              className="text-xs font-bold text-brand-400"
            >
              + Food
            </button>
          </div>
          {loggedFoods.length === 0 ? (
            <EmptyState
              title="No food yet"
              hint="Log breakfast, lunch, dinner, or a snack."
              action={
                <button
                  onClick={() => openQuickLog("food")}
                  className="px-4 py-2 rounded-xl bg-brand-400 text-ink text-sm font-bold"
                >
                  Log food
                </button>
              }
            />
          ) : (
            <div className="space-y-4">
              {MEALS.map((meal) => {
                const items = loggedFoods.filter((f) => f.meal_type === meal);
                if (!items.length) return null;
                const kcal = items.reduce(
                  (s, f) => s + (Number(f.calories) || 0),
                  0,
                );
                return (
                  <div key={meal}>
                    <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                      <span>{meal}</span>
                      <span>{fmtInt(kcal)} kcal</span>
                    </div>
                    <div className="space-y-1.5">
                      {items.map((f) => (
                        <div
                          key={f.id}
                          className="flex items-center justify-between border border-panel-border bg-ink/60 rounded-lg px-3 py-2"
                        >
                          <div>
                            <span className="text-white text-sm font-medium">
                              {foodNames.get(String(f.food_id)) || f.name || "Food"}
                            </span>
                            <span className="text-slate-500 ml-2 text-xs">
                              ×{f.quantity}
                            </span>
                          </div>
                          <div className="text-brand-400 text-sm font-bold">
                            {fmtInt(f.calories)} kcal
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white flex items-center gap-2">
              <Dumbbell size={18} className="text-brand-400" /> Workouts
            </h3>
            <button
              onClick={() => openQuickLog("workout")}
              className="text-xs font-bold text-brand-400"
            >
              + Exercise
            </button>
          </div>
          {loggedExercises.length === 0 ? (
            <EmptyState
              title="No workout yet"
              hint="Log sets, reps, or cardio minutes."
              action={
                <button
                  onClick={() => openQuickLog("workout")}
                  className="px-4 py-2 rounded-xl bg-brand-400 text-ink text-sm font-bold"
                >
                  Log workout
                </button>
              }
            />
          ) : (
            <div className="space-y-1.5">
              {loggedExercises.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between border border-panel-border bg-ink/60 rounded-lg px-3 py-2"
                >
                  <div>
                    <span className="text-white text-sm font-medium">
                      {exerciseNames.get(String(e.exercise_id)) || e.name || "Workout"}
                    </span>
                    <span className="text-slate-500 ml-2 text-xs">
                      {e.sets}×{e.reps} · {e.duration_minutes} min
                    </span>
                  </div>
                  <div className="text-white text-sm font-bold">
                    {fmtInt(e.calories_burned)} kcal
                  </div>
                </div>
              ))}
              <div className="pt-2 text-sm flex justify-between text-slate-400">
                <span>Total burned</span>
                <span className="text-white font-bold">
                  {fmtInt(todayExBurned)} kcal
                </span>
              </div>
            </div>
          )}
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-white flex items-center gap-2">
            <ImageIcon size={18} className="text-slate-400" /> Body photos
          </h3>
          <button
            onClick={() => setPhotoOpen(true)}
            className="text-xs font-bold text-brand-400"
          >
            + Photo
          </button>
        </div>
        {bodyImages.length === 0 ? (
          <p className="text-slate-500 text-sm">
            Add front, side, or back photos to see visual progress.
          </p>
        ) : (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {bodyImages.map((img, i: number) => (
              <div
                key={img.id ?? i}
                className="rounded-xl overflow-hidden border border-panel-border bg-panel-card"
              >
                {img.image_url?.startsWith("data:") ||
                img.image_url?.startsWith("http") ? (
                  <img
                    src={img.image_url}
                    alt={img.image_type ?? undefined}
                    className="w-full h-28 object-cover"
                  />
                ) : (
                  <div className="h-28 bg-white/5 flex items-center justify-center">
                    <ImageIcon size={20} className="text-slate-600" />
                  </div>
                )}
                <div className="p-1.5 text-center text-[11px] text-slate-400 capitalize">
                  {img.image_type}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <QuickLogModal
        open={quickLogOpen}
        onClose={() => setQuickLogOpen(false)}
        initialTab={quickLogTab}
        goalType={(burnTarget?.goalType as GoalType) ?? (active?.goal_type as GoalType) ?? undefined}
      />

      {photoOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setPhotoOpen(false)}
        >
          <div
            className="border border-panel-border bg-panel-card rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-panel-border sticky top-0 bg-panel-card rounded-t-3xl z-10">
              <h3 className="text-lg font-bold text-white">Add body photo</h3>
              <button
                onClick={() => setPhotoOpen(false)}
                className="text-slate-400 hover:text-white"
                aria-label="Close"
              >
                <X size={22} />
              </button>
            </div>
            <div className="p-5">
              <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2 rounded-xl border border-panel-border bg-ink p-1">
                    {(['front', 'side', 'back'] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setImageType(t)}
                        className={`rounded-lg px-3 py-1.5 text-sm font-semibold capitalize ${imageType === t ? 'bg-brand-400 text-ink' : 'text-slate-400 hover:text-white'}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setImageFile(e.target.files[0]);
                      setImagePreview(URL.createObjectURL(e.target.files[0]));
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-3 rounded-xl border border-panel-border text-slate-300 font-bold transition hover:bg-white/5 hover:text-white"
                >
                  {imagePreview ? "Change image" : "Choose image"}
                </button>
                {imagePreview && (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded-xl"
                  />
                )}
                {imageFile && (
                  <button
                    onClick={handleUploadImage}
                    className="w-full py-2.5 rounded-xl bg-brand-400 text-ink font-bold"
                  >
                    Upload photo
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
