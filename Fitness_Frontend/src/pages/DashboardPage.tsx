import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Droplets,
  Dumbbell,
  Flame,
  Footprints,
  Target,
  Trophy,
  Utensils,
  Scale,
} from "lucide-react";
import { useAuthStore } from "../store/auth";
import { Card, MacroRow, Ring } from "../components/ui";
import { fmtInt } from "../lib/format";
import {
  useDailyExercises,
  useDailyFoods,
  useDailyRecords,
  useGoals,
  useWaterIntake,
  useWeightHistory,
} from "../lib/queries";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const uid = user?.id;

  // Shared cached queries — switching back to this route within staleTime
  // renders instantly with no refetch.
  const goalsQ = useGoals(uid);
  const recordsQ = useDailyRecords(uid);
  const foodsQ = useDailyFoods(uid);
  const exercisesQ = useDailyExercises(uid);
  const waterQ = useWaterIntake(uid);
  const weightsQ = useWeightHistory(uid);

  const loading =
    goalsQ.isLoading ||
    recordsQ.isLoading ||
    foodsQ.isLoading ||
    exercisesQ.isLoading ||
    waterQ.isLoading ||
    weightsQ.isLoading;

  const {
    steps,
    goalCalories,
    proteinTarget,
    fatTarget,
    carbTarget,
    goalType,
    consumed,
    burned,
    protein,
    fat,
    carbs,
    water,
    streak,
    latestWeight,
  } = useMemo(() => {
    const today = todayStr();
    const recs = recordsQ.data ?? [];
    const todayRec = recs.find((r: any) => r.record_date === today);

    const gList = goalsQ.data ?? [];
    const active = gList.find((g: any) => g.status === "active");

    const foodList = foodsQ.data ?? [];
    const todayFoods = foodList.filter((f: any) => {
      const d = f.record_date || String(f.created_at || "").slice(0, 10);
      return d === today || (todayRec && f.daily_record_id === todayRec.id);
    });

    const exList = exercisesQ.data ?? [];
    const todayEx = exList.filter((e: any) => {
      const d = e.record_date || String(e.created_at || "").slice(0, 10);
      return d === today || (todayRec && e.daily_record_id === todayRec.id);
    });

    const wList = waterQ.data ?? [];
    const todayWater = wList.filter(
      (w: any) =>
        String(w.recorded_at || w.created_at || "").slice(0, 10) === today,
    );
    const waterSum = todayWater.reduce(
      (s: number, w: any) => s + (Number(w.amount_ml) || 0),
      0,
    );

    const dates = new Set(recs.map((r: any) => r.record_date).filter(Boolean));
    let s = 0;
    const d = new Date();
    for (let i = 0; i < 30; i++) {
      const key = d.toISOString().slice(0, 10);
      if (dates.has(key)) {
        s++;
        d.setDate(d.getDate() - 1);
      } else break;
    }

    const wHist = weightsQ.data ?? [];
    const latest = wHist.length
      ? [...wHist].sort(
          (a: any, b: any) =>
            new Date(b.recorded_at).getTime() -
            new Date(a.recorded_at).getTime(),
        )[0]
      : null;

    return {
      steps: Number(todayRec?.steps) || 0,
      goalCalories: active
        ? Number(active.target_calories ?? active.target_value) || null
        : null,
      proteinTarget: active ? Number(active.protein_target) || 0 : 0,
      fatTarget: active ? Number(active.fat_target) || 0 : 0,
      carbTarget: active ? Number(active.carb_target) || 0 : 0,
      goalType: active
        ? String(active.goal_type || "").replace(/_/g, " ")
        : null,
      consumed: todayFoods.reduce(
        (sum: number, f: any) => sum + (Number(f.calories) || 0),
        0,
      ),
      burned: todayEx.reduce(
        (sum: number, e: any) => sum + (Number(e.calories_burned) || 0),
        0,
      ),
      protein: todayFoods.reduce(
        (sum: number, f: any) => sum + (Number(f.protein) || 0),
        0,
      ),
      fat: todayFoods.reduce(
        (sum: number, f: any) => sum + (Number(f.fat) || 0),
        0,
      ),
      carbs: todayFoods.reduce(
        (sum: number, f: any) => sum + (Number(f.carbohydrates) || 0),
        0,
      ),
      water: waterSum || Number(todayRec?.water_ml) || 0,
      streak: s,
      latestWeight: latest ? Number(latest.weight) || null : null,
    };
  }, [
    recordsQ.data,
    goalsQ.data,
    foodsQ.data,
    exercisesQ.data,
    waterQ.data,
    weightsQ.data,
  ]);

  const remaining = goalCalories != null ? goalCalories - consumed : null;
  const pct = goalCalories ? Math.round((consumed / goalCalories) * 100) : 0;
  const name = user?.name || user?.email?.split("@")[0] || "there";
  const WATER_GOAL = 2500;
  const STEPS_GOAL = 8000;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
        <div>
          <p className="text-brand-400 text-sm font-semibold">{greeting()}</p>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            {name}
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
            {goalType && (
              <>
                {" "}
                · <span className="capitalize text-slate-300">{goalType}</span>
              </>
            )}
          </p>
        </div>
        <button
          onClick={() => navigate("/daily")}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand-400 hover:bg-brand-300 text-slate-950 font-bold shadow-lg shadow-brand-400/20"
        >
          Log today <ArrowRight size={16} />
        </button>
      </div>

      {loading ? (
        <Card className="text-center py-12 text-slate-400">
          Loading your day…
        </Card>
      ) : (
        <>
          <div className="grid lg:grid-cols-3 gap-4 mb-4">
            <Card className="lg:col-span-2 flex flex-col sm:flex-row items-center gap-6">
              <Ring percent={pct}>
                <div className="text-3xl font-extrabold text-white">
                  {fmtInt(consumed)}
                </div>
                <div className="text-[11px] text-slate-400">eaten kcal</div>
              </Ring>
              <div className="flex-1 w-full space-y-3">
                <div className="flex justify-between items-baseline">
                  <h2 className="text-lg font-bold text-white">Calories</h2>
                  <span className="text-sm text-slate-400">
                    {pct}% of target
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-3">
                    <div className="text-xs text-slate-500">Target</div>
                    <div className="font-bold text-white">
                      {fmtInt(goalCalories) ?? "—"}
                    </div>
                  </div>
                  <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-3">
                    <div className="text-xs text-slate-500">Left</div>
                    <div
                      className={`font-bold ${remaining != null && remaining < 0 ? "text-amber-400" : "text-brand-400"}`}
                    >
                      {remaining == null ? "—" : fmtInt(remaining)}
                    </div>
                  </div>
                  <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-3">
                    <div className="text-xs text-slate-500">Burned</div>
                    <div className="font-bold text-white">{fmtInt(burned)}</div>
                  </div>
                </div>
                {!goalCalories && (
                  <button
                    onClick={() => navigate("/goals")}
                    className="text-sm text-brand-400 font-semibold"
                  >
                    Set a calorie goal →
                  </button>
                )}
              </div>
            </Card>

            <Card>
              <h2 className="text-lg font-bold text-white mb-4">Macros</h2>
              <div className="space-y-4">
                <MacroRow
                  label="Protein"
                  current={protein}
                  target={proteinTarget}
                  color="text-protein"
                  bar="bg-protein"
                />
                <MacroRow
                  label="Carbs"
                  current={carbs}
                  target={carbTarget}
                  color="text-carbs"
                  bar="bg-carbs"
                />
                <MacroRow
                  label="Fat"
                  current={fat}
                  target={fatTarget}
                  color="text-fat"
                  bar="bg-fat"
                />
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <Card>
              <div className="flex items-center gap-2 text-water text-xs font-semibold mb-2">
                <Droplets size={16} /> Water
              </div>
              <div className="text-2xl font-extrabold text-white">
                {fmtInt(water)}
                <span className="text-sm font-medium text-slate-500"> ml</span>
              </div>
              <div className="mt-2 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-water rounded-full"
                  style={{
                    width: `${Math.min(100, Math.round((water / WATER_GOAL) * 100))}%`,
                  }}
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Goal {WATER_GOAL} ml
              </p>
            </Card>
            <Card>
              <div className="flex items-center gap-2 text-brand-400 text-xs font-semibold mb-2">
                <Footprints size={16} /> Steps
              </div>
              <div className="text-2xl font-extrabold text-white">
                {steps.toLocaleString()}
              </div>
              <div className="mt-2 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-500 rounded-full"
                  style={{
                    width: `${Math.min(100, Math.round((steps / STEPS_GOAL) * 100))}%`,
                  }}
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Goal {STEPS_GOAL.toLocaleString()}
              </p>
            </Card>
            <Card>
              <div className="flex items-center gap-2 text-orange-400 text-xs font-semibold mb-2">
                <Flame size={16} /> Streak
              </div>
              <div className="text-2xl font-extrabold text-white">
                {streak}{" "}
                <span className="text-sm font-medium text-slate-500">days</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Days logged in a row
              </p>
            </Card>
            <Card>
              <div className="flex items-center gap-2 text-slate-300 text-xs font-semibold mb-2">
                <Scale size={16} /> Weight
              </div>
              <div className="text-2xl font-extrabold text-white">
                {latestWeight ?? "—"}
                {latestWeight != null && (
                  <span className="text-sm font-medium text-slate-500">
                    {" "}
                    kg
                  </span>
                )}
              </div>
              <button
                onClick={() => navigate("/progress")}
                className="text-[11px] text-brand-400 font-semibold mt-2"
              >
                Update →
              </button>
            </Card>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                icon: Utensils,
                label: "Log food",
                desc: "Meals & macros",
                href: "/daily",
                color: "text-slate-400",
              },
              {
                icon: Dumbbell,
                label: "Log workout",
                desc: "Sets, reps, burn",
                href: "/daily",
                color: "text-brand-400",
              },
              {
                icon: Target,
                label: "Goals",
                desc: "Calories & macros",
                href: "/goals",
                color: "text-slate-400",
              },
              {
                icon: Trophy,
                label: "Badges",
                desc: "Achievements",
                href: "/badges",
                color: "text-slate-400",
              },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => navigate(item.href)}
                className="text-left bg-panel/80 border border-slate-800/80 rounded-2xl p-4 hover:border-brand-600/40 transition group"
              >
                <item.icon size={20} className={`${item.color} mb-2`} />
                <div className="font-bold text-white group-hover:text-brand-400">
                  {item.label}
                </div>
                <div className="text-xs text-slate-500">{item.desc}</div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
