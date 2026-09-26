import { Link, NavLink, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import {
  Activity, Target, Utensils, Dumbbell, BarChart3, Trophy, User, LogOut, Apple, CalendarDays,
} from 'lucide-react';
import { useAuthStore } from '../store/auth';

const NAV = [
  { to: '/', label: 'Today', icon: Activity, end: true },
  { to: '/daily', label: 'Log', icon: Utensils },
  { to: '/progress', label: 'Progress', icon: BarChart3 },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/goals', label: 'Goals', icon: Target },
  { to: '/foods', label: 'Foods', icon: Apple },
  { to: '/exercises', label: 'Workout', icon: Dumbbell },
  { to: '/badges', label: 'Badges', icon: Trophy },
  { to: '/profile', label: 'Profile', icon: User },
];

const MOBILE = [
  { to: '/', label: 'Today', icon: Activity, end: true },
  { to: '/daily', label: 'Log', icon: Utensils },
  { to: '/calendar', label: 'Cal', icon: CalendarDays },
  { to: '/goals', label: 'Goals', icon: Target },
  { to: '/profile', label: 'You', icon: User },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const name = user?.name || user?.email?.split('@')[0] || 'Athlete';

  function handleLogout() {
    useAuthStore.getState().logout();
    window.location.href = '/';
  }

  return (
    <div className="min-h-screen bg-ink text-slate-100 font-sans selection:bg-brand-500/30">
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-60 flex-col border-r border-slate-800/80 bg-[#0a1017]">
        <Link to="/" className="px-5 h-16 flex items-center gap-2.5 border-b border-slate-800/80">
          <span className="h-8 w-8 rounded-lg bg-brand-400 grid place-items-center text-slate-950 font-black text-sm">FP</span>
          <span className="text-lg font-extrabold tracking-tight text-white">FitPulse</span>
        </Link>
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {NAV.map((item) => {
            const active = item.end ? location.pathname === '/' : location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                  active
                    ? 'bg-brand-600/15 text-brand-400 border border-brand-600/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent'
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
        <div className="p-3 border-t border-slate-800/80">
          <div className="px-3 py-2 mb-2">
            <div className="text-sm font-semibold text-white truncate">{name}</div>
            <div className="text-xs text-slate-500 truncate">{user?.email}</div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-red-300 hover:bg-red-950/40 transition"
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>

      <header className="lg:hidden sticky top-0 z-40 h-14 bg-ink/90 backdrop-blur-md border-b border-slate-800/70 flex items-center justify-between px-4">
        <Link to="/" className="font-extrabold text-brand-400 tracking-tight">FitPulse</Link>
        <button onClick={handleLogout} className="text-slate-400 hover:text-red-300 p-2" aria-label="Sign out">
          <LogOut size={18} />
        </button>
      </header>

      <main className="lg:pl-60 pb-24 lg:pb-8">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8">{children}</div>
      </main>

      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-[#0a1017]/95 backdrop-blur-md border-t border-slate-800/80 pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5">
          {MOBILE.map((item) => {
            const active = item.end ? location.pathname === '/' : location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold ${
                  active ? 'text-brand-400' : 'text-slate-500'
                }`}
              >
                <item.icon size={20} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
