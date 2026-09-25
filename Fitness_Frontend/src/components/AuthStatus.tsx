import { useState, useEffect } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function AuthStatus() {
  const [user, setUser] = useState<any>(null);
  const [branch] = useState('izumi');
  const [loading, setLoading] = useState(true);

  async function fetchMe() {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${API}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user || data.profile || data);
      }
    } catch (e) { /* ignore */ }
    setLoading(false);
  }

  useEffect(() => {
    fetchMe();
  }, []);

  return (
    <section className="max-w-3xl mx-auto py-10 px-6" id="auth-status">
      <h2 className="text-2xl font-extrabold mb-4 text-brand-400">Auth & Branch Status</h2>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h3 className="font-bold text-slate-200 mb-2">Current Branch</h3>
          <div className="text-2xl font-mono text-brand-400">{branch}</div>
          <p className="text-xs text-slate-500 mt-1">From git branch</p>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h3 className="font-bold text-slate-200 mb-2">Current User (via /me)</h3>
          {loading ? (
            <div className="text-slate-400">Checking token...</div>
          ) : user ? (
            <div>
              <div className="text-brand-400 font-medium">{user.email || user.name || 'Authenticated'}</div>
              <div className="text-xs text-slate-400">{user.id ? `id: ${user.id}` : ''}</div>
            </div>
          ) : (
            <div className="text-slate-400">Not logged in (no access_token in localStorage)</div>
          )}
        </div>
      </div>
      <div className="mt-6 text-sm text-slate-500">
        <strong>Backend endpoints:</strong> <code>/api/auth/signup</code>, <code>/api/auth/login</code>, <code>/api/auth/me</code>, <code>/api/auth/refresh</code>
      </div>
      <button onClick={() => { localStorage.removeItem('access_token'); localStorage.removeItem('refresh_token'); window.location.reload(); }} className="mt-4 px-4 py-2 rounded-lg bg-red-600/20 text-red-300 hover:bg-red-600/30 border border-red-800/60 text-sm">Logout (clear tokens)</button>
    </section>
  );
}
