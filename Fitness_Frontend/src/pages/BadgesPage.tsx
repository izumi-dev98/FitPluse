import { useEffect, useState } from 'react';
import { Award, Trophy, Lock } from 'lucide-react';
import { apiClient } from '../lib/api';
import { useAuthStore } from '../store/auth';

export default function BadgesPage() {
  const [userId, setUserId] = useState('');
  const [badges, setBadges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [earnedFilter, setEarnedFilter] = useState<'all' | 'earned' | 'locked'>('all');

  async function loadBadges(uid: string) {
    try {
      const data = await apiClient.getBadges(uid);
      setBadges(Array.isArray(data) ? data : []);
    } catch {
      setBadges([]);
    }
    setLoading(false);
  }

  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!accessToken || !user?.id) return;
    setUserId(user.id);
    loadBadges(user.id);
  }, [accessToken, user?.id]);

  const earnedCount = badges.filter((b: any) => b.earned).length;
  const filtered = badges.filter(b => {
    if (earnedFilter === 'earned') return b.earned;
    if (earnedFilter === 'locked') return !b.earned;
    return true;
  });

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-16 text-center">
        <p className="text-slate-400">Loading badges...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-10">
      <h2 className="text-3xl font-extrabold text-white mb-2 flex items-center gap-2">
        <Trophy className="text-brand-400" /> Achievements
      </h2>
      <p className="text-slate-400 text-sm mb-6">Track your progress and unlock badges.</p>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {(['all', 'earned', 'locked'] as const).map(f => (
          <button key={f} onClick={() => setEarnedFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-bold capitalize transition ${
              earnedFilter === f ? 'bg-brand-600 text-white' : 'bg-slate-900/60 text-slate-400 hover:text-white'
            }`}>
            {f}
          </button>
        ))}
        <span className="ml-auto text-sm text-slate-500 self-center">
          {earnedCount}/{badges.length} earned
        </span>
      </div>

      {badges.length === 0 ? (
        <p className="text-slate-500 text-center py-8">No badges defined yet.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((b: any) => (
            <div key={b.id}
              className={`relative rounded-2xl p-6 text-center border transition ${
                b.earned
                  ? 'bg-brand-900/20 border-brand-600/30 shadow-lg shadow-brand-600/10'
                  : 'bg-slate-900/40 border-slate-800 opacity-60'
              }`}>
              {b.earned ? (
                <Award className="text-brand-400 mx-auto mb-3" size={36} />
              ) : (
                <Lock className="text-slate-600 mx-auto mb-3" size={36} />
              )}
              <div className={`font-bold text-sm ${b.earned ? 'text-white' : 'text-slate-500'}`}>
                {b.name}
              </div>
              <div className="text-xs text-slate-500 mt-1">{b.description}</div>
              {b.earned && (
                <div className="text-[10px] text-brand-400 mt-2 font-semibold uppercase">
                  Earned {b.earned_at ? new Date(b.earned_at).toLocaleDateString() : ''}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
