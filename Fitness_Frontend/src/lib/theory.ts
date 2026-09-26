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

export const GOAL_GUIDANCE: Record<GoalType, { summary: string; calories: string; protein: string; plan: string[]; food: string[]; exercise: string[] }> = {
  skinny_to_fit: { summary: 'Build body weight and strength with a controlled surplus.', calories: 'Start at 10-20% above TDEE.', protein: '1.6-2.2 g/kg', plan: ['Use a steady calorie surplus and review weekly weight trends.', 'Build consistency with meal preparation and progressive training.', 'Review strength, energy, and measurements every 2 weeks.'], food: ['Lean proteins such as chicken, fish, eggs, tofu, and Greek yogurt.', 'Complex carbohydrates such as oats, rice, potatoes, and whole grains.', 'Healthy fats and calorie-dense smoothies when appetite is low.'], exercise: ['Full-body resistance training 3 days per week.', 'Prioritize squats, presses, rows, hinges, and gradual load increases.', 'Keep cardio light so it does not remove the planned calorie surplus.'] },
  muscle_gain: { summary: 'Prioritize lean mass with a small, controlled surplus.', calories: 'Start at 10-15% above TDEE.', protein: '1.6-2.2 g/kg', plan: ['Follow a structured strength plan and track progressive overload.', 'Keep meals consistent and review strength progress weekly.', 'Increase calories only after 2 weeks without progress.'], food: ['High-quality protein at each meal to support muscle protein synthesis.', 'Rice, oats, potatoes, fruit, and other carbohydrates around training.', 'Enough healthy fats from nuts, seeds, olive oil, and dairy.'], exercise: ['Strength training 3-5 days per week.', 'Prioritize compound movements and controlled technique.', 'Allow recovery days and increase sets, reps, or load gradually.'] },
  weight_gain: { summary: 'Increase body weight gradually while monitoring progress.', calories: 'Start at 10-20% above TDEE.', protein: '1.6-2.0 g/kg', plan: ['Aim for a gradual 300-500 kcal surplus.', 'Use 5-6 smaller meals or snacks if large meals are difficult.', 'Track strength, energy, and measurements instead of scale weight alone.'], food: ['Lean proteins, full-fat dairy, eggs, and Greek yogurt.', 'Whole grains, rice, oats, and starchy vegetables.', 'Milk, fruit, peanut butter, and whey smoothies for easy calories.'], exercise: ['Resistance training 3-4 times per week.', 'Use squats, deadlifts, push-ups, presses, and rows.', 'Keep cardio light or walk for recovery without excessive calorie burn.'] },
  maintain: { summary: 'Keep body weight stable while supporting training.', calories: 'Start close to TDEE.', protein: '1.6-2.0 g/kg', plan: ['Set a consistent workout and meal-preparation schedule.', 'Use weekly weight averages rather than reacting to daily changes.', 'Adjust calories slightly after a 2-3 week trend.'], food: ['Build balanced plates with lean protein, complex carbohydrates, and healthy fats.', 'Use vegetables, fruit, oats, rice, potatoes, fish, eggs, tofu, and yogurt.', 'Add carbohydrates before training and protein plus carbohydrates after training.'], exercise: ['Strength training 3 days per week.', 'Add about 150 minutes of moderate cardio each week.', 'Warm up 5-10 minutes and cool down after sessions.'] },
  fat_loss: { summary: 'Reduce body fat with a moderate deficit and high protein.', calories: 'Start at 10-20% below TDEE.', protein: '1.6-2.2 g/kg', plan: ['Aim for gradual loss of about 0.5-1 kg per week.', 'Track portions and steps consistently instead of using aggressive restrictions.', 'Protect sleep and stress management to support adherence.'], food: ['Fill half the plate with vegetables, plus lean protein and complex carbohydrates.', 'Choose oats, rice, quinoa, potatoes, chicken, fish, tofu, and legumes.', 'Include measured portions of avocado, nuts, seeds, and olive oil.'], exercise: ['Cardio about 150 minutes per week.', 'Strength training 2-3 days per week to preserve muscle.', 'Add daily movement such as walking, stairs, and household activity.'] },
  weight_loss: { summary: 'Reduce body weight gradually without an aggressive deficit.', calories: 'Start at 10-20% below TDEE.', protein: '1.6-2.2 g/kg', plan: ['Target a safe 0.5-1 kg weekly loss with long-term habits.', 'Use a moderate deficit near 500 kcal rather than a crash diet.', 'Keep a daily food and activity journal to review progress.'], food: ['Prioritize lean proteins such as chicken, fish, beans, and low-fat dairy.', 'Fill half the plate with vegetables and fruit, plus whole grains.', 'Limit added sugar, highly processed snacks, excess sodium, and trans fats.'], exercise: ['At least 150 minutes of moderate aerobic activity weekly.', 'Strength training at least 2 days per week.', 'Stay active daily with steps, stairs, walking, or cycling.'] },
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
