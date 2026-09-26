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
  Utensils,
  Dumbbell,
  BarChart2,
  Brain,
  Award,
  Sparkles,
  Leaf,
  Heart,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import { type GoalType } from '../lib/theory';
import { useAuthStore } from '../store/auth';
import { apiClient } from '../lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { qk } from '../lib/queries';
import { ageFromDob, todayISO } from '../lib/format';

const ACTIVITY_OPTIONS: { value: string; label: string; hint: string; icon: LucideIcon }[] = [
  { value: 'sedentary', label: 'Sedentary', hint: 'Desk job, little exercise', icon: Armchair },
  { value: 'lightly_active', label: 'Lightly active', hint: 'Light walks 1–3 days/week', icon: Footprints },
  { value: 'moderately_active', label: 'Moderately active', hint: 'Workouts 3–5 days/week', icon: Activity },
  { value: 'very_active', label: 'Very active', hint: 'Hard training 6–7 days/week', icon: Flame },
  { value: 'extremely_active', label: 'Extremely active', hint: 'Athlete / physical job', icon: Zap },
];

const GOAL_OPTIONS: { value: GoalType; label: string; icon: LucideIcon; description: string; color: string }[] = [
  { value: 'fat_loss', label: 'Fat Loss', icon: Flame, description: 'Reduce body fat with a moderate deficit and high protein', color: 'bg-orange-500/20 border-orange-500/30 text-orange-400' },
  { value: 'weight_loss', label: 'Weight Loss', icon: TrendingUp, description: 'Reduce body weight gradually without an aggressive deficit', color: 'bg-pink-500/20 border-pink-500/30 text-pink-400' },
  { value: 'muscle_gain', label: 'Muscle Gain', icon: Dumbbell, description: 'Prioritize lean mass with a small, controlled surplus', color: 'bg-red-500/20 border-red-500/30 text-red-400' },
  { value: 'weight_gain', label: 'Weight Gain', icon: Heart, description: 'Increase body weight gradually while monitoring progress', color: 'bg-blue-500/20 border-blue-500/30 text-blue-400' },
  { value: 'skinny_to_fit', label: 'Skinny → Fit', icon: Zap, description: 'Build body weight and strength with a controlled surplus', color: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' },
  { value: 'maintain', label: 'Fit / Maintain', icon: Leaf, description: 'Keep body weight stable while supporting training', color: 'bg-violet-500/20 border-violet-500/30 text-violet-400' },
];

const FEATURE_CARDS = [
  {
    id: 'food',
    title: 'Smart Food Tracking',
    subtitle: 'Create Your Own food, Macro & Fooddatabase',
    icon: Utensils,
    description: 'Build custom foods, set macros, and access a massive verified database. Log meals fast with barcode scan and AI recognition.',
    highlight: 'Custom foods + 1M database',
    color: 'bg-amber-500/20 border-amber-500/30',
    iconColor: 'text-amber-400',
    bgGradient: 'from-amber-900/20 to-amber-900/5',
  },
  {
    id: 'workout',
    title: 'Workout Tracking',
    subtitle: 'Log exercises, sets, reps & progress',
    icon: Dumbbell,
    description: 'Track workouts like food — exercises, sets, reps, weight, RPE. Built-in rest timer, plate calculator, and progression charts.',
    highlight: 'Exercise library + timer',
    color: 'bg-red-500/20 border-red-500/30',
    iconColor: 'text-red-400',
    bgGradient: 'from-red-900/20 to-red-900/5',
  },
  {
    id: 'tracker',
    title: 'Daily Tracker',
    subtitle: 'Calories, macros, water, steps, weight',
    icon: BarChart2,
    description: 'Your mission control. Log food, exercise, water, steps, and body weight. See real-time progress toward your daily targets.',
    highlight: 'Live macro rings & verdicts',
    color: 'bg-brand-500/20 border-brand-500/30',
    iconColor: 'text-brand-400',
    bgGradient: 'from-lime-900/20 to-lime-900/5',
  },
  {
    id: 'anyai',
    title: 'AnyAI Coach',
    subtitle: 'My daily process & smart guidance',
    icon: Brain,
    description: 'Your 24/7 fitness intelligence. Ask anything — meal ideas, form checks, plateau fixes. Context-aware answers from your logs and goals.',
    highlight: 'Context-aware responses',
    color: 'bg-violet-500/20 border-violet-500/30',
    iconColor: 'text-violet-400',
    bgGradient: 'from-violet-900/20 to-violet-900/5',
  },
  {
    id: 'badge',
    title: 'Badge System',
    subtitle: 'Earn rewards, build streaks, level up',
    icon: Award,
    description: '30 unique badges across 6 goal types. 5 levels per goal: Starter → Momentum → Dedicated → Master → Legend. XP, ranks, and bragging rights.',
    highlight: '30 badges • 7 ranks',
    color: 'bg-yellow-500/20 border-yellow-500/30',
    iconColor: 'text-yellow-400',
    bgGradient: 'from-yellow-900/20 to-yellow-900/5',
  },
];

const ORIGINAL_STEPS = ['Basics', 'Body', 'Activity', 'Review'];
const TOTAL_STEPS = ORIGINAL_STEPS.length + 2; // 4 original + 2 new = 6

export default function OnboardingPage({ onDone, onSkip }: { onDone: () => void; onSkip: () => void }) {
  const user = useAuthStore((s) => s.user);
  const { data: profile } = useQueryClient().getQueryData(['profile']) as any;
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  
  // Original form state
  const [name, setName] = useState(profile?.name || user?.name || '');
  const [dob, setDob] = useState(profile?.dob ? String(profile.dob).slice(0, 10) : '');
  const [gender, setGender] = useState(profile?.gender || '');
  const [height, setHeight] = useState(profile?.height ? String(profile.height) : '');
  const [weight, setWeight] = useState(profile?.weight ? String(profile.weight) : '');
  const [activity, setActivity] = useState(profile?.activity_level || '');
  
  // New slides state
  const [selectedGoal, setSelectedGoal] = useState<GoalType | null>(null);
  
  const [fieldError, setFieldError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [saving, setSaving] = useState(false);

  const isOriginalStep = step < ORIGINAL_STEPS.length;
  const isGoalStep = step === ORIGINAL_STEPS.length; // step 4
  const isFeaturesStep = step === ORIGINAL_STEPS.length + 1; // step 5

  function validateOriginal(s: number): boolean {
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
    if (isOriginalStep) {
      if (validateOriginal(step)) setStep((s) => s + 1);
    } else if (isGoalStep) {
      if (selectedGoal) setStep((s) => s + 1);
    } else if (isFeaturesStep) {
      finish();
    }
  }

  async function finish() {
    // Validate all original steps
    if (!validateOriginal(0) || !validateOriginal(1) || !validateOriginal(2)) {
      setStep(!name.trim() || !dob || !gender ? 0 : !height || !weight ? 1 : 2);
      return;
    }
    if (!selectedGoal) {
      setStep(ORIGINAL_STEPS.length);
      return;
    }
    if (!profile?.id) {
      setSubmitError('Profile is not ready yet. Please re-login and try again.');
      return;
    }
    setSaving(true);
    setSubmitError('');
    try {
      // 1. Update profile with original data
      await apiClient.updateProfile(profile.id, {
        name: name.trim(),
        dob,
        age: ageFromDob(dob),
        height_cm: Number(height),
        weight_kg: Number(weight),
        gender,
        activity_level: activity,
      });
      // 2. Create initial goal
      await apiClient.createGoal({
        user_id: user?.id,
        goal_type: selectedGoal,
        target_value: 0,
        target_calories: 0,
        protein_target: 0,
        fat_target: 0,
        carb_target: 0,
        status: 'active',
      });
      await qc.invalidateQueries({ queryKey: qk.profile() });
      onDone();
    } catch (err: unknown) {
      setSubmitError((err instanceof Error ? err.message : null) || 'Could not save. Please try again.');
    }
    setSaving(false);
  }

  const currentStepLabel = isOriginalStep ? ORIGINAL_STEPS[step] : isGoalStep ? 'Goal' : 'Features';
  const progressPct = ((step + 1) / TOTAL_STEPS) * 100;

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink px-4 py-12">
      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="text-center mb-6">
          <p className="text-brand-400 text-sm font-semibold mb-1">Welcome to FitPulse</p>
          <h1 className="text-3xl font-display font-semibold uppercase tracking-wide text-white">
            {isOriginalStep ? 'Set up your profile' : isGoalStep ? 'What\'s Your Goal?' : 'Everything You Need to Succeed'}
          </h1>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-slate-400 mb-2">
            <span>Step {step + 1} of {TOTAL_STEPS}</span>
            <span className="text-brand-400 font-semibold">{currentStepLabel}</span>
          </div>
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-400 rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <div className="bg-panel/90 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl">
          {/* ===== ORIGINAL STEP 0: BASICS ===== */}
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <label htmlFor="ob-name" className="text-xs text-slate-400 mb-1 block">Name</label>
                <input id="ob-name" value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="What should we call you?"
                  className="w-full p-3 rounded-xl bg-ink border border-slate-700 text-white focus:outline-none focus:border-brand-500" autoComplete="name" />
              </div>
              <div>
                <label htmlFor="ob-dob" className="text-xs text-slate-400 mb-1 block">
                  Date of birth {dob && ageFromDob(dob) !== null && (
                    <span className="text-brand-400 font-semibold">· Age {ageFromDob(dob)}</span>
                  )}
                </label>
                <input id="ob-dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)}
                  max={todayISO()} className="w-full p-3 rounded-xl bg-ink border border-slate-700 text-white focus:outline-none focus:border-brand-500" />
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

          {/* ===== ORIGINAL STEP 1: BODY ===== */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label htmlFor="ob-height" className="text-xs text-slate-400 mb-1 block">Height (cm)</label>
                <input id="ob-height" type="number" min={100} max={250} value={height} onChange={(e) => setHeight(e.target.value)}
                  placeholder="e.g. 175" className="w-full p-3 rounded-xl bg-ink border border-slate-700 text-white focus:outline-none focus:border-brand-500" />
              </div>
              <div>
                <label htmlFor="ob-weight" className="text-xs text-slate-400 mb-1 block">Weight (kg)</label>
                <input id="ob-weight" type="number" min={25} max={300} step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)}
                  placeholder="e.g. 70" className="w-full p-3 rounded-xl bg-ink border border-slate-700 text-white focus:outline-none focus:border-brand-500" />
              </div>
              <p className="text-xs text-slate-500">Used to calculate your BMR, TDEE, and calorie targets.</p>
            </div>
          )}

          {/* ===== ORIGINAL STEP 2: ACTIVITY ===== */}
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

          {/* ===== ORIGINAL STEP 3: REVIEW ===== */}
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

          {/* ===== NEW STEP 4: GOAL SELECT ===== */}
          {isGoalStep && (
            <div className="space-y-4" role="radiogroup" aria-label="Select your fitness goal">
              {GOAL_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={selectedGoal === opt.value}
                  onClick={() => setSelectedGoal(opt.value)}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border text-left transition-all duration-200 relative overflow-hidden ${
                    selectedGoal === opt.value
                      ? 'border-brand-400 bg-brand-400/10 shadow-lg shadow-brand-400/10'
                      : 'border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-900/50'
                  }`}
                >
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl ${
                      selectedGoal === opt.value ? 'bg-brand-400' : 'bg-transparent'
                    }`}
                  />
                  <span className={`relative inline-flex h-12 w-12 items-center justify-center rounded-xl shrink-0 ${opt.color}`}>
                    <opt.icon size={24} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-white font-bold text-lg truncate">{opt.label}</span>
                      {selectedGoal === opt.value && <Check size={20} className="text-brand-400 flex-shrink-0" />}
                    </div>
                    <p className="text-slate-400 text-sm mt-1">{opt.description}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* ===== NEW STEP 5: FEATURE CARDS ===== */}
          {isFeaturesStep && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-full">
              {FEATURE_CARDS.map((feature) => (
                <button
                  key={feature.id}
                  type="button"
                  className={`flex flex-col items-start gap-3 p-6 rounded-2xl border transition-all duration-200 hover:shadow-lg hover:shadow-brand-500/10 ${feature.color} bg-gradient-to-br ${feature.bgGradient} h-full min-w-0`}
                >
                  <span className={`relative inline-flex h-12 w-12 items-center justify-center rounded-xl shrink-0 ${feature.iconColor}`}>
                    <feature.icon size={24} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-bold text-lg leading-tight">{feature.title}</h3>
                    <p className="text-slate-400 text-base">{feature.subtitle}</p>
                    <p className="text-slate-500 text-base mt-2 line-clamp-3 flex-1">{feature.description}</p>
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold bg-white/5 border border-white/10 text-slate-400 mt-3">
                      <Sparkles size={12} /> {feature.highlight}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {fieldError && isOriginalStep && <p className="text-red-400 text-sm mt-4">{fieldError}</p>}
          {submitError && isOriginalStep && step === 3 && <p className="text-red-400 text-sm mt-4">{submitError}</p>}
          {submitError && isFeaturesStep && <p className="text-red-400 text-sm mt-4 text-center">{submitError}</p>}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8">
            <div>
              {step > 0 && (
                <button type="button" onClick={() => { setFieldError(''); setStep((s) => s - 1); }}
                  className="inline-flex items-center gap-1 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-300 hover:bg-slate-800 transition">
                  <ArrowLeft size={16} /> Back
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={onSkip}
                className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:text-slate-300 transition">
                Skip
              </button>
              {isOriginalStep && step < ORIGINAL_STEPS.length - 1 ? (
                <button type="button" onClick={next}
                  className="inline-flex items-center gap-1 px-5 py-2.5 rounded-xl bg-brand-400 hover:bg-brand-300 text-slate-950 text-sm font-bold transition">
                  Continue <ArrowRight size={16} />
                </button>
              ) : isOriginalStep && step === ORIGINAL_STEPS.length - 1 ? (
                <button type="button" onClick={next}
                  className="inline-flex items-center gap-1 px-5 py-2.5 rounded-xl bg-brand-400 hover:bg-brand-300 text-slate-950 text-sm font-bold transition">
                  Continue <ArrowRight size={16} />
                </button>
              ) : isGoalStep ? (
                <button type="button" onClick={next} disabled={!selectedGoal}
                  className="inline-flex items-center gap-1 px-6 py-3 rounded-xl bg-brand-400 hover:bg-brand-300 text-slate-950 text-sm font-bold transition disabled:opacity-50 disabled:cursor-not-allowed">
                  Continue <ArrowRight size={16} />
                </button>
              ) : (
                <button type="button" onClick={finish} disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-400 hover:bg-brand-300 text-slate-950 text-sm font-bold transition disabled:opacity-50 shadow-lg shadow-brand-400/20">
                  {saving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Setting up…
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      Get Started
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        <p className="text-center text-slate-600 text-xs mt-6 max-w-md mx-auto">
          You can change your goal and explore all features anytime from the dashboard.
        </p>
      </div>
    </div>
  );
}