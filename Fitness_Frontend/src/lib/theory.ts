// Pure theory implementation — mirrors Fitness_Backend/src/utils/calculator.js
// Based on fitness_calorie_goal_theory.md

export const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  extremely_active: 1.9,
} as const;

export const GOAL_MULTIPLIERS = {
  skinny_to_fit: 1.2,
  muscle_gain: 1.125,
  weight_gain: 1.15,
  maintain: 1.0,
  fat_loss: 0.85,
  weight_loss: 0.85,
} as const;

export const GOAL_LABELS: Record<keyof typeof GOAL_MULTIPLIERS, string> = {
  skinny_to_fit: 'Skinny → Fit',
  muscle_gain: 'Muscle Gain',
  weight_gain: 'Weight Gain',
  maintain: 'Fit / Maintain',
  fat_loss: 'Fat Loss',
  weight_loss: 'Weight Loss',
};

export const GOAL_GUIDANCE: Record<GoalType, { summary: string; calories: string; protein: string; plan: string[] }> = {
  skinny_to_fit: { summary: 'Build body weight and strength with a controlled surplus.', calories: 'Start at 10-20% above TDEE.', protein: '1.6-2.2 g/kg', plan: ['Train full body 3 days per week with progressive weights.', 'Add one calorie-dense meal or shake if weight does not rise.', 'Review average weight every 2 weeks with a trainer or coach.'] },
  muscle_gain: { summary: 'Prioritize lean mass with a small, controlled surplus.', calories: 'Start at 10-15% above TDEE.', protein: '1.6-2.2 g/kg', plan: ['Use a structured strength plan 3-5 days per week.', 'Track sets, reps, and progressive overload in the Daily page.', 'Increase calories only after 2 weeks without strength or weight progress.'] },
  weight_gain: { summary: 'Increase body weight gradually while monitoring progress.', calories: 'Start at 10-20% above TDEE.', protein: '1.6-2.0 g/kg', plan: ['Use strength training 3 days per week to support healthy gain.', 'Build meals around protein, whole grains, and healthy fats.', 'Ask a registered dietitian or trainer to review stalled progress.'] },
  maintain: { summary: 'Keep body weight stable while supporting training.', calories: 'Start close to TDEE.', protein: '1.6-2.0 g/kg', plan: ['Keep a consistent 3-4 day weekly activity routine.', 'Use weekly weight averages instead of reacting to one day.', 'Adjust calories by a small amount if the trend changes for 2-3 weeks.'] },
  fat_loss: { summary: 'Reduce body fat with a moderate deficit and high protein.', calories: 'Start at 10-20% below TDEE.', protein: '1.6-2.2 g/kg', plan: ['Combine resistance training 2-4 days with regular walking or cardio.', 'Keep protein high and log meals consistently.', 'Avoid aggressive cuts; review the 2-week weight trend before adjusting.'] },
  weight_loss: { summary: 'Reduce body weight gradually without an aggressive deficit.', calories: 'Start at 10-20% below TDEE.', protein: '1.6-2.2 g/kg', plan: ['Aim for regular walking plus 2-3 strength sessions weekly.', 'Use repeatable meals and track portions in the Daily page.', 'Consult a qualified trainer or dietitian if energy or adherence drops.'] },
};

export type GoalType = keyof typeof GOAL_MULTIPLIERS;

export function recommendGoal(weight_kg: number, height_cm: number): GoalType {
  const heightM = height_cm / 100;
  const bmi = heightM > 0 ? weight_kg / (heightM * heightM) : 22;
  if (bmi < 18.5) return 'skinny_to_fit';
  if (bmi >= 25) return 'fat_loss';
  return 'maintain';
}

export function calcBMR(gender: string, weight_kg: number, height_cm: number, age: number) {
  if (gender === 'male') return 10 * weight_kg + 6.25 * height_cm - 5 * age + 5;
  return 10 * weight_kg + 6.25 * height_cm - 5 * age - 161;
}

export function calcTDEE(bmr: number, activity: keyof typeof ACTIVITY_MULTIPLIERS) {
  return bmr * (ACTIVITY_MULTIPLIERS[activity] ?? 1.2);
}

export function calcTarget(tdee: number, goal: GoalType) {
  return tdee * (GOAL_MULTIPLIERS[goal] ?? 1.0);
}

export function calcMacros(targetCalories: number, weight_kg: number) {
  const proteinG = weight_kg * 2.0;
  const fatG = weight_kg * 0.8;
  const proteinCal = proteinG * 4;
  const fatCal = fatG * 9;
  const carbCal = Math.max(0, targetCalories - proteinCal - fatCal);
  return {
    calories: Math.round(targetCalories),
    protein: Math.round(proteinG * 10) / 10,
    fat: Math.round(fatG * 10) / 10,
    carbs: Math.round((carbCal / 4) * 10) / 10,
  };
}
