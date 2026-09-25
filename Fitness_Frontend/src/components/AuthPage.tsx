import { useState } from 'react';
import Login from './Login';
import Signup from './Signup';

export default function AuthPage({ onAuth }: { onAuth: () => void }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-ink to-brand-950 px-4 py-12">
      <div className="w-full max-w-md bg-slate-900/70 backdrop-blur-xl border border-slate-700/60 rounded-3xl shadow-2xl shadow-brand-900/20 overflow-hidden">
        <div className="p-8 md:p-10">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-2">FitPulse</h1>
            <p className="text-slate-400 text-sm md:text-base">{mode === 'login' ? 'Welcome back! Sign in to your account.' : 'Create a new account and get started.'}</p>
          </div>

          <div className="transition-all duration-300">
            {mode === 'login' ? <Login onSuccess={onAuth} /> : <Signup onSuccess={onAuth} />}
          </div>

          <div className="mt-6 text-center text-sm text-slate-500">
            {mode === 'login' ? (
              <>
                No account?{" "}
                <button onClick={() => setMode('signup')} className="text-brand-400 hover:text-brand-300 font-medium underline underline-offset-2">Create one</button>
              </>
            ) : (
              <>
                Already have one?{" "}
                <button onClick={() => setMode('login')} className="text-brand-400 hover:text-brand-300 font-medium underline underline-offset-2">Log in</button>
              </>
            )}
          </div>
        </div>

       
      </div>
    </div>
  );
}
