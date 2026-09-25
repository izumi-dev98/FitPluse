import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Activity, Target, Calculator, ArrowRight, User, Trophy, BarChart3, Utensils, Dumbbell, Droplets } from 'lucide-react';
import AuthPage from './components/AuthPage';
import GoalsPage from './pages/GoalsPage';
import DailyPage from './pages/DailyPage';
import FoodsPage from './pages/FoodsPage';
import ExercisesPage from './pages/ExercisesPage';
import ProfilePage from './pages/ProfilePage';
import BadgesPage from './pages/BadgesPage';
import ProgressPage from './pages/ProgressPage';
import { calcBMR, calcTDEE, calcTarget, GOAL_LABELS, type GoalType } from './lib/theory';
import { useAuthStore } from './store/auth';
import { apiClient } from './lib/api';
import { LogOut } from 'lucide-react';

function Dashboard() {
  const navigate = useNavigate();
  const { user, accessToken } = useAuthStore();
  const [bmr, setBmr] = useState<number | null>(null);
  const [tdee, setTdee] = useState<number | null>(null);
  const [target, setTarget] = useState<number | null>(null);
  const [todayConsumed, setTodayConsumed] = useState(0);
  const [todayBurned, setTodayBurned] = useState(0);
  const [goalCalories, setGoalCalories] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Quick demo calculation
  function handleDemoCalc() {
    const b = calcBMR('male', 70, 175, 30);
    const t = calcTDEE(b, 'moderately_active');
    const tg = calcTarget(t, 'muscle_gain');
    setBmr(Math.round(b));
    setTdee(Math.round(t));
    setTarget(Math.round(tg));
  }

  // Load today's data
  useEffect(() => {
    if (!accessToken || !user?.id) { setLoading(false); return; }
    const uid = user.id;
    (async () => {
      try {
        const [records, goals] = await Promise.all([
          apiClient.getDailyRecords(uid),
          apiClient.getGoals(uid),
        ]);
        const recs = Array.isArray(records) ? records : [];
        const todayStr = new Date().toISOString().slice(0, 10);
        const todayRec = recs.find((r: any) => r.record_date === todayStr);
        if (todayRec) {
          setTodayConsumed(todayRec.calories_consumed || 0);
          setTodayBurned(todayRec.calories_burned || 0);
        }
        const gList = Array.isArray(goals) ? goals : [];
        const active = gList.find((g: any) => g.status === 'active');
        if (active?.target_calories) setGoalCalories(Number(active.target_calories));
      } catch {}
      setLoading(false);
    })();
  }, [user]);

  const progressPct = goalCalories ? Math.min(100, Math.round((todayConsumed / goalCalories) * 100)) : 0;
  const netCalories = goalCalories ? todayConsumed - goalCalories : 0;

  return (
    <>
      <header className="relative overflow-hidden bg-gradient-to-br from-brand-900/40 to-ink">
        <div className="max-w-5xl mx-auto px-6 py-24 md:py-32 text-center">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-6 leading-tight">
            Calorie & Goal <span className="text-brand-400">Theory</span>
          </h1>
          <p className="text-lg md:text-2xl text-slate-300 max-w-2xl mx-auto mb-10">
            Track your fitness journey with science-based BMR, TDEE, and macro calculations.
          </p>
          <div className="flex justify-center gap-3 flex-wrap">
            <button onClick={() => navigate('/goals')}
              className="px-6 py-3 rounded-full bg-brand-600 hover:bg-brand-500 text-white font-bold shadow-xl shadow-brand-600/20 transition flex items-center gap-2">
              Set Your Goal <ArrowRight size={18} />
            </button>
            <button onClick={() => navigate('/profile')}
              className="px-6 py-3 rounded-full bg-slate-800 hover:bg-slate-700 text-white font-bold transition border border-slate-700 flex items-center gap-2">
              <User size={18} /> Profile
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 text-center">
            <Activity className="text-brand-400 mx-auto mb-2" size={24} />
            <div className="text-xs text-slate-400">BMR</div>
            <div className="text-white font-bold text-lg">{bmr ?? '—'}</div>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 text-center">
            <Target className="text-brand-400 mx-auto mb-2" size={24} />
            <div className="text-xs text-slate-400">TDEE</div>
            <div className="text-white font-bold text-lg">{tdee ?? '—'}</div>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 text-center">
            <Calculator className="text-brand-400 mx-auto mb-2" size={24} />
            <div className="text-xs text-slate-400">Target</div>
            <div className="text-brand-400 font-bold text-lg">{target ?? '—'}</div>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 text-center">
            <Trophy className="text-brand-400 mx-auto mb-2" size={24} />
            <div className="text-xs text-slate-400">Goals</div>
            <button onClick={() => navigate('/goals')} className="text-brand-400 font-bold text-lg underline underline-offset-2">
              View →
            </button>
          </div>
        </div>

        {/* Today's Calorie/Macro Summary */}
        {!loading && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 mb-8">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Activity size={20} className="text-brand-400" /> Today's Summary
            </h3>
            <div className="space-y-4">
              {/* Calorie Progress */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-400">Calories: <b className="text-white">{todayConsumed}</b> / {goalCalories ?? '—'} kcal</span>
                  <span className="text-brand-400 font-bold">{progressPct}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-3">
                  <div className="bg-brand-500 h-3 rounded-full transition-all duration-700" style={{ width: `${goalCalories ? progressPct : 0}%` }} />
                </div>
                <div className="text-xs text-slate-500 mt-1">Net: {goalCalories ? (netCalories > 0 ? '+' : '') + netCalories : 0} kcal</div>
              </div>
              {/* Quick stats */}
              <div className="grid grid-cols-3 gap-3 text-center text-sm">
                <div className="bg-slate-950 rounded-xl p-3">
                  <div className="text-red-400 font-bold">{todayBurned} kcal</div>
                  <div className="text-xs text-slate-500">Burned</div>
                </div>
                <div className="bg-slate-950 rounded-xl p-3">
                  <div className="text-brand-400 font-bold">{goalCalories ? Math.max(0, goalCalories - todayConsumed) : '—'}</div>
                  <div className="text-xs text-slate-500">Remaining</div>
                </div>
                <div className="bg-slate-950 rounded-xl p-3">
                  <div className="text-blue-400 font-bold">{progressPct}%</div>
                  <div className="text-xs text-slate-500">Progress</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Demo Calculator */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Calculator size={20} className="text-brand-400" /> Quick Calculator
            </h3>
            <button onClick={handleDemoCalc}
              className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-bold transition">
              Calculate (Demo)
            </button>
          </div>
          <p className="text-slate-400 text-sm mb-3">
            Based on Mifflin-St Jeor equation. Enter your stats on the <a href="/goals" className="text-brand-400 underline">Goals</a> page for a personalized calculation.
          </p>
          {bmr && (
            <div className="bg-brand-900/20 border border-brand-600/20 rounded-xl p-4 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>BMR: <b className="text-white">{bmr} kcal/day</b></div>
              <div>TDEE: <b className="text-white">{tdee} kcal/day</b></div>
              <div>Muscle Gain Target: <b className="text-brand-400">{target} kcal/day</b></div>
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {[
            { icon: BarChart3, label: 'Progress', desc: 'Weight trends, body metrics', color: 'text-brand-400', href: '/progress' },
            { icon: Dumbbell, label: 'Daily', desc: 'Log food, exercise, water', color: 'text-yellow-400', href: '/daily' },
            { icon: Trophy, label: 'Badges', desc: 'Unlock achievements', color: 'text-purple-400', href: '/badges' },
          ].map(item => (
            <button key={item.label} onClick={() => navigate(item.href)}
              className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 text-left hover:border-slate-600 transition group">
              <item.icon size={24} className={`${item.color} mb-3`} />
              <div className="text-lg font-bold text-white mb-1 group-hover:text-brand-400 transition">{item.label}</div>
              <div className="text-sm text-slate-400">{item.desc}</div>
            </button>
          ))}
        </div>

        {/* Active Goals */}
        <GoalsDashboardQuick />
      </main>
    </>
  );
}

function GoalsDashboardQuick() {
  const { user, accessToken } = useAuthStore();
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken || !user?.id) { setLoading(false); return; }
    const uid = user.id;
    apiClient.getGoals(uid).then(data => {
      setGoals(Array.isArray(data) ? data : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [accessToken, user?.id]);

  if (loading) return null;
  if (goals.length === 0) return null;

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 mb-6">
      <h3 className="text-lg font-bold text-white mb-4">Active Goals</h3>
      <div className="grid md:grid-cols-2 gap-4">
        {goals.map((g: any) => (
          <div key={g.id} className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-brand-400 capitalize">{String(g.goal_type).replace(/_/g, ' ')}</span>
              <span className="text-xs font-semibold uppercase px-3 py-1 rounded-full bg-brand-600/20 text-brand-300">{g.status ?? 'active'}</span>
            </div>
            <div className="text-sm text-slate-400">
              Target: <b className="text-white">{g.target_value ?? g.target_calories} kcal/day</b>
              {g.protein_target && ` · P: ${g.protein_target}g · F: ${g.fat_target}g · C: ${g.carb_target}g`}
            </div>
            {g.target_date && <div className="text-xs text-slate-500 mt-1">Target date: {g.target_date}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const { accessToken, user } = useAuthStore();
  const [isAuth, setIsAuth] = useState(!!accessToken);

  useEffect(() => {
    // Re-check when store updates (persist rehydration)
    const interval = setInterval(() => {
      const state = useAuthStore.getState();
      setIsAuth(!!state.accessToken || !!state.user);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  function handleAuth() {
    setIsAuth(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleLogout() {
    useAuthStore.getState().logout();
    setIsAuth(false);
    window.location.href = '/';
  }

  if (!isAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-ink to-brand-950 text-slate-100 font-sans selection:bg-brand-500/30">
        <main><AuthPage onAuth={handleAuth} /></main>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-ink text-slate-100 font-sans selection:bg-brand-500/30">
        <nav className="sticky top-0 z-40 bg-ink/90 backdrop-blur-md border-b border-slate-800/60">
          <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
            <Link to="/" className="text-xl font-extrabold text-brand-400 tracking-tight">FitPulse</Link>
            <div className="hidden md:flex gap-6 text-sm font-medium text-slate-300 items-center">
              <Link to="/" className="hover:text-brand-400 transition">Home</Link>
              <Link to="/goals" className="hover:text-brand-400 transition">Goals</Link>
              <Link to="/daily" className="hover:text-brand-400 transition">Daily</Link>
              <Link to="/foods" className="hover:text-brand-400 transition">Foods</Link>
              <Link to="/exercises" className="hover:text-brand-400 transition">Exercises</Link>
              <Link to="/progress" className="hover:text-brand-400 transition">Progress</Link>
              <Link to="/badges" className="hover:text-brand-400 transition">Badges</Link>
              <Link to="/profile" className="hover:text-brand-400 transition flex items-center gap-1">
                <User size={14} /> Profile
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-600/20 text-red-300 hover:bg-red-600/30 border border-red-800/60 text-sm font-medium transition">
                <LogOut size={14} /> Logout
              </button>
            </div>
          </div>
        </nav>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/goals" element={<GoalsPage />} />
          <Route path="/daily" element={<DailyPage />} />
          <Route path="/foods" element={<FoodsPage />} />
          <Route path="/exercises" element={<ExercisesPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/badges" element={<BadgesPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
