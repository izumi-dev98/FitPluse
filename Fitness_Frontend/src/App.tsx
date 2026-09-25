import { useState } from 'react';
import ProfileSection from './components/ProfileSection';
import Calculator from './components/Calculator';
import Goals from './components/Goals';
import Modal from './components/Modal';
import { Menu } from 'lucide-react';

export default function App() {
  const [navOpen, setNavOpen] = useState(false);
  return (
    <div className="min-h-screen bg-ink text-slate-100 font-sans selection:bg-brand-500/30">
      <nav className="sticky top-0 z-40 bg-ink/90 backdrop-blur-md border-b border-slate-800/60">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="#" className="text-xl font-extrabold text-brand-400 tracking-tight">FitPulse</a>
          <div className="hidden md:flex gap-6 text-sm font-medium text-slate-300">
            <a href="#profile" className="hover:text-brand-400 transition">Profile</a>
            <a href="#calculator" className="hover:text-brand-400 transition">Calculator</a>
            <a href="#goals" className="hover:text-brand-400 transition">Goals</a>
          </div>
          <button className="md:hidden" onClick={() => setNavOpen(!navOpen)} aria-label="Menu"><Menu /></button>
        </div>
        {navOpen && (
          <div className="md:hidden bg-slate-900 border-t border-slate-800 px-6 py-4 space-y-3 text-sm font-medium">
            <a href="#profile" onClick={() => setNavOpen(false)} className="block hover:text-brand-400">Profile</a>
            <a href="#calculator" onClick={() => setNavOpen(false)} className="block hover:text-brand-400">Calculator</a>
            <a href="#goals" onClick={() => setNavOpen(false)} className="block hover:text-brand-400">Goals</a>
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
        <ProfileSection />
        <Calculator />
        <Goals />
      </main>

      <footer className="border-t border-slate-800/60 bg-slate-950/50 py-10 text-center text-slate-500 text-sm">
        <p>Fitness Backend API connected at <code className="text-brand-400">http://localhost:3000</code></p>
        <p className="mt-2">Built with React, Tailwind, TanStack Query, Zustand, Zod & SweetAlert2</p>
      </footer>

      <Modal />
    </div>
  );
}