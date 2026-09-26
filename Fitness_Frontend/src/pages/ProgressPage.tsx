import { useMemo, useState } from 'react';
import { TrendingUp, Scale, Calculator, Info, RefreshCw, Target } from 'lucide-react';
import { PageHeader, Card } from '../components/ui';
import { apiClient } from '../lib/api';
import { useAuthStore } from '../store/auth';
import { useQueryClient } from '@tanstack/react-query';
import { qk, useGoals, useProfile, useWeightHistory } from '../lib/queries';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';

export default function ProgressPage() {
  const user = useAuthStore((s) => s.user);
  const uid = user?.id;
  const qc = useQueryClient();

  // Shared cached queries — revisits render instantly with no refetch.
  const weightsQ = useWeightHistory(uid);
  const profileQ = useProfile();
  const goalsQ = useGoals(uid);
  const goals = goalsQ.data ?? [];
  const profile = profileQ.data ?? null;
  const loading = weightsQ.isLoading || profileQ.isLoading || goalsQ.isLoading;

  const weightHistory = useMemo(
    () =>
      [...(weightsQ.data ?? [])].sort(
        (a: any, b: any) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime(),
      ),
    [weightsQ.data],
  );

  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleLogWeight(e: React.FormEvent) {
    e.preventDefault();
    if (!uid) return;
    setSaving(true);
    setError('');
    try {
      await apiClient.createWeightHistory?.({
        user_id: uid,
        weight: Number(weight),
        body_fat: Number(bodyFat) || null,
      });
      qc.invalidateQueries({ queryKey: qk.weights(uid) });
      setWeight('');
      setBodyFat('');
    } catch (err: any) {
      setError('Failed to log weight.');
    }
    setSaving(false);
  }

  // Calculate averages and adjustments
  const sorted = [...weightHistory].sort((a: any, b: any) =>
    new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
  );
  const last7 = sorted.slice(0, 7);
  const prev7 = sorted.slice(7, 14);
  const avgWeight = last7.length ? Math.round((last7.reduce((s: any, w: any) => s + Number(w.weight), 0) / last7.length) * 10) / 10 : null;
  const prevAvgWeight = prev7.length ? Math.round((prev7.reduce((s: any, w: any) => s + Number(w.weight), 0) / prev7.length) * 10) / 10 : null;
  const weightDiff = avgWeight && prevAvgWeight ? Math.round((avgWeight - prevAvgWeight) * 10) / 10 : null;

  // Weekly progress adjustment
  const activeGoal = goals.length > 0 ? goals[goals.length - 1] : null;
  const goalType = activeGoal?.goal_type;
  const targetCalories = activeGoal?.target_calories;

  let adjustment = '';
  if (last7.length >= 7 && activeGoal && targetCalories) {
    if (goalType === 'weight_gain' || goalType === 'skinny_to_fit') {
      if (weightDiff && weightDiff <= 0) {
        adjustment = `📈 Weight not increasing! Increase calories by +10% → target: ${Math.round(targetCalories * 1.1)} kcal`;
      } else if (weightDiff && weightDiff > 0.5) {
        adjustment = `⚡ Weight increasing too fast! Reduce surplus → target: ${Math.round(targetCalories * 0.95)} kcal`;
      } else {
        adjustment = `✅ On track! Keep current target: ${targetCalories} kcal`;
      }
    } else if (goalType === 'weight_loss' || goalType === 'fat_loss') {
      if (weightDiff && weightDiff >= 0) {
        adjustment = `📉 Weight not decreasing! Increase deficit → target: ${Math.round(targetCalories * 0.9)} kcal`;
      } else if (weightDiff && weightDiff < -1) {
        adjustment = `⚡ Losing too fast! Increase calories → target: ${Math.round(targetCalories * 1.05)} kcal`;
      } else {
        adjustment = `✅ On track! Keep current target: ${targetCalories} kcal`;
      }
    } else {
      adjustment = `ℹ️ Maintain goal — current weight trend: ${weightDiff !== null ? (weightDiff > 0 ? '+' : '') + weightDiff + ' kg' : 'stable'}`;
    }
  } else if (last7.length >= 7) {
    adjustment = `📊 ${last7.length} days tracked. Set a goal for personalized adjustment guidance.`;
  }

  // Chart data
  const chartData = sorted.slice(0, 14).map((w: any) => ({
    date: new Date(w.recorded_at).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
    weight: Number(w.weight),
  }));

  if (loading) {
    return (
      <div className="py-16 text-center">
        <p className="text-slate-400">Loading progress...</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Progress"
        subtitle="Weight trend, weekly change, and calorie adjustment hints."
        icon={TrendingUp}
      />

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card className="text-center">
          <Scale className="text-brand-400 mx-auto mb-2" size={22} />
          <div className="text-xs text-slate-400">Latest Weight</div>
          <div className="text-white font-bold text-xl">{sorted.length ? `${sorted[0].weight} kg` : '—'}</div>
        </Card>
        <Card className="text-center">
          <Calculator className="text-brand-400 mx-auto mb-2" size={22} />
          <div className="text-xs text-slate-400">7-Day Avg</div>
          <div className="text-white font-bold text-xl">{avgWeight ?? '—'} kg</div>
        </Card>
        <Card className="text-center">
          <Target className="text-brand-400 mx-auto mb-2" size={22} />
          <div className="text-xs text-slate-400">BMR</div>
          <div className="text-white font-bold text-xl">{profile?.bmr ?? '—'}</div>
        </Card>
        <Card className="text-center">
          <Info className="text-brand-400 mx-auto mb-2" size={22} />
          <div className="text-xs text-slate-400">TDEE</div>
          <div className="text-white font-bold text-xl">{profile?.tdee ?? '—'}</div>
        </Card>
      </div>

      {/* Weekly Adjustment */}
      {adjustment && (
        <div className={`rounded-2xl p-5 mb-6 border ${
          adjustment.includes('✅') ? 'bg-green-900/15 border-green-600/20' :
          adjustment.includes('⚡') ? 'bg-yellow-900/15 border-yellow-600/20' :
          adjustment.includes('📈') || adjustment.includes('📉') ? 'bg-red-900/15 border-red-600/20' :
          'bg-slate-900/40 border-slate-700'
        }`}>
          <div className="flex items-start gap-3">
            <RefreshCw size={20} className={`mt-1 ${
              adjustment.includes('✅') ? 'text-green-400' :
              adjustment.includes('⚡') ? 'text-yellow-400' :
              adjustment.includes('📈') || adjustment.includes('📉') ? 'text-red-400' :
              'text-brand-400'
            }`} />
            <div>
              <h3 className="text-lg font-bold text-white mb-1">Weekly Progress Adjustment</h3>
              <p className="text-slate-300 text-sm">{adjustment}</p>
            </div>
          </div>
        </div>
      )}

      {/* Weight trend comparison */}
      {last7.length >= 2 && (
        <div className="bg-brand-900/15 border border-brand-600/20 rounded-2xl p-5 mb-6">
          <h3 className="text-lg font-bold text-white mb-2">Weekly Trend</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-slate-400">Current 7-Day Avg</div>
              <div className="text-brand-400 font-bold text-lg">{avgWeight} kg</div>
            </div>
            <div>
              <div className="text-slate-400">Previous 7-Day Avg</div>
              <div className="text-white font-bold text-lg">{prevAvgWeight} kg</div>
            </div>
            <div>
              <div className="text-slate-400">Change</div>
              <div className={`font-bold text-lg ${weightDiff && weightDiff > 0 ? 'text-green-400' : weightDiff && weightDiff < 0 ? 'text-red-400' : 'text-white'}`}>
                {weightDiff !== null ? (weightDiff > 0 ? '+' : '') + weightDiff + ' kg' : '—'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Weight Chart */}
      {sorted.length >= 2 && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 mb-6">
          <h3 className="text-lg font-bold text-white mb-4">Weight Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', color: '#f8fafc' }} />
              <Line type="monotone" dataKey="weight" stroke="#65a30d" strokeWidth={3} dot={{ fill: '#65a30d', r: 5 }} activeDot={{ r: 8 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Log weight */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 mb-6">
        <h3 className="text-lg font-bold text-white mb-4">Log Weight</h3>
        <form onSubmit={handleLogWeight} className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Weight (kg)</label>
            <input type="number" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} required
              className="w-full p-3 rounded-xl bg-ink border border-slate-700 text-white focus:outline-none focus:border-brand-500" />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Body Fat %</label>
            <input type="number" step="0.1" value={bodyFat} onChange={e => setBodyFat(e.target.value)}
              className="w-full p-3 rounded-xl bg-ink border border-slate-700 text-white focus:outline-none focus:border-brand-500" />
          </div>
          <div className="col-span-2 md:col-span-1">
            <button type="submit" disabled={saving}
              className="w-full py-3 rounded-xl bg-brand-400 hover:bg-brand-300 text-slate-950 font-bold transition disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? 'Saving...' : 'Log Weight'}
            </button>
          </div>
        </form>
        {error && <div className="text-red-400 text-sm mt-2">{error}</div>}
      </div>

      {/* Weight History */}
      <div>
        <h3 className="text-lg font-bold text-white mb-3">Weight History</h3>
        {sorted.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-4">No weight entries yet. Log your weight above.</p>
        ) : (
          <div className="grid gap-2">
            {sorted.slice(0, 20).map((w, i) => (
              <div key={w.id ?? i} className="flex items-center justify-between bg-slate-900/40 border border-slate-800 rounded-xl px-5 py-3">
                <div className="flex items-center gap-3">
                  <Scale size={16} className="text-brand-400" />
                  <div>
                    <div className="text-white font-medium">{w.weight} kg</div>
                    <div className="text-xs text-slate-500">
                      {new Date(w.recorded_at).toLocaleDateString()}
                      {w.body_fat ? ` · Body Fat: ${w.body_fat}%` : ''}
                    </div>
                  </div>
                </div>
                {i === 0 && <span className="text-xs bg-brand-600/20 text-brand-300 px-2 py-1 rounded-full">Latest</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
