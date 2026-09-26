import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, ChevronLeft, ChevronRight, Target } from 'lucide-react';
import { PageHeader } from '../components/ui';
import DailyRecordModal from '../components/DailyRecordModal';
import { apiClient } from '../lib/api';
import { useAuthStore } from '../store/auth';
import {
  emptyDayRow,
  enrichDailyRecords,
  todayKey,
  type DailyRow,
} from '../lib/dailyHistory';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function monthLabel(year: number, month: number) {
  return new Date(year, month, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function cellTone(row?: DailyRow) {
  const logged = !!row && (row.consumed > 0 || row.burned > 0 || row.water > 0 || row.steps > 0);
  if (!logged) {
    return {
      wrap: 'bg-slate-950/40 border-slate-800 text-slate-500 hover:border-slate-600',
      dot: 'bg-slate-700',
    };
  }
  if (row.verdict.tone === 'green') {
    return {
      wrap: 'bg-green-600/20 border-green-500/40 text-green-100 hover:border-green-400',
      dot: 'bg-green-400',
    };
  }
  if (row.verdict.tone === 'amber') {
    return {
      wrap: 'bg-amber-600/20 border-amber-500/40 text-amber-100 hover:border-amber-400',
      dot: 'bg-amber-400',
    };
  }
  if (row.verdict.tone === 'red') {
    return {
      wrap: 'bg-red-600/20 border-red-500/40 text-red-100 hover:border-red-400',
      dot: 'bg-red-400',
    };
  }
  return {
    wrap: 'bg-slate-800/50 border-slate-700 text-slate-200 hover:border-slate-500',
    dot: 'bg-slate-400',
  };
}

export default function CalendarPage() {
  const { user } = useAuthStore();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [goals, setGoals] = useState<any[]>([]);
  const [rows, setRows] = useState<DailyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<DailyRow | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      setLoading(true);
      try {
        const [g, recs] = await Promise.all([
          apiClient.getGoals(user.id).catch(() => []),
          apiClient.getDailyRecords(user.id).catch(() => []),
        ]);
        const goalList = Array.isArray(g) ? g : [];
        setGoals(goalList);
        setRows(enrichDailyRecords(Array.isArray(recs) ? recs : [], goalList));
      } catch {
        setGoals([]);
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id]);

  const byDate = useMemo(() => new Map(rows.map((r) => [r.date, r])), [rows]);

  const cells = useMemo(() => {
    const first = new Date(year, month, 1);
    const startPad = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const out: { date?: string; day?: number }[] = [];
    for (let i = 0; i < startPad; i++) out.push({});
    for (let d = 1; d <= daysInMonth; d++) {
      out.push({ date: `${year}-${pad(month + 1)}-${pad(d)}`, day: d });
    }
    while (out.length % 7 !== 0) out.push({});
    return out;
  }, [year, month]);

  const monthRows = useMemo(() => {
    const prefix = `${year}-${pad(month + 1)}-`;
    return rows.filter((r) => r.date.startsWith(prefix));
  }, [rows, year, month]);

  const monthStats = useMemo(() => {
    const logged = monthRows.filter((r) => r.consumed > 0 || r.burned > 0 || r.water > 0 || r.steps > 0 || r.id);
    const hits = logged.filter((r) => r.verdict.tone === 'green').length;
    const misses = logged.filter((r) => r.verdict.tone === 'amber' || r.verdict.tone === 'red').length;
    return { logged: logged.length, hits, misses };
  }, [monthRows]);

  function shiftMonth(delta: number) {
    const next = new Date(year, month + delta, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth());
  }

  const today = todayKey();

  return (
    <div>
      <PageHeader
        title="Calendar"
        subtitle="Monthly view of daily targets. Green = on target. Tap a day for the full record."
        icon={CalendarDays}
        action={
          <Link to="/goals" className="text-sm font-semibold text-brand-400 hover:text-brand-300">
            Goal history →
          </Link>
        }
      />

      <div className="flex items-center justify-between gap-3 mb-4">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
          aria-label="Previous month"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <h2 className="text-xl font-extrabold text-white">{monthLabel(year, month)}</h2>
          <button
            type="button"
            onClick={() => { setYear(now.getFullYear()); setMonth(now.getMonth()); }}
            className="text-xs text-brand-400 font-semibold"
          >
            Jump to today
          </button>
        </div>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
          aria-label="Next month"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <MiniStat label="Logged" value={monthStats.logged} />
        <MiniStat label="On target" value={monthStats.hits} color="text-green-400" />
        <MiniStat label="Missed" value={monthStats.misses} color="text-amber-400" />
      </div>

      <div className="flex flex-wrap gap-3 text-[11px] text-slate-400 mb-4">
        <Legend swatch="bg-green-500" label="On target (within 10%)" />
        <Legend swatch="bg-amber-400" label="Under target" />
        <Legend swatch="bg-red-500" label="Over target" />
        <Legend swatch="bg-slate-700" label="No log" />
      </div>

      <div className="bg-panel/80 border border-slate-800/80 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-7 border-b border-slate-800">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-2 text-center text-[11px] font-bold uppercase tracking-wide text-slate-500">
              {d}
            </div>
          ))}
        </div>
        {loading ? (
          <div className="py-16 text-center text-slate-500">Loading calendar…</div>
        ) : (
          <div className="grid grid-cols-7">
            {cells.map((cell, i) => {
              if (!cell.date) {
                return <div key={`pad-${i}`} className="min-h-[72px] md:min-h-[96px] border-b border-r border-slate-800/60 bg-slate-950/20" />;
              }
              const row = byDate.get(cell.date);
              const tone = cellTone(row);
              const isToday = cell.date === today;
              const isFuture = cell.date > today;
              return (
                <button
                  key={cell.date}
                  type="button"
                  disabled={isFuture}
                  onClick={() => setSelected(row || emptyDayRow(cell.date, goals))}
                  className={`min-h-[72px] md:min-h-[96px] p-1.5 md:p-2 text-left border-b border-r border-slate-800/60 transition ${tone.wrap} ${
                    isToday ? 'ring-2 ring-brand-400 ring-inset' : ''
                  } ${isFuture ? 'opacity-40 cursor-default' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-bold ${isToday ? 'text-brand-300' : ''}`}>{cell.day}</span>
                    <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
                  </div>
                  {row && (row.consumed > 0 || row.target > 0) && (
                    <div className="hidden sm:block text-[10px] leading-tight opacity-80">
                      {row.consumed}
                      {row.target ? `/${row.target}` : ''}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <p className="text-xs text-slate-500 mt-4 flex items-center gap-1.5">
        <Target size={12} /> Empty days stay grey. Click a past day to see meals, workouts, water, and steps.
      </p>

      <DailyRecordModal row={selected} userId={user?.id} onClose={() => setSelected(null)} />
    </div>
  );
}

function MiniStat({ label, value, color = 'text-white' }: { label: string; value: number; color?: string }) {
  return (
    <div className="rounded-2xl bg-slate-900/60 border border-slate-800 px-4 py-3">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`text-2xl font-extrabold ${color}`}>{value}</div>
    </div>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-full ${swatch}`} />
      {label}
    </span>
  );
}
