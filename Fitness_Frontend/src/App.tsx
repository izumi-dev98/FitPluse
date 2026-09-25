import { useState, useEffect } from 'react';
import ProfileSection from './components/ProfileSection';
import Calculator from './components/Calculator';
import Goals from './components/Goals';
import Modal from './components/Modal';
import AuthPage from './components/AuthPage';
import AuthStatus from './components/AuthStatus';
import { Menu, LogOut } from 'lucide-react';

export default function App() {
  const [navOpen, setNavOpen] = useState(false);
  const [isAuth, setIsAuth] = useState(!!localStorage.getItem('access_token'));

  useEffect(() => {
    const onStorage = () => setIsAuth(!!localStorage.getItem('access_token'));
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  function handleAuth() {
    setIsAuth(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleLogout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setIsAuth(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (!isAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-ink to-brand-950 text-slate-100 font-sans selection:bg-brand-500/30">
        <main>
          <AuthPage onAuth={handleAuth} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink text-slate-100 font-sans selection:bg-brand-500/30">
      <nav className="sticky top-0 z-40 bg-ink/90 backdrop-blur-md border-b border-slate-800/60">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="#" className="text-xl font-extrabold text-brand-400 tracking-tight">FitPulse</a>
          <div className="hidden md:flex gap-6 text-sm font-medium text-slate-300 items-center">
            <a href="#profile" className="hover:text-brand-400 transition">Profile</a>
            <a href="#calculator" className="hover:text-brand-400 transition">Calculator</a>
            <a href="#goals" className="hover:text-brand-400 transition">Goals</a>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-600/20 text-red-300 hover:bg-red-600/30 border border-red-800/60 text-sm font-medium transition"><LogOut size={14} /> Logout</button>
            <button className="md:hidden" onClick={() => setNavOpen(!navOpen)} aria-label="Menu"><Menu /></button>
          </div>
        </div>
        {navOpen && (
          <div className="md:hidden bg-slate-900 border-t border-slate-800 px-6 py-4 space-y-3 text-sm font-medium">
            <a href="#profile" onClick={() => setNavOpen(false)} className="block hover:text-brand-400">Profile</a>
            <a href="#calculator" onClick={() => setNavOpen(false)} className="block hover:text-brand-400">Calculator</a>
            <a href="#goals" onClick={() => setNavOpen(false)} className="block hover:text-brand-400">Goals</a>
            <button onClick={() => { setNavOpen(false); handleLogout(); }} className="block text-red-300">Logout</button>
          </div>
        )}
      </nav>

      <header className="relative overflow-hidden bg-gradient-to-br from-brand-900/40 to-ink">
        <div className="max-w-5xl mx-auto px-6 py-24 md:py-32 text-center">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-6 leading-tight">Calorie & Goal <span className="text-brand-400">Theory</span></h1>
          <p className="text-lg md:text-2xl text-slate-300 max-w-2xl mx-auto mb-10">BMR, TDEE, Macro targets, and progress tracking — built with your Supabase backend.</p>
          <div className="flex justify-center gap-3">
            <a href="#profile" className="px-6 py-3 rounded-full bg-brand-600 hover:bg-brand-500 text-white font-bold shadow-xl shadow-brand-600/20 transition">Get Started</a>
            <a href="#calculator" className="px-6 py-3 rounded-full bg-slate-800 hover:bg-slate-700 text-white font-bold transition border border-slate-700">Calculate</a>
          </div>
        </div>
      </header>

      <main>
        <AuthStatus />
        <ProfileSection />
        <Calculator />
        <Goals />
      </main>

      <footer className="border-t border-slate-800/60 bg-slate-950/50 py-6 text-center text-slate-600 text-xs">
        <p>FitPulse</p>
      </footer>

      <Modal />
    </div>
  );
}
