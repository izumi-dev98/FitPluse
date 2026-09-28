import { useState, useMemo } from 'react';
import {
  History,
  Calendar,
  Flame,
  Search,
  BookOpen,
  Sparkles,
  Plus,
} from 'lucide-react';
import { useAuthStore } from '../store/auth';
import {
  useDailyExercises,
  useDailyFoods,
  useDailyRecords,
  useGoals,
  useWaterIntake,
} from '../lib/queries';
import {
  enrichDailyRecords,
  formatDay,
  todayKey,
  verdictClass,
  type DailyRow,
} from '../lib/dailyHistory';
import { fmtInt } from '../lib/format';
import { GOAL_GUIDANCE, type GoalType } from '../lib/theory';
import DailyRecordModal from '../components/DailyRecordModal';
import QuickLogModal from '../components/QuickLogModal';
import { PaginationBar } from '../components/ui';

const PAGE_SIZE = 10;

export default function HistoryPage() {
  const user = useAuthStore((s) => s.user);
  const uid = user?.id;

  const [range, setRange] = useState<number>(30); // 7, 14, 30, 90, 0 (all)
  const [verdictFilter, setVerdictFilter] = useState<'all' | 'green' | 'amber' | 'red'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [selectedRow, setSelectedRow] = useState<DailyRow | null>(null);
  const [quickLogOpen, setQuickLogOpen] = useState(false);
  const [showTheoryGuide, setShowTheoryGuide] = useState(false);

  // Queries (shared cache keys — same entries as Daily/Dashboard/Goals)
  const recordsQ = useDailyRecords(uid);
  const goalsQ = useGoals(uid);
  const foodsQ = useDailyFoods(uid);
  const exercisesQ = useDailyExercises(uid);
  const waterQ = useWaterIntake(uid);

  const loading =
    recordsQ.isLoading ||
    goalsQ.isLoading ||
    foodsQ.isLoading ||
    exercisesQ.isLoading ||
    waterQ.isLoading;

  const goals = goalsQ.data ?? [];
  const activeGoal = goals.find((g) => g.status === 'active') || goals[0] || null;

  // Merge real log totals into the records: food/exercise/water writes only
  // insert child rows, they never update daily_records columns — so derive
  // consumed/burned/water from the child tables (same pattern as GoalsPage).
  const records = useMemo(() => {
    const recs = recordsQ.data ?? [];
    const dateByRecordId = new Map(recs.map((r) => [String(r.id), r.record_date]));
    const foodByRecord = new Map<string, number>();
    const foodByDate = new Map<string, number>();
    for (const f of foodsQ.data ?? []) {
      const v = Number(f.calories) || 0;
      if (f.daily_record_id) {
        const k = String(f.daily_record_id);
        foodByRecord.set(k, (foodByRecord.get(k) || 0) + v);
      }
      const d = String(
        f.record_date || dateByRecordId.get(String(f.daily_record_id)) || f.created_at || '',
      ).slice(0, 10);
      if (d) foodByDate.set(d, (foodByDate.get(d) || 0) + v);
    }
    const burnByRecord = new Map<string, number>();
    const burnByDate = new Map<string, number>();
    for (const e of exercisesQ.data ?? []) {
      const v = Number(e.calories_burned) || 0;
      if (e.daily_record_id) {
        const k = String(e.daily_record_id);
        burnByRecord.set(k, (burnByRecord.get(k) || 0) + v);
      }
      const d = String(
        e.record_date || dateByRecordId.get(String(e.daily_record_id)) || e.created_at || '',
      ).slice(0, 10);
      if (d) burnByDate.set(d, (burnByDate.get(d) || 0) + v);
    }
    const waterByDate = new Map<string, number>();
    for (const w of waterQ.data ?? []) {
      const d = String(w.recorded_at || w.created_at || '').slice(0, 10);
      if (d) waterByDate.set(d, (waterByDate.get(d) || 0) + (Number(w.amount_ml) || 0));
    }
    return recs.map((r) => ({
      ...r,
      calories_consumed: Math.max(
        Number(r.calories_consumed) || 0,
        foodByRecord.get(String(r.id)) || 0,
        foodByDate.get(r.record_date) || 0,
      ),
      calories_burned: Math.max(
        Number(r.calories_burned) || 0,
        burnByRecord.get(String(r.id)) || 0,
        burnByDate.get(r.record_date) || 0,
      ),
      water_ml: Math.max(Number(r.water_ml) || 0, waterByDate.get(r.record_date) || 0),
    }));
  }, [recordsQ.data, foodsQ.data, exercisesQ.data, waterQ.data]);

  // Enriched daily rows with real theory and goal calculations
  const allDailyRows = useMemo(() => {
    return enrichDailyRecords(records, goals);
  }, [records, goals]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    const cutoff = range
      ? new Date(Date.now() - range * 86400000).toISOString().slice(0, 10)
      : '';

    return allDailyRows.filter((r) => {
      // Range filter
      if (cutoff && r.date < cutoff) return false;
      // Verdict filter
      if (verdictFilter !== 'all' && r.verdict.tone !== verdictFilter) return false;
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesDate = r.date.includes(q) || formatDay(r.date).toLowerCase().includes(q);
        const matchesGoal = r.goalType.toLowerCase().includes(q);
        const matchesNotes = r.notes.toLowerCase().includes(q);
        return matchesDate || matchesGoal || matchesNotes;
      }
      return true;
    });
  }, [allDailyRows, range, verdictFilter, searchQuery]);

  // Summary statistics
  const stats = useMemo(() => {
    if (!filteredRows.length) {
      return { totalDays: 0, avgIntake: 0, avgBurned: 0, hitRate: 0, streak: 0 };
    }
    const totalDays = filteredRows.length;
    const avgIntake = Math.round(filteredRows.reduce((s, r) => s + r.consumed, 0) / totalDays);
    const avgBurned = Math.round(filteredRows.reduce((s, r) => s + r.burned, 0) / totalDays);
    const scored = filteredRows.filter((r) => r.target > 0);
    const hits = scored.filter((r) => r.verdict.tone === 'green').length;
    const hitRate = scored.length ? Math.round((hits / scored.length) * 100) : 0;

    // Consecutive streak
    const dates = new Set(allDailyRows.map((r) => r.date));
    let strk = 0;
    const d = new Date();
    for (let i = 0; i < 60; i++) {
      const key = d.toISOString().slice(0, 10);
      if (dates.has(key)) {
        strk++;
        d.setDate(d.getDate() - 1);
      } else break;
    }

    return { totalDays, avgIntake, avgBurned, hitRate, streak: Math.max(strk, 1) };
  }, [filteredRows, allDailyRows]);

  // Pagination
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pagedRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Active goal guidance
  const activeGoalKey = (activeGoal?.goal_type || 'maintain').toLowerCase().replace(/\s+/g, '_') as GoalType;
  const theoryGuidance = GOAL_GUIDANCE[activeGoalKey] || GOAL_GUIDANCE.maintain;

  return (
    <div className="space-y-6">
      {/* ========================================================= */}
      {/* 1. TOP HEADER & INTRO                                     */}
      {/* ========================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-[#ccff00] mb-1">
            <History size={14} />
            <span>Daily History & Performance Logs</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight uppercase">
            Performance History
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Detailed chronological record of your daily calorie balance, macronutrients, hydration, steps, and goal theory adherence.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowTheoryGuide(!showTheoryGuide)}
            className="px-3.5 py-2.5 rounded-xl bg-[#0f1626] border border-[#1a263d] hover:border-[#ccff00]/40 text-xs font-bold text-slate-300 hover:text-white transition flex items-center gap-1.5"
          >
            <BookOpen size={15} className="text-[#ccff00]" />
            <span>{showTheoryGuide ? 'Hide Theory' : 'Goal Theory'}</span>
          </button>

          <button
            onClick={() => setQuickLogOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-[#ccff00] hover:bg-[#bbf000] text-black font-black text-xs uppercase tracking-wider transition shadow-[0_0_15px_rgba(204,255,0,0.3)] flex items-center gap-1.5 active:scale-95"
          >
            <Plus size={16} className="stroke-[3]" />
            <span>Log Day</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. GOAL THEORY & NUTRITION GUIDANCE ACCORDION             */}
      {/* ========================================================= */}
      {showTheoryGuide && activeGoal && (
        <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-[#0f1726] to-[#0c1322] border border-[#1e2d48] shadow-xl relative overflow-hidden animate-in fade-in duration-300">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#ccff00]/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#182338]">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-[#ccff00]/15 text-[#ccff00] border border-[#ccff00]/30 flex items-center justify-center">
                <Sparkles size={16} />
              </span>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#ccff00]">
                  Active Goal Framework
                </span>
                <h3 className="text-base sm:text-lg font-black text-white capitalize">
                  {String(activeGoal.goal_type || 'Custom').replace(/_/g, ' ')} Strategy
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-[#152238] border border-[#223555] text-white">
                Target: {fmtInt(activeGoal.target_calories ?? activeGoal.target_value)} kcal/day
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            <div className="p-3.5 rounded-2xl bg-[#090d16] border border-[#182338] space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                Calorie Strategy
              </span>
              <p className="text-xs font-bold text-[#ccff00]">{theoryGuidance.calories}</p>
              <p className="text-[11px] text-slate-400">{theoryGuidance.summary}</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#090d16] border border-[#182338] space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                Protein Intake
              </span>
              <p className="text-xs font-bold text-sky-400">{theoryGuidance.protein}</p>
              <p className="text-[11px] text-slate-400">Essential for muscle protein synthesis and recovery.</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#090d16] border border-[#182338] space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                Recommended Routine
              </span>
              <p className="text-xs font-bold text-amber-400">
                {theoryGuidance.exercise[0] || 'Structured progressive overload'}
              </p>
              <p className="text-[11px] text-slate-400">
                {theoryGuidance.exercise[1] || 'Consistent weekly frequency.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. SUMMARY KPI STATS ROW                                  */}
      {/* ========================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="p-4 rounded-2xl bg-[#0f1626] border border-[#1a263d] text-center">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
            Days Logged
          </span>
          <span className="text-xl sm:text-2xl font-black text-white mt-1 block">
            {stats.totalDays}
          </span>
          <span className="text-[10px] text-slate-500 font-semibold">in selected range</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#0f1626] border border-[#1a263d] text-center">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
            Avg. Intake
          </span>
          <span className="text-xl sm:text-2xl font-black text-[#ccff00] mt-1 block">
            {fmtInt(stats.avgIntake)}
          </span>
          <span className="text-[10px] text-slate-500 font-semibold">kcal / day</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#0f1626] border border-[#1a263d] text-center">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
            Avg. Burned
          </span>
          <span className="text-xl sm:text-2xl font-black text-orange-400 mt-1 block">
            {fmtInt(stats.avgBurned)}
          </span>
          <span className="text-[10px] text-slate-500 font-semibold">kcal active</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#0f1626] border border-[#1a263d] text-center">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
            Target Hit Rate
          </span>
          <span className="text-xl sm:text-2xl font-black text-sky-400 mt-1 block">
            {stats.hitRate}%
          </span>
          <span className="text-[10px] text-slate-500 font-semibold">within ±10% goal</span>
        </div>

        <div className="col-span-2 sm:col-span-1 p-4 rounded-2xl bg-[#0f1626] border border-[#1a263d] text-center">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
            Current Streak
          </span>
          <span className="text-xl sm:text-2xl font-black text-amber-400 mt-1 block flex items-center justify-center gap-1">
            <Flame size={18} />
            <span>{stats.streak}</span>
          </span>
          <span className="text-[10px] text-slate-500 font-semibold">days active</span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4. FILTERS & SEARCH TOOLBAR                               */}
      {/* ========================================================= */}
      <div className="p-4 rounded-2xl bg-[#0f1626] border border-[#1a263d] flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Date Range Selector */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1 md:pb-0">
          {[
            { label: '7 Days', val: 7 },
            { label: '14 Days', val: 14 },
            { label: '30 Days', val: 30 },
            { label: '90 Days', val: 90 },
            { label: 'All Time', val: 0 },
          ].map((item) => (
            <button
              key={item.val}
              onClick={() => {
                setRange(item.val);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                range === item.val
                  ? 'bg-[#ccff00] text-black shadow-[0_0_10px_rgba(204,255,0,0.25)]'
                  : 'text-slate-400 hover:text-white bg-[#090d16]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Verdict and Search */}
        <div className="flex items-center gap-2">
          {/* Verdict Filter */}
          <select
            value={verdictFilter}
            onChange={(e) => {
              setVerdictFilter(e.target.value as 'all' | 'green' | 'amber' | 'red');
              setPage(1);
            }}
            className="px-3 py-1.5 rounded-xl bg-[#090d16] border border-[#182338] text-xs font-bold text-slate-300 focus:outline-none focus:border-[#ccff00]"
          >
            <option value="all">All Verdicts</option>
            <option value="green">On Target (±10%)</option>
            <option value="amber">Under Target</option>
            <option value="red">Over Target</option>
          </select>

          {/* Search box */}
          <div className="relative flex-1 sm:w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search date, notes..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#090d16] border border-[#182338] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#ccff00]"
            />
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 5. DETAILED DAILY RECORD LIST VIEW                        */}
      {/* ========================================================= */}
      {loading ? (
        <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-[#ccff00] border-t-transparent animate-spin" />
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Loading history records…</p>
        </div>
      ) : pagedRows.length === 0 ? (
        <div className="p-12 rounded-3xl bg-[#0f1626] border border-[#1a263d] text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#152033] text-slate-400 mx-auto flex items-center justify-center">
            <Calendar size={24} />
          </div>
          <h3 className="text-base font-black text-white">No records found for this period</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Log your daily meals, workouts, water, or steps to start viewing detailed performance history.
          </p>
          <button
            onClick={() => setQuickLogOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-[#ccff00] hover:bg-[#bbf000] text-black font-black text-xs uppercase tracking-wider transition shadow-[0_0_12px_rgba(204,255,0,0.25)]"
          >
            Log Today's Fuel
          </button>
        </div>
      ) : (
        <div className="rounded-3xl bg-[#0f1626] border border-[#1a263d] overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-sm border-collapse">
              <thead>
                <tr className="bg-[#090d16] border-b border-[#1a263d] text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="text-left px-4 py-3">Goal</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-right px-4 py-3">Intake</th>
                  <th className="text-right px-4 py-3">Burned</th>
                  <th className="text-right px-4 py-3">Net</th>
                  <th className="text-right px-4 py-3">Target</th>
                  <th className="text-right px-4 py-3">Over/Under</th>
                  <th className="text-right px-4 py-3">Water</th>
                  <th className="text-right px-4 py-3">Steps</th>
                  <th className="text-right px-4 py-3">Verdict</th>
                </tr>
              </thead>
              <tbody>
                {pagedRows.map((row) => {
                  const isToday = row.date === todayKey();
                  const diff = row.target > 0 ? row.consumed - row.target : 0;
                  return (
                    <tr
                      key={row.date}
                      onClick={() => setSelectedRow(row)}
                      className={`border-b border-[#182338] last:border-b-0 hover:bg-[#ccff00]/5 transition cursor-pointer ${isToday ? 'bg-[#ccff00]/5' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white whitespace-nowrap">{formatDay(row.date, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                          {isToday && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#ccff00]/20 text-[#ccff00] border border-[#ccff00]/40">Today</span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500">{new Date(`${row.date}T12:00:00`).getFullYear()}</div>
                      </td>
                      <td className="px-4 py-3 capitalize text-slate-300 font-semibold whitespace-nowrap">{row.goalType}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          row.goalStatus === 'active'
                            ? 'bg-[#ccff00]/15 text-[#ccff00] border-[#ccff00]/30'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}>
                          {row.goalStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-black text-white whitespace-nowrap">{fmtInt(row.consumed)}<span className="ml-1 text-[10px] font-medium text-slate-500">kcal</span></td>
                      <td className="px-4 py-3 text-right font-black text-[#ccff00] whitespace-nowrap">{fmtInt(row.burned)}<span className="ml-1 text-[10px] font-medium text-slate-500">kcal</span></td>
                      <td className="px-4 py-3 text-right font-bold text-white whitespace-nowrap">{fmtInt(row.net)}<span className="ml-1 text-[10px] font-medium text-slate-500">kcal</span></td>
                      <td className="px-4 py-3 text-right text-slate-400 whitespace-nowrap">{row.target > 0 ? fmtInt(row.target) : "-"}</td>
                      <td className={`px-4 py-3 text-right font-bold whitespace-nowrap ${diff > 0 ? 'text-red-400' : diff < 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                        {row.target > 0 ? (diff !== 0 ? (diff > 0 ? `+${fmtInt(diff)}` : fmtInt(diff)) : 'Exact') : "-"}
                      </td>
                      <td className="px-4 py-3 text-right text-cyan-400 font-semibold whitespace-nowrap">{row.water > 0 ? `${(row.water / 1000).toFixed(1)}L` : "-"}</td>
                      <td className="px-4 py-3 text-right text-slate-300 whitespace-nowrap">{row.steps > 0 ? row.steps.toLocaleString() : "-"}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-extrabold border ${verdictClass[row.verdict.tone]}`}>{row.verdict.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-[#1a263d]">
            <PaginationBar page={page} pageCount={pageCount} total={filteredRows.length} pageSize={PAGE_SIZE} onPage={setPage} />
          </div>
        </div>
      )}

      {/* Detail Popups */}
      <DailyRecordModal
        row={selectedRow}
        userId={uid}
        onClose={() => setSelectedRow(null)}
      />

      <QuickLogModal
        open={quickLogOpen}
        onClose={() => setQuickLogOpen(false)}
      />
    </div>
  );
}
