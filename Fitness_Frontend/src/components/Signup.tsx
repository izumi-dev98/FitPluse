import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../store/auth';

export default function Signup({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [name, setName] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const signup = useAuthStore((s) => s.signup);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await signup(email, password, name);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Network error');
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-1.5">Name</label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full rounded-xl px-4 py-3 bg-ink border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/60 focus:border-brand-500 transition"
          placeholder="Your name"
        />
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full rounded-xl px-4 py-3 bg-ink border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/60 focus:border-brand-500 transition"
          placeholder="you@example.com"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
        <div className="relative">
          <input
            id="password"
            type={showPass ? 'text' : 'password'}
            required
            minLength={6}
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full rounded-xl px-4 py-3 pr-10 bg-ink border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/60 focus:border-brand-500 transition"
            placeholder="Min 6 characters"
          />
          <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition" aria-label="Toggle password">
            {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>
      <div>
        <label htmlFor="confirm" className="block text-sm font-medium text-slate-300 mb-1.5">Confirm Password</label>
        <div className="relative">
          <input
            id="confirm"
            type={showConfirm ? 'text' : 'password'}
            required
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            className="w-full rounded-xl px-4 py-3 pr-10 bg-ink border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/60 focus:border-brand-500 transition"
            placeholder="Re-enter password"
          />
          <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition" aria-label="Toggle confirm password">
            {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>
      {error && <div className="text-red-400 text-sm font-medium">{error}</div>}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-xl bg-brand-400 hover:bg-brand-300 text-slate-950 font-bold shadow-lg shadow-brand-400/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Creating...' : 'Sign Up'}
      </button>
    </form>
  );
}
