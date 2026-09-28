import { Link, NavLink, useLocation } from 'react-router-dom';
import { useState, type ReactNode, useEffect } from 'react';
import {
  LayoutDashboard,
  Flame,
  Apple,
  Dumbbell,
  BarChart3,
  Target,
  CalendarDays,
  Trophy,
  User,
  LogOut,
  Bell,
  Plus,
  History,
  ChevronDown,
} from 'lucide-react';
import { useAuthStore } from '../store/auth';
import { LanguageProvider, useLanguage, type Language } from '../lib/i18n';
import QuickLogModal from './QuickLogModal';

const MAIN_NAV = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/daily', label: 'Activity', icon: Flame },
  { to: '/foods', label: 'Nutrition', icon: Apple },
  { to: '/exercises', label: 'Workouts', icon: Dumbbell },
  { to: '/progress', label: 'Progress', icon: BarChart3 },
  { to: '/goals', label: 'Goals', icon: Target },
];

const EXTRA_NAV = [
  { to: '/history', label: 'History', icon: History },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/badges', label: 'Badges', icon: Trophy },
  { to: '/profile', label: 'Profile', icon: User },
];

// Mobile bottom bar shows 5 tabs — everything else lives under "More".
const MORE_NAV = [
  { to: '/foods', label: 'Nutrition', icon: Apple },
  { to: '/exercises', label: 'Workouts', icon: Dumbbell },
  { to: '/progress', label: 'Progress', icon: BarChart3 },
  { to: '/history', label: 'History', icon: History },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/badges', label: 'Badges', icon: Trophy },
  { to: '/profile', label: 'Profile', icon: User },
];
const MORE_PATHS = MORE_NAV.map((i) => i.to);

function ShellContent({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { language, setLanguage, t: label } = useLanguage();
  const user = useAuthStore((s) => s.user);
  const name = user?.name || user?.email?.split('@')[0] || '';
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const [quickLogOpen, setQuickLogOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  // Close "More" dropdown when route changes
  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);

  function handleLogout() {
    useAuthStore.getState().logout();
    window.location.href = '/';
  }

  return (
    <div className="min-h-screen bg-ink text-slate-100 font-sans selection:bg-brand-400/30">
      {/* ========================================================= */}
      {/* 1. DESKTOP SIDEBAR (>= 1024px)                            */}
      {/* ========================================================= */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col border-r border-panel-border bg-[#090d16] z-30">
        {/* Brand Logo */}
        <Link to="/" className="px-6 h-20 flex items-center gap-3 border-b border-panel-border">
          <div className="w-9 h-9 rounded-xl bg-brand-400 text-ink font-black flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-ink stroke-[3]">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <span className="text-xl font-black tracking-tight text-white block leading-none">FitPulse</span>
            <span className="text-[10px] font-bold text-brand-400">Performance OS</span>
          </div>
        </Link>

        {/* Navigation */}
        <div className="flex-1 px-4 py-5 space-y-6 overflow-y-auto">
          {/* Main Workspace section */}
          <div>
            <div className="px-3 mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Workspace
            </div>
            <nav className="space-y-1">
              {MAIN_NAV.map((item) => {
                const active = item.end ? location.pathname === '/' : location.pathname.startsWith(item.to);
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition relative group ${
                      active
                        ? 'bg-brand-400/10 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-brand-400 rounded-r-full" />
                    )}
                    <item.icon
                      size={18}
                      className={active ? 'text-brand-400' : 'text-slate-400 group-hover:text-white transition'}
                    />
                    <span>{label(item.label)}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>

          {/* Secondary section */}
          <div>
            <div className="px-3 mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Tools & Stats
            </div>
            <nav className="space-y-1">
              {EXTRA_NAV.map((item) => {
                const active = location.pathname.startsWith(item.to);
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition group ${
                      active
                        ? 'bg-brand-400/10 text-white'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <item.icon
                      size={18}
                      className={active ? 'text-brand-400' : 'text-slate-400 group-hover:text-white transition'}
                    />
                    <span>{label(item.label)}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>
        </div>

        {/* User Profile Footer */}
        <div className="p-4 border-t border-panel-border bg-ink space-y-3">
          {/* Language Switch */}
          <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-ink border border-panel-border">
            <span className="text-[11px] font-semibold text-slate-400">Language</span>
            <div className="flex rounded-lg bg-black/40 p-0.5" role="group">
              {(['en', 'my'] as Language[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setLanguage(option)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                    language === option ? 'bg-brand-400 text-ink' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {option === 'en' ? 'EN' : 'မြန်မာ'}
                </button>
              ))}
            </div>
          </div>

          {/* User Row */}
          <div className="flex items-center justify-between">
            <Link to="/profile" className="flex items-center gap-3 overflow-hidden group">
              <div className="w-10 h-10 rounded-full bg-brand-400 text-ink font-black text-sm flex items-center justify-center ring-2 ring-brand-500/30 shrink-0">
                {initials}
              </div>
              <div className="overflow-hidden">
                <div className="text-sm font-bold text-white truncate group-hover:text-brand-400 transition">
                  {name}
                </div>
                <div className="text-[11px] text-slate-400 truncate flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-400" />
                  <span>Active</span>
                </div>
              </div>
            </Link>

            <button
              onClick={handleLogout}
              className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition shrink-0"
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* ========================================================= */}
      {/* 2. TABLET TOP BAR (768px - 1023px, md: to lg:)            */}
      {/* ========================================================= */}
      <header className="hidden md:flex lg:hidden sticky top-0 z-40 h-16 bg-ink border-b border-panel-border items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-brand-400 text-ink font-black flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-ink stroke-[3]">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-lg font-black tracking-tight text-white">FitPulse</span>
        </Link>

        {/* Quick Nav Links on Tablet */}
        <nav className="flex items-center gap-1">
          {MAIN_NAV.slice(0, 4).map((item) => {
            const active = item.end ? location.pathname === '/' : location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  active ? 'bg-brand-400/10 text-brand-400' : 'text-slate-400 hover:text-white'
                }`}
              >
                <item.icon size={15} />
                <span>{label(item.label)}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Actions & Avatar */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setQuickLogOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-brand-400 hover:bg-brand-300 text-ink font-extrabold text-xs transition flex items-center gap-1"
          >
            <Plus size={14} className="stroke-[3]" />
            <span>Quick Log</span>
          </button>

          <button
            onClick={() => alert('No new notifications')}
            className="p-2 rounded-xl text-slate-400 hover:text-white bg-ink border border-panel-border"
          >
            <Bell size={16} />
          </button>

          <Link to="/profile" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-brand-400 text-ink font-bold text-xs flex items-center justify-center ring-2 ring-brand-500/30">
              {initials}
            </div>
          </Link>
        </div>
      </header>

      {/* ========================================================= */}
      {/* 3. MOBILE TOP BAR (< 768px)                               */}
      {/* ========================================================= */}
      <header className="md:hidden sticky top-0 z-40 h-14 bg-ink border-b border-panel-border flex items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-brand-400 text-ink font-black flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-ink stroke-[3]">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="font-black text-white text-base tracking-tight">FitPulse</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setQuickLogOpen(true)}
            className="p-2 rounded-xl bg-brand-400 text-ink font-bold flex items-center justify-center"
            title="Quick Log"
          >
            <Plus size={16} className="stroke-[3]" />
          </button>
          <button
            onClick={() => alert('No new notifications')}
            className="p-2 rounded-xl text-slate-400 hover:text-white bg-ink border border-panel-border"
          >
            <Bell size={16} />
          </button>
          <Link to="/profile">
            <div className="w-8 h-8 rounded-full bg-brand-400 text-ink font-bold text-xs flex items-center justify-center ring-1 ring-blue-400/30">
              {initials}
            </div>
          </Link>
        </div>
      </header>

      {/* ========================================================= */}
      {/* 4. MAIN CONTENT AREA (Responsive Margins & Padding)        */}
      {/* ========================================================= */}
      <main className="lg:pl-64 pb-36 lg:pb-12 min-h-screen">
        <div className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-7 pb-4 lg:pb-0">
          {children}
        </div>
      </main>

      {/* ========================================================= */}
      {/* 5. MOBILE BOTTOM NAVIGATION (< 1024px)                     */}
      {/* 5 tabs fit small screens — the rest live under "More"     */}
      {/* ========================================================= */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-ink border-t border-panel-border pb-[env(safe-area-inset-bottom)] shadow-xl">
        <div className="grid grid-cols-5 items-center max-w-md mx-auto relative px-2 py-1">
          {/* Tab 1: Overview */}
          <Link
            to="/"
            className={`flex flex-col items-center gap-1 py-2 text-[10px] font-bold transition ${
              location.pathname === '/' ? 'text-brand-400' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <LayoutDashboard size={20} />
            <span>Overview</span>
          </Link>

          {/* Tab 2: Activity */}
          <Link
            to="/daily"
            className={`flex flex-col items-center gap-1 py-2 text-[10px] font-bold transition ${
              location.pathname.startsWith('/daily') ? 'text-brand-400' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Flame size={20} />
            <span>Activity</span>
          </Link>

          {/* Tab 3: (+) Quick Log (center elevated) */}
          <div className="flex flex-col items-center justify-center -mt-6">
            <button
              onClick={() => setQuickLogOpen(true)}
              className="w-13 h-13 rounded-full bg-brand-400 hover:bg-brand-300 text-ink font-black flex items-center justify-center border-4 border-[#090d16] active:scale-95 transition"
              aria-label="Quick Log"
            >
              <Plus size={24} className="stroke-[3]" />
            </button>
            <span className="text-[9px] font-bold text-slate-400 mt-0.5">Log</span>
          </div>

          {/* Tab 4: Goals */}
          <Link
            to="/goals"
            className={`flex flex-col items-center gap-1 py-2 text-[10px] font-bold transition ${
              location.pathname.startsWith('/goals') ? 'text-brand-400' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Target size={20} />
            <span>Goals</span>
          </Link>

          {/* Tab 5: More — every other page lives here */}
          <div className="relative">
            <button
              onClick={() => setMoreOpen(!moreOpen)}
              className={`flex flex-col items-center gap-1 py-2 text-[10px] font-bold transition w-full ${
                moreOpen || MORE_PATHS.some((p) => location.pathname.startsWith(p))
                  ? 'text-brand-400'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <ChevronDown size={20} />
              <span>More</span>
            </button>
            {moreOpen && (
              <div className="absolute bottom-full right-0 mb-2 w-52 max-h-[60vh] overflow-y-auto bg-panel-card border border-panel-border rounded-2xl shadow-xl overflow-hidden z-50">
                {MORE_NAV.map((item, i) => {
                  const active = location.pathname.startsWith(item.to);
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setMoreOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 text-sm font-semibold transition ${
                        i > 0 ? 'border-t border-panel-border' : ''
                      } ${
                        active ? 'bg-brand-400/10 text-brand-400' : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <item.icon size={16} />
                      <span>{label(item.label)}</span>
                    </NavLink>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Global Modals accessible anywhere */}
      <QuickLogModal open={quickLogOpen} onClose={() => setQuickLogOpen(false)} />
    </div>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      <ShellContent>{children}</ShellContent>
    </LanguageProvider>
  );
}
