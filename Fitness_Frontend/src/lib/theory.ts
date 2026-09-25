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

export type GoalType = keyof typeof GOAL_MULTIPLIERS;

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
