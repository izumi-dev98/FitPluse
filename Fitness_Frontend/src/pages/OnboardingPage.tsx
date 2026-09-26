import { useState } from 'react';
import {
  Utensils,
  Dumbbell,
  BarChart2,
  Brain,
  Award,
  Zap,
  Flame,
  Leaf,
  Heart,
  TrendingUp,
  ArrowRight,
  Check,
  Loader2,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { type GoalType } from '../lib/theory';
import { useAuthStore } from '../store/auth';
import { apiClient } from '../lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { qk } from '../lib/queries';

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
    subtitle: 'Log meals, scan barcodes, get macros',
    icon: Utensils,
    description: 'AI-powered food recognition, barcode scanner, and a massive database. Track calories, protein, carbs, and fats effortlessly.',
    highlight: '1M+ foods in database',
    color: 'bg-amber-500/20 border-amber-500/30',
    iconColor: 'text-amber-400',
    bgGradient: 'from-amber-900/20 to-amber-900/5',
  },
  {
    id: 'workout',
    title: 'Workout Plans',
    subtitle: 'Science-based routines for every goal',
    icon: Dumbbell,
    description: 'Personalized programs that adapt to your progress. Strength, hypertrophy, fat loss, or maintenance — we build the plan.',
    highlight: 'Adaptive progressive overload',
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
    subtitle: 'Your 24/7 fitness intelligence',
    icon: Brain,
    description: 'Ask anything — meal ideas, form checks, plateau fixes, motivation. Context-aware answers based on your data and goals.',
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

export default function OnboardingPage({ onDone, onSkip }: { onDone: () => void; onSkip: () => void }) {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [selectedGoal, setSelectedGoal] = useState<GoalType | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const isGoalStep = step === 0;
  const isFeaturesStep = step === 1;

  function nextStep() {
    if (isGoalStep && !selectedGoal) return;
    setStep((s) => Math.min(s + 1, 1));
  }

  async function finish() {
    if (!selectedGoal) return;
    if (!user?.id) {
      setSubmitError('User session not found. Please re-login.');
      return;
    }
    setSaving(true);
    setSubmitError('');
    try {
      // Create initial goal for the user
      await apiClient.createGoal({
        user_id: user.id,
        goal_type: selectedGoal,
        target_value: 0, // Will be calculated when they enter stats
        target_calories: 0,
        protein_target: 0,
        fat_target: 0,
        carb_target: 0,
        status: 'active',
      });
      await qc.invalidateQueries({ queryKey: qk.profile() });
      onDone();
    } catch (err: unknown) {
      setSubmitError((err instanceof Error ? err.message : null) || 'Could not save goal. Please try again.');
    }
    setSaving(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink px-4 py-12">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-brand-400 text-sm font-semibold mb-2">Welcome to FitPulse</p>
          <h1 className="text-3xl md:text-4xl font-display font-semibold uppercase tracking-wide text-white">
            {isGoalStep ? 'What\'s Your Goal?' : 'Everything You Need to Succeed'}
          </h1>
          <p className="text-slate-400 mt-3 text-lg">
            {isGoalStep
              ? 'Pick the goal that matches where you want to go. We\'ll personalize everything from here.'
              : 'Powerful tools that work together — food, training, tracking, AI coaching, and rewards.'}
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-slate-400 mb-2">
            <span>Step {step + 1} of 2</span>
            <span className="text-brand-400 font-semibold">{isGoalStep ? 'Goal' : 'Features'}</span>
          </div>
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-400 rounded-full transition-all duration-300"
              style={{ width: `${((step + 1) / 2) * 100}%` }}
            />
          </div>
        </div>

        <div className="bg-panel/90 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl">
          {/* Step 1: Goal Selection */}
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
                  {/* Color accent bar */}
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl ${
                      selectedGoal === opt.value ? 'bg-brand-400' : 'bg-transparent'
                    }`}
                  />
                  {/* Icon */}
                  <span className={`relative inline-flex h-12 w-12 items-center justify-center rounded-xl shrink-0 ${opt.color}`}>
                    <opt.icon size={24} />
                  </span>
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-white font-bold text-lg truncate">{opt.label}</span>
                      {selectedGoal === opt.value && (
                        <Check size={20} className="text-brand-400 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-slate-400 text-sm mt-1">{opt.description}</p>
                  </div>
                  {/* Recommended badge */}
                  {opt.value === 'fat_loss' && user && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-brand-400/20 text-brand-400 border border-brand-400/30">
                      Recommended
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Feature Cards */}
          {isFeaturesStep && (
            <div className="space-y-4">
              {FEATURE_CARDS.map((feature) => (
                <button
                  key={feature.id}
                  type="button"
                  className={`w-full flex items-start gap-4 p-4 rounded-2xl border transition-all duration-200 hover:shadow-lg hover:shadow-brand-500/10 ${feature.color} bg-gradient-to-br ${feature.bgGradient}`}
                >
                  <span className={`relative inline-flex h-12 w-12 items-center justify-center rounded-xl shrink-0 ${feature.iconColor}`}>
                    <feature.icon size={24} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-white font-bold text-base">{feature.title}</h3>
                        <p className="text-slate-400 text-sm">{feature.subtitle}</p>
                      </div>
                      <ArrowRight size={18} className="text-slate-500 shrink-0" />
                    </div>
                    <p className="text-slate-500 text-sm mt-2 line-clamp-2">{feature.description}</p>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-white/5 border border-white/10 text-slate-400 mt-3">
                      <Sparkles size={10} /> {feature.highlight}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Error Message */}
          {submitError && <p className="text-red-400 text-sm mt-4 text-center">{submitError}</p>}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8">
            <div>
              {step > 0 && (
                <button
                  type="button"
                  onClick={() => setStep((s) => s - 1)}
                  className="inline-flex items-center gap-1 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-300 hover:bg-slate-800 transition"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                  Back
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onSkip}
                className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:text-slate-300 transition"
              >
                Skip
              </button>
              {isGoalStep ? (
                <button
                  type="button"
                  onClick={nextStep}
                  disabled={!selectedGoal}
                  className="inline-flex items-center gap-1 px-6 py-3 rounded-xl bg-brand-400 hover:bg-brand-300 text-slate-950 text-sm font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                  <ArrowRight size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={finish}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-400 hover:bg-brand-300 text-slate-950 text-sm font-bold transition disabled:opacity-50 shadow-lg shadow-brand-400/20"
                >
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

        {/* Footer hint */}
        <p className="text-center text-slate-600 text-xs mt-6 max-w-md mx-auto">
          You can change your goal and explore all features anytime from the dashboard.
        </p>
      </div>
    </div>
  );
}