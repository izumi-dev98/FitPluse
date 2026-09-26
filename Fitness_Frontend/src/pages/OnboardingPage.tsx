import { useState } from 'react';
import {
  Activity,
  Armchair,
  ArrowLeft,
  ArrowRight,
  Check,
  Flame,
  Footprints,
  Loader2,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { useAuthStore } from '../store/auth';
import { qk, useProfile } from '../lib/queries';
import { ageFromDob, todayISO } from '../lib/format';

// A profile counts as onboarded once the fields the app depends on
// (targets, BMR/TDEE, dashboard stats) are all filled. Age may come from
// dob (preferred) or the legacy age column.
export const isProfileComplete = (p: any) => {
  const hasAge =
    (p?.dob && ageFromDob(p.dob) !== null) ||
    (p?.age !== null && p?.age !== undefined && p?.age !== '');
  return (
    !!p &&
    hasAge &&
    p.height !== null && p.height !== undefined && p.height !== '' &&
    p.weight !== null && p.weight !== undefined && p.weight !== '' &&
    !!p.gender &&
    !!p.activity_level
  );
};

const ACTIVITY_OPTIONS: { value: string; label: string; hint: string; icon: LucideIcon }[] = [
  { value: 'sedentary', label: 'Sedentary', hint: 'Desk job, little exercise', icon: Armchair },
  { value: 'lightly_active', label: 'Lightly active', hint: 'Light walks 1–3 days/week', icon: Footprints },
  { value: 'moderately_active', label: 'Moderately active', hint: 'Workouts 3–5 days/week', icon: Activity },
  { value: 'very_active', label: 'Very active', hint: 'Hard training 6–7 days/week', icon: Flame },
  { value: 'extremely_active', label: 'Extremely active', hint: 'Athlete / physical job', icon: Zap },
];

const STEPS = ['Basics', 'Body', 'Activity', 'Review'];

const inputCls =
  'w-full p-3 rounded-xl bg-ink border border-slate-700 text-white focus:outline-none focus:border-brand-500';

export default function OnboardingPage({ onDone, onSkip }: { onDone: () => void; onSkip: () => void }) {
  const user = useAuthStore((s) => s.user);
  const { data: profile } = useProfile();
  const qc = useQueryClient();

  const [step, setStep] = useState(0);
  const [name, setName] = useState(profile?.name || user?.name || '');
  const [dob, setDob] = useState(profile?.dob ? String(profile.dob).slice(0, 10) : '');
  const [gender, setGender] = useState(profile?.gender || '');
  const [height, setHeight] = useState(profile?.height ? String(profile.height) : '');
  const [weight, setWeight] = useState(profile?.weight ? String(profile.weight) : '');
  const [activity, setActivity] = useState(profile?.activity_level || '');
  const [fieldError, setFieldError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [saving, setSaving] = useState(false);

  function validate(s: number): boolean {
    setFieldError('');
    if (s === 0) {
      if (!name.trim()) return setFieldError('Please enter your name.'), false;
      const a = ageFromDob(dob);
      if (!dob || a === null) return setFieldError('Enter a valid date of birth (age 10–120).'), false;
      if (!gender) return setFieldError('Please choose an option.'), false;
    }
    if (s === 1) {
      const h = Number(height);
      const w = Number(weight);
      if (!height || !Number.isFinite(h) || h < 100 || h > 250) return setFieldError('Height must be between 100 and 250 cm.'), false;
      if (!weight || !Number.isFinite(w) || w < 25 || w > 300) return setFieldError('Weight must be between 25 and 300 kg.'), false;
    }
    if (s === 2 && !activity) return setFieldError('Pick the level closest to your week.'), false;
    return true;
  }

  function next() {
    if (validate(step)) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  async function finish() {
    if (!validate(0) || !validate(1) || !validate(2)) {
      setStep(!name.trim() || !dob || !gender ? 0 : !height || !weight ? 1 : 2);
      return;
    }
    if (!profile?.id) {
      setSubmitError('Profile is not ready yet. Please re-login and try again.');
      return;
    }
    setSaving(true);
    setSubmitError('');
    try {
      await apiClient.updateProfile(profile.id, {
        name: name.trim(),
        dob,
        age: ageFromDob(dob),
        height_cm: Number(height),
        weight_kg: Number(weight),
        gender,
        activity_level: activity,
      });
      await qc.invalidateQueries({ queryKey: qk.profile() });
      onDone();
    } catch (err: any) {
      setSubmitError(err.message || 'Could not save. Please try again.');
    }
    setSaving(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <p className="text-brand-400 text-sm font-semibold mb-1">Welcome to FitPulse</p>
          <h1 className="text-3xl font-display font-semibold uppercase tracking-wide text-white">
            Set up your profile
          </h1>
        </div>

        {/* Progress — skill: step indicator for multi-step flows */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-slate-400 mb-2">
            <span>
              Step {step + 1} of {STEPS.length}
            </span>
            <span className="text-brand-400 font-semibold">{STEPS[step]}</span>
          </div>
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-400 rounded-full transition-all duration-300"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="bg-panel/90 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl">
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <label htmlFor="ob-name" className="text-xs text-slate-400 mb-1 block">Name</label>
                <input id="ob-name" value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="What should we call you?"
                  className={inputCls} autoComplete="name" />
              </div>
              <div>
                <label htmlFor="ob-dob" className="text-xs text-slate-400 mb-1 block">
                  Date of birth {dob && ageFromDob(dob) !== null && (
                    <span className="text-brand-400 font-semibold">· Age {ageFromDob(dob)}</span>
                  )}
                </label>
                <input id="ob-dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)}
                  max={todayISO()} className={inputCls} />
              </div>
              <div>
                <span className="text-xs text-slate-400 mb-2 block" id="ob-gender-label">Gender</span>
                <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-labelledby="ob-gender-label">
                  {['male', 'female', 'other'].map((g) => (
                    <button key={g} type="button" role="radio" aria-checked={gender === g}
                      onClick={() => setGender(g)}
                      className={`py-2.5 rounded-xl text-sm font-bold capitalize transition ${
                        gender === g
                          ? 'bg-brand-400 text-slate-950'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label htmlFor="ob-height" className="text-xs text-slate-400 mb-1 block">Height (cm)</label>
                <input id="ob-height" type="number" min={100} max={250} value={height} onChange={(e) => setHeight(e.target.value)}
                  placeholder="e.g. 175" className={inputCls} />
              </div>
              <div>
                <label htmlFor="ob-weight" className="text-xs text-slate-400 mb-1 block">Weight (kg)</label>
                <input id="ob-weight" type="number" min={25} max={300} step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)}
                  placeholder="e.g. 70" className={inputCls} />
              </div>
              <p className="text-xs text-slate-500">Used to calculate your BMR, TDEE, and calorie targets.</p>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-2" role="radiogroup" aria-label="Activity level">
              {ACTIVITY_OPTIONS.map((opt) => (
                <button key={opt.value} type="button" role="radio" aria-checked={activity === opt.value}
                  onClick={() => setActivity(opt.value)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition ${
                    activity === opt.value
                      ? 'border-brand-400 bg-brand-400/10'
                      : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                  }`}>
                  <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${
                    activity === opt.value ? 'bg-brand-400 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}>
                    <opt.icon size={18} />
                  </span>
                  <span>
                    <span className="block text-white text-sm font-bold">{opt.label}</span>
                    <span className="block text-slate-500 text-xs">{opt.hint}</span>
                  </span>
                  {activity === opt.value && <Check size={18} className="ml-auto text-brand-400" />}
                </button>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              {[
                ['Name', name],
                ['Born', `${dob} (age ${ageFromDob(dob) ?? '—'})`],
                ['Gender', gender],
                ['Height', `${height} cm`],
                ['Weight', `${weight} kg`],
                ['Activity', ACTIVITY_OPTIONS.find((o) => o.value === activity)?.label || activity],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between text-sm border-b border-slate-800/70 pb-2">
                  <span className="text-slate-500">{label}</span>
                  <span className="text-white font-semibold capitalize">{value}</span>
                </div>
              ))}
              {submitError && <p className="text-red-400 text-sm">{submitError}</p>}
            </div>
          )}

          {fieldError && step !== 3 && <p className="text-red-400 text-sm mt-4">{fieldError}</p>}

          {/* Nav — skill: Back + Skip, never a forced linear trap */}
          <div className="flex items-center justify-between mt-6">
            <div>
              {step > 0 && (
                <button type="button" onClick={() => { setFieldError(''); setStep((s) => s - 1); }}
                  className="inline-flex items-center gap-1 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-300 hover:bg-slate-800 transition">
                  <ArrowLeft size={16} /> Back
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={onSkip}
                className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:text-slate-300 transition">
                Skip
              </button>
              {step < STEPS.length - 1 ? (
                <button type="button" onClick={next}
                  className="inline-flex items-center gap-1 px-5 py-2.5 rounded-xl bg-brand-400 hover:bg-brand-300 text-slate-950 text-sm font-bold transition">
                  Continue <ArrowRight size={16} />
                </button>
              ) : (
                <button type="button" onClick={finish} disabled={saving}
                  className="inline-flex items-center gap-1 px-5 py-2.5 rounded-xl bg-brand-400 hover:bg-brand-300 text-slate-950 text-sm font-bold transition disabled:opacity-50">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  {saving ? 'Saving…' : 'Complete setup'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
