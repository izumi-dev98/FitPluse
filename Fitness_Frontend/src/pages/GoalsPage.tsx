import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Target, X, Calculator, ArrowRight, Trash2, RotateCcw, Flag, Sparkles, CalendarDays, Droplets, Footprints, Flame, Utensils, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { PageHeader, EmptyState } from '../components/ui';
import DailyRecordModal from '../components/DailyRecordModal';
import Swal from 'sweetalert2';
import { apiClient } from '../lib/api';
import { useAuthStore } from '../store/auth';
import { calcBMR, calcTDEE, calcTarget, calcMacros, GOAL_GUIDANCE, GOAL_LABELS, recommendGoal, type GoalType } from '../lib/theory';
import {
  enrichDailyRecords, formatDay, todayKey, verdictClass, type DailyRow,
} from '../lib/dailyHistory';

const PAGE_SIZE = 7;

type HistoryTab = 'goals' | 'daily';
type RangeKey = 7 | 14 | 30 | 0;

type CalcInputs = {
  goal_type: GoalType;
  gender: string;
  weight_kg: number;
  height_cm: number;
  age: number;
  activity_level: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extremely_active';
};

function RecommendationList({ title, items, compact = false }: { title: string; items: string[]; compact?: boolean }) {
  return (
    <div className={`rounded-xl bg-slate-950/40 border border-white/10 ${compact ? 'p-3' : 'p-4'}`}>
      <div className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">{title}</div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item} className="text-xs text-slate-300 leading-relaxed pl-3 border-l-2 border-brand-500/50">{item}</li>
        ))}
      </ul>
    </div>
  );
}

export default function GoalsPage() {
  const { user } = useAuthStore();
  const [goals, setGoals] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeGoal, setActiveGoal] = useState<any>(null);
  const [historyTab, setHistoryTab] = useState<HistoryTab>('daily');
  const [range, setRange] = useState<RangeKey>(14);
  const [page, setPage] = useState(1);
  const [selectedRow, setSelectedRow] = useState<DailyRow | null>(null);
  const [form, setForm] = useState<CalcInputs>({
    goal_type: 'muscle_gain',
    gender: user?.gender || 'male',
    weight_kg: user?.weight_kg || 70,
    height_cm: user?.height_cm || 175,
    age: user?.age || 30,
    activity_level: user?.activity_level || 'moderately_active',
  });

  const bmr = Math.round(calcBMR(form.gender, Number(form.weight_kg) || 0, Number(form.height_cm) || 0, Number(form.age) || 0));
  const tdee = Math.round(calcTDEE(bmr, form.activity_level));
  const target = Math.round(calcTarget(tdee, form.goal_type));
  const macros = calcMacros(target, Number(form.weight_kg) || 0);
  const recommendedGoal = recommendGoal(Number(form.weight_kg) || 0, Number(form.height_cm) || 0);
  const guidance = GOAL_GUIDANCE[form.goal_type];

  async function loadGoals(uid: string) {
    try {
      const [data, recs] = await Promise.all([
        apiClient.getGoals(uid),
        apiClient.getDailyRecords(uid).catch(() => []),
      ]);
      const allGoals = Array.isArray(data) ? data : [];
      setGoals(allGoals);
      setRecords(Array.isArray(recs) ? recs : []);
      const active = allGoals.find((g: any) => g.status === 'active');
      setActiveGoal(active || null);
    } catch { 
      setGoals([]);
      setRecords([]);
      setActiveGoal(null);
    } finally {
      setLoading(false);
    }
  }

  const dailyRows = useMemo(() => {
    const cutoff = range
      ? new Date(Date.now() - range * 86400000).toISOString().slice(0, 10)
      : '';
    return enrichDailyRecords(records, goals).filter((r) => !cutoff || r.date >= cutoff);
  }, [records, goals, range]);

  const pageCount = Math.max(1, Math.ceil(dailyRows.length / PAGE_SIZE));
  const pagedRows = dailyRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [range, historyTab]);
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const dailyStats = useMemo(() => {
    if (!dailyRows.length) {
      return { days: 0, avgIn: 0, avgBurn: 0, hitRate: 0, streak: 0 };
    }
    const days = dailyRows.length;
    const avgIn = Math.round(dailyRows.reduce((s, r) => s + r.consumed, 0) / days);
    const avgBurn = Math.round(dailyRows.reduce((s, r) => s + r.burned, 0) / days);
    const scored = dailyRows.filter((r) => r.target > 0);
    const hits = scored.filter((r) => r.verdict.tone === 'green').length;
    const hitRate = scored.length ? Math.round((hits / scored.length) * 100) : 0;

    const byDate = new Map(dailyRows.map((r) => [r.date, r]));
    let streak = 0;
    const cursor = new Date();
    for (let i = 0; i < 60; i++) {
      const key = cursor.toISOString().slice(0, 10);
      const row = byDate.get(key);
      if (!row || (row.consumed <= 0 && row.burned <= 0 && row.water <= 0 && row.steps <= 0)) break;
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return { days, avgIn, avgBurn, hitRate, streak };
  }, [dailyRows]);

  useEffect(() => {
    if (user?.id) loadGoals(user.id);
  }, [user?.id]);

  // Auto-open modal for new users with no goals
  useEffect(() => {
    if (!loading && !activeGoal && goals.length === 0 && user?.id) {
      setShowModal(true);
    }
  }, [loading, activeGoal, goals.length, user?.id]);

  async function handleSave() {
    if (!user?.id) return;
    setSaving(true);
    try {
      if (activeGoal) {
        const confirmation = await Swal.fire({
          icon: 'question',
          title: 'Change active goal?',
          text: 'Your current goal will be marked completed and kept in Goal History. A new active goal will be created.',
          showCancelButton: true,
          confirmButtonText: 'Complete and start new',
          cancelButtonText: 'Keep current goal',
          confirmButtonColor: '#65a30d',
        });
        if (!confirmation.isConfirmed) return;
      }
      // 1. Verify with backend calculators
      const bmrRes = await apiClient.calcBMR({
        gender: form.gender, weight_kg: Number(form.weight_kg),
        height_cm: Number(form.height_cm), age: Number(form.age),
      });
      const tdeeRes = await apiClient.calcTDEE({ bmr: bmrRes.bmr, activity_level: form.activity_level });
      const targetRes = await apiClient.calcCalorieTarget({ tdee: tdeeRes.tdee, goal_type: form.goal_type });
      const finalTarget = Math.round(targetRes.targetCalories ?? target);
      const finalMacros = calcMacros(finalTarget, Number(form.weight_kg) || 0);

      // 2. Complete the existing row so history preserves the actual goal.
      if (activeGoal) {
        await apiClient.updateGoal(activeGoal.id, { status: 'completed' });
      }

      // 3. Create new active goal
      await apiClient.createGoal({
        user_id: user.id,
        goal_type: form.goal_type,
        target_value: finalTarget,
        target_calories: finalTarget,
        protein_target: finalMacros.protein,
        fat_target: finalMacros.fat,
        carb_target: finalMacros.carbs,
        status: 'active',
      });
      
      await loadGoals(user.id);
      setShowModal(false);
      Swal.fire({
        icon: 'success',
        title: activeGoal ? 'Goal Updated!' : 'Goal Created!',
        text: activeGoal ? 'Your previous goal was completed and new one is active.' : 'Your fitness goal is now active.',
        confirmButtonColor: '#65a30d',
        timer: 2000,
        timerProgressBar: true,
      });
    } catch (e: any) {
      Swal.fire({
        icon: 'error',
        title: 'Save Failed',
        text: e.message || 'Failed to create goal. Make sure backend is running.',
        confirmButtonColor: '#65a30d',
      });
    }
    setSaving(false);
  }

  async function handleChangeGoal() {
    // Pre-fill form with current active goal data for editing
    if (activeGoal) {
      setForm(prev => ({
        ...prev,
        goal_type: activeGoal.goal_type as GoalType,
      }));
    }
    setShowModal(true);
  }

  async function handleDeleteGoal(goalId: string) {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Delete Goal?',
      text: 'This will permanently remove this goal from your history.',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, delete it',
      cancelButtonText: 'Cancel',
    });
    if (!result.isConfirmed) return;

    try {
      // We'll use a delete endpoint if available, otherwise mark as deleted
      await apiClient.deleteGoal(goalId);
      await loadGoals(user!.id);
      Swal.fire({ icon: 'success', title: 'Deleted', timer: 1500, timerProgressBar: true });
    } catch {
      Swal.fire({ icon: 'error', title: 'Failed', text: 'Could not delete goal' });
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="text-center py-12">
          <Target className="text-brand-400 animate-spin mx-auto mb-4" size={40} />
          <p className="text-slate-400">Loading your goals...</p>
        </div>
      </div>
    );
  }

  const isNewUser = !activeGoal && goals.length === 0;

  return (
    <div>
      <PageHeader
        title="Goals"
        subtitle={isNewUser
          ? 'Set your first goal to get calorie and macro targets.'
          : 'One active goal at a time. History stays below.'}
        icon={Target}
      />

      {/* Active Goal Card - Prominent */}
      {activeGoal && (
        <div className="relative bg-gradient-to-br from-brand-900/30 to-brand-900/10 border border-brand-600/30 rounded-3xl p-6 md:p-8 mb-8 shadow-xl shadow-brand-600/10 overflow-hidden">
          <div className="absolute top-4 right-4 flex gap-2">
            <button 
              onClick={handleChangeGoal}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition backdrop-blur-sm"
              title="Change Goal"
            >
              <RotateCcw size={18} />
            </button>
            <button 
              onClick={() => handleDeleteGoal(activeGoal.id)}
              className="p-2 rounded-xl bg-white/10 hover:bg-red-500/20 text-white/80 hover:text-red-400 transition backdrop-blur-sm"
              title="Delete Goal"
            >
              <Trash2 size={18} />
            </button>
          </div>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-2xl bg-brand-600/20 border border-brand-500/30">
                <Flag className="text-brand-400" size={28} />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-2xl md:text-3xl font-extrabold text-white capitalize">
                    {String(activeGoal.goal_type).replace(/_/g, ' ')}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-brand-600/30 text-brand-300 text-xs font-bold uppercase tracking-wider">
                    Active
                  </span>
                </div>
                <p className="text-slate-400 text-sm">
                  Started {new Date(activeGoal.created_at).toLocaleDateString()}
                  {activeGoal.target_date && ` · Target: ${new Date(activeGoal.target_date).toLocaleDateString()}`}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4 text-center md:grid-cols-4">
              <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Daily Calories</div>
                <div className="text-2xl md:text-3xl font-extrabold text-brand-400">
                  {activeGoal.target_calories ?? activeGoal.target_value ?? '—'}
                </div>
                <div className="text-[10px] text-slate-600 mt-1">kcal</div>
              </div>
              <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Protein</div>
                <div className="text-2xl md:text-3xl font-extrabold text-red-400">{activeGoal.protein_target ?? 0}g</div>
              </div>
              <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Fat</div>
                <div className="text-2xl md:text-3xl font-extrabold text-blue-400">{activeGoal.fat_target ?? 0}g</div>
              </div>
              <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Carbs</div>
                <div className="text-2xl md:text-3xl font-extrabold text-yellow-400">{activeGoal.carb_target ?? 0}g</div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-white/10 flex flex-wrap gap-3 justify-center">
            <button onClick={handleChangeGoal}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-400 hover:bg-brand-300 text-slate-950 font-bold transition shadow-lg shadow-brand-400/20">
              <RotateCcw size={16} /> Change Goal
            </button>
            <Link to="/daily" className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition border border-slate-700">
              <ArrowRight size={16} /> Go to Daily Tracker
            </Link>
          </div>

          <div className="mt-6 pt-6 border-t border-white/10">
            <div className="flex items-center gap-2 text-brand-300 font-bold text-sm mb-2">
              <Sparkles size={16} /> Recommended plan for your selected goal
            </div>
            <p className="text-sm text-slate-400 mb-3">{GOAL_GUIDANCE[activeGoal.goal_type as GoalType]?.summary}</p>
            <div className="grid md:grid-cols-3 gap-3">
              {(GOAL_GUIDANCE[activeGoal.goal_type as GoalType]?.plan || []).map((step) => (
                <div key={step} className="rounded-xl bg-slate-950/40 border border-white/10 p-3 text-xs text-slate-300">{step}</div>
              ))}
            </div>
            <div className="grid md:grid-cols-2 gap-4 mt-4">
              <RecommendationList title="Recommended food and nutrition" items={GOAL_GUIDANCE[activeGoal.goal_type as GoalType]?.food || []} />
              <RecommendationList title="Recommended exercise routine" items={GOAL_GUIDANCE[activeGoal.goal_type as GoalType]?.exercise || []} />
            </div>
            <p className="text-[11px] text-slate-500 mt-3">These are practical starting suggestions, not medical advice. A qualified trainer or registered dietitian can personalize them.</p>
          </div>
        </div>
      )}

      {/* Welcome / Empty State */}
      {isNewUser && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 md:p-10 text-center mb-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-500 to-brand-400" />
          <Sparkles className="text-brand-400 mx-auto mb-4" size={48} />
          <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">Ready to Start?</h3>
          <p className="text-slate-400 text-lg mb-6 max-w-md mx-auto">
            We'll calculate your BMR, TDEE, and daily macro targets based on your profile. 
            This takes less than a minute.
          </p>
          <button 
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-brand-400 hover:bg-brand-300 text-slate-950 font-bold text-lg transition shadow-xl shadow-brand-600/30"
          >
            <Target size={20} /> Create My First Goal
          </button>
        </div>
      )}

      {/* Combined Goal + Daily Record History */}
      <div className="mb-8 bg-panel/80 border border-slate-800/80 rounded-2xl overflow-hidden">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 md:p-5 border-b border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-white">History</h3>
            <p className="text-xs text-slate-500 mt-0.5">Goals you set, plus every day you logged against them.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/calendar"
              className="text-sm font-semibold text-brand-400 hover:text-brand-300 flex items-center gap-1 px-2"
            >
              <CalendarDays size={14} /> Calendar
            </Link>
          <div className="flex rounded-xl bg-slate-950 border border-slate-800 p-1">
            <button
              type="button"
              onClick={() => setHistoryTab('daily')}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition ${
                historyTab === 'daily' ? 'bg-brand-400 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              <CalendarDays size={14} /> Daily records
            </button>
            <button
              type="button"
              onClick={() => setHistoryTab('goals')}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition ${
                historyTab === 'goals' ? 'bg-brand-400 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Flag size={14} /> Goal history
            </button>
          </div>
          </div>
        </div>

        {historyTab === 'daily' ? (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-4 md:p-5 border-b border-slate-800/80">
              {[
                { label: 'Days logged', value: dailyStats.days, icon: CalendarDays },
                { label: 'Avg intake', value: dailyStats.days ? `${dailyStats.avgIn}` : '—', icon: Utensils },
                { label: 'Avg burned', value: dailyStats.days ? `${dailyStats.avgBurn}` : '—', icon: Flame },
                { label: 'Target hit rate', value: dailyStats.days ? `${dailyStats.hitRate}%` : '—', icon: Target },
                { label: 'Log streak', value: dailyStats.streak ? `${dailyStats.streak}d` : '0', icon: Flag },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-slate-950/60 border border-slate-800 px-3 py-2.5">
                  <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-slate-500 mb-1">
                    <s.icon size={12} className="text-brand-400" /> {s.label}
                  </div>
                  <div className="text-white font-bold text-lg">
                    {s.value}
                    {(s.label === 'Avg intake' || s.label === 'Avg burned') && dailyStats.days > 0 && (
                      <span className="text-xs text-slate-500 font-medium ml-1">kcal</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 px-4 md:px-5 py-3">
              <div className="flex gap-1.5">
                {([7, 14, 30, 0] as RangeKey[]).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRange(n)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                      range === n
                        ? 'bg-brand-600/20 border-brand-500/40 text-brand-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {n === 0 ? 'All' : `${n}d`}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500">
                On target = intake within 10% of the goal that was active that day.
              </p>
            </div>

            {dailyRows.length === 0 ? (
              <EmptyState
                title="No daily records yet"
                hint="Log food, exercise, water, or steps on the Daily page. They’ll show up here against your calorie target."
                action={
                  <Link to="/daily" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-400 hover:bg-brand-300 text-slate-950 text-sm font-bold">
                    <ArrowRight size={14} /> Open Daily Tracker
                  </Link>
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[720px]">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 border-y border-slate-800">
                      <th className="px-4 md:px-5 py-2.5 font-semibold">Date</th>
                      <th className="px-3 py-2.5 font-semibold">Intake</th>
                      <th className="px-3 py-2.5 font-semibold">Burned</th>
                      <th className="px-3 py-2.5 font-semibold">Net</th>
                      <th className="px-3 py-2.5 font-semibold">Vs goal</th>
                      <th className="px-3 py-2.5 font-semibold">Water</th>
                      <th className="px-3 py-2.5 font-semibold">Steps</th>
                      <th className="px-3 py-2.5 font-semibold">Result</th>
                      <th className="px-3 py-2.5 font-semibold"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedRows.map((row) => {
                      const isToday = row.date === todayKey();
                      return (
                        <tr
                          key={row.id || row.date}
                          className="border-b border-slate-800/70 hover:bg-white/[0.03] cursor-pointer"
                          onClick={() => setSelectedRow(row)}
                        >
                          <td className="px-4 md:px-5 py-3 whitespace-nowrap">
                            <div className="text-white font-semibold">
                              {formatDay(row.date, { weekday: 'short', month: 'short', day: 'numeric' })}
                            </div>
                            <div className="text-[11px] text-slate-500 capitalize">
                              {isToday ? 'Today · ' : ''}{row.goalType}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-brand-300 font-semibold">{row.consumed}<span className="text-slate-600 font-normal text-xs ml-0.5">kcal</span></td>
                          <td className="px-3 py-3 text-orange-300 font-semibold">{row.burned}<span className="text-slate-600 font-normal text-xs ml-0.5">kcal</span></td>
                          <td className="px-3 py-3 text-white font-semibold">{row.net}</td>
                          <td className="px-3 py-3">
                            {row.target ? (
                              <div>
                                <div className="text-slate-200">{row.consumed} / {row.target}</div>
                                <div className="h-1.5 w-24 rounded-full bg-slate-800 mt-1 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${row.consumed > row.target ? 'bg-amber-400' : 'bg-brand-500'}`}
                                    style={{ width: `${Math.min(100, Math.round((row.consumed / row.target) * 100))}%` }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-sky-300">
                            <span className="inline-flex items-center gap-1"><Droplets size={12} />{row.water} ml</span>
                          </td>
                          <td className="px-3 py-3 text-violet-300">
                            <span className="inline-flex items-center gap-1"><Footprints size={12} />{row.steps.toLocaleString()}</span>
                          </td>
                          <td className="px-3 py-3">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold border ${verdictClass[row.verdict.tone]}`}>
                              {row.verdict.label}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <span className="inline-flex items-center gap-1 text-xs text-brand-400 font-semibold">
                              <Eye size={14} /> View
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {dailyRows.length > PAGE_SIZE && (
                  <div className="flex items-center justify-between gap-3 px-4 md:px-5 py-3 border-t border-slate-800">
                    <p className="text-xs text-slate-500">
                      {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, dailyRows.length)} of {dailyRows.length}
                    </p>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        className="p-2 rounded-lg border border-slate-800 text-slate-300 disabled:opacity-30 hover:bg-slate-800"
                        aria-label="Previous page"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      {pageCount <= 8
                        ? Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setPage(n)}
                            className={`min-w-8 h-8 rounded-lg text-xs font-bold ${
                              n === page ? 'bg-brand-400 text-slate-950' : 'text-slate-400 hover:bg-slate-800'
                            }`}
                          >
                            {n}
                          </button>
                        ))
                        : (
                          <span className="px-2 text-xs font-bold text-slate-300">{page} / {pageCount}</span>
                        )}
                      <button
                        type="button"
                        disabled={page >= pageCount}
                        onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                        className="p-2 rounded-lg border border-slate-800 text-slate-300 disabled:opacity-30 hover:bg-slate-800"
                        aria-label="Next page"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : goals.length === 0 ? (
          <EmptyState title="No goals yet" hint="Create your first goal to get calorie and macro targets." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 border-b border-slate-800">
                  <th className="px-4 md:px-5 py-2.5 font-semibold">Goal</th>
                  <th className="px-3 py-2.5 font-semibold">Calories</th>
                  <th className="px-3 py-2.5 font-semibold">Macros</th>
                  <th className="px-3 py-2.5 font-semibold">Started</th>
                  <th className="px-3 py-2.5 font-semibold text-right"></th>
                </tr>
              </thead>
              <tbody>
                {goals.map((g: any) => {
                  const isActive = g.status === 'active';
                  const isCompleted = g.status === 'completed';
                  return (
                    <tr key={g.id} className={`border-b border-slate-800/70 ${isActive ? 'bg-brand-900/10' : ''}`}>
                      <td className="px-4 md:px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold capitalize ${isActive ? 'text-brand-400' : 'text-white'}`}>
                            {String(g.goal_type).replace(/_/g, ' ')}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            isActive ? 'bg-brand-600/30 text-brand-300'
                            : isCompleted ? 'bg-green-600/30 text-green-300'
                            : 'bg-slate-700 text-slate-400'
                          }`}>
                            {g.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-white font-semibold">{g.target_calories ?? g.target_value ?? '—'} <span className="text-slate-500 font-normal">kcal</span></td>
                      <td className="px-3 py-3 text-slate-400">
                        <span className="text-red-400">P {g.protein_target ?? 0}g</span>
                        {' · '}
                        <span className="text-blue-400">F {g.fat_target ?? 0}g</span>
                        {' · '}
                        <span className="text-yellow-400">C {g.carb_target ?? 0}g</span>
                      </td>
                      <td className="px-3 py-3 text-slate-400 whitespace-nowrap">{new Date(g.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right">
                        {!isActive && (
                          <button
                            onClick={() => handleDeleteGoal(g.id)}
                            className="p-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Theory Info Card */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
        <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Calculator size={20} className="text-brand-400" /> How It Works
        </h4>
        <div className="grid md:grid-cols-4 gap-4 text-sm">
          <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800">
            <div className="text-slate-500 text-xs uppercase tracking-wide mb-1">1. BMR</div>
            <div className="text-white font-medium">Basal Metabolic Rate</div>
            <p className="text-slate-500 text-[11px] mt-1">Mifflin-St Jeor equation (weight, height, age, gender)</p>
          </div>
          <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800">
            <div className="text-slate-500 text-xs uppercase tracking-wide mb-1">2. TDEE</div>
            <div className="text-white font-medium">Total Daily Energy Expenditure</div>
            <p className="text-slate-500 text-[11px] mt-1">BMR × Activity Multiplier (1.2–1.9)</p>
          </div>
          <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800">
            <div className="text-slate-500 text-xs uppercase tracking-wide mb-1">3. Goal</div>
            <div className="text-white font-medium">Calorie Target</div>
            <p className="text-slate-500 text-[11px] mt-1">TDEE ± deficit/surplus based on goal type</p>
          </div>
          <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800">
            <div className="text-slate-500 text-xs uppercase tracking-wide mb-1">4. Macros</div>
            <div className="text-white font-medium">Protein / Fat / Carbs</div>
            <p className="text-slate-500 text-[11px] mt-1">Protein 1.6–2.2g/kg, Fat 25–30%, rest Carbs</p>
          </div>
        </div>
      </div>

      {/* Popup Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setShowModal(false)}>
          <div
            className="bg-slate-900 border border-brand-600/30 rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom-4 duration-300"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-800 sticky top-0 bg-slate-900 rounded-t-3xl z-10">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Calculator size={20} className="text-brand-400" /> {activeGoal ? 'Change Goal' : 'Create Your Goal'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white p-1" aria-label="Close">
                <X size={22} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Goal Type Selector */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">What's your goal?</label>
                <div className="mb-3 rounded-xl border border-brand-600/30 bg-brand-900/15 p-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-brand-300 font-bold">Suggested starting goal: {GOAL_LABELS[recommendedGoal]}</div>
                      <p className="text-slate-400 text-xs mt-1">Based on BMI from your current height and weight. It is a starting point, not a diagnosis.</p>
                    </div>
                    {form.goal_type !== recommendedGoal && (
                      <button type="button" onClick={() => setForm({ ...form, goal_type: recommendedGoal })} className="shrink-0 px-3 py-1.5 rounded-lg bg-brand-400 text-slate-950 text-xs font-bold">Use suggestion</button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {(Object.keys(GOAL_LABELS) as GoalType[]).map(gt => (
                    <button
                      key={gt}
                      type="button"
                      onClick={() => setForm({ ...form, goal_type: gt })}
                      className={`px-3 py-3 rounded-xl text-sm font-bold border transition relative overflow-hidden ${
                        form.goal_type === gt
                          ? 'bg-brand-400 border-brand-300 text-slate-950 shadow-lg shadow-brand-400/20'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-brand-500/50 hover:bg-slate-900'
                      }`}
                    >
                      {GOAL_LABELS[gt]}
                      {form.goal_type === gt && (
                        <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                <div className="text-sm font-bold text-white">{GOAL_LABELS[form.goal_type]}</div>
                <p className="text-xs text-slate-400 mt-1">{guidance.summary}</p>
                <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                  <span className="text-slate-500">Calorie strategy <b className="text-slate-200 block mt-0.5">{guidance.calories}</b></span>
                  <span className="text-slate-500">Protein range <b className="text-slate-200 block mt-0.5">{guidance.protein}</b></span>
                </div>
                <div className="grid md:grid-cols-2 gap-3 mt-3">
                  <RecommendationList title="Food" items={guidance.food} compact />
                  <RecommendationList title="Exercise" items={guidance.exercise} compact />
                </div>
              </div>

              {/* Calculator Fields */}
              <div className="border-t border-slate-800 pt-4">
                <label className="block text-sm font-medium text-slate-300 mb-3">Your Stats</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-xs text-slate-500 block mb-1">Weight (kg)</span>
                    <input type="number" min="30" max="300" step="0.1" 
                      value={form.weight_kg} onChange={e => setForm({ ...form, weight_kg: Number(e.target.value) })}
                      className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-brand-500" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block mb-1">Height (cm)</span>
                    <input type="number" min="100" max="250" 
                      value={form.height_cm} onChange={e => setForm({ ...form, height_cm: Number(e.target.value) })}
                      className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-brand-500" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block mb-1">Age</span>
                    <input type="number" min="13" max="100" 
                      value={form.age} onChange={e => setForm({ ...form, age: Number(e.target.value) })}
                      className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-brand-500" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block mb-1">Gender</span>
                    <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}
                      className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-brand-500">
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <span className="text-xs text-slate-500 block mb-1">Activity Level</span>
                    <select value={form.activity_level} onChange={e => setForm({ ...form, activity_level: e.target.value as any })}
                      className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-brand-500">
                      <option value="sedentary">Sedentary — Little/no exercise (1.20x)</option>
                      <option value="lightly_active">Lightly Active — Light exercise 1–3 days/week (1.375x)</option>
                      <option value="moderately_active">Moderately Active — Moderate exercise 3–5 days/week (1.55x)</option>
                      <option value="very_active">Very Active — Hard exercise 6–7 days/week (1.725x)</option>
                      <option value="extremely_active">Extremely Active — Very hard exercise, physical job (1.90x)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Live Result Preview */}
              <div className="bg-brand-900/20 border border-brand-600/20 rounded-2xl p-4">
                <div className="flex items-center gap-2 text-xs font-bold text-brand-400 mb-3">
                  <Calculator size={14} /> Live Preview
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-slate-950/50 rounded-xl p-3">
                    <div className="text-slate-500 text-xs">BMR</div>
                    <div className="text-white font-bold text-lg">{bmr} kcal</div>
                  </div>
                  <div className="bg-slate-950/50 rounded-xl p-3">
                    <div className="text-slate-500 text-xs">TDEE</div>
                    <div className="text-white font-bold text-lg">{tdee} kcal</div>
                  </div>
                  <div className="bg-slate-950/50 rounded-xl p-3">
                    <div className="text-slate-500 text-xs">Target</div>
                    <div className="text-brand-400 font-bold text-lg">{target} kcal</div>
                  </div>
                  <div className="bg-slate-950/50 rounded-xl p-3">
                    <div className="text-slate-500 text-xs">Macros</div>
                    <div className="text-white font-medium">
                      P: {macros.protein}g · F: {macros.fat}g · C: {macros.carbs}g
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 mt-3 text-center">
                  Based on Mifflin-St Jeor equation • {GOAL_LABELS[form.goal_type]} multiplier
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModal(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition border border-slate-700">
                  Cancel
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 py-3 rounded-xl bg-brand-400 hover:bg-brand-300 text-slate-950 font-bold transition shadow-lg shadow-brand-400/20 disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Flag size={16} /> {activeGoal ? 'Update Goal' : 'Save Goal'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <DailyRecordModal row={selectedRow} userId={user?.id} onClose={() => setSelectedRow(null)} />
    </div>
  );
}