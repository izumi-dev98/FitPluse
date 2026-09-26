import { useState } from 'react';
import Login from './Login';
import Signup from './Signup';

export default function AuthPage({ onAuth }: { onAuth: () => void }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink px-4 py-12">
      <div className="w-full max-w-md bg-panel/90 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
        <div className="p-8 md:p-10">
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 h-11 w-11 rounded-xl bg-brand-600 grid place-items-center text-white font-black">FP</div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">FitPulse</h1>
            <p className="text-slate-400 text-sm">{mode === 'login' ? 'Sign in to track calories, workouts, and progress.' : 'Create an account and start logging today.'}</p>
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
