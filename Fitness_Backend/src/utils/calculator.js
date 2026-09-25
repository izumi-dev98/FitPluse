/**
 * Fitness Calculation Utilities
 * Based on fitness_calorie_goal_theory.md
 */

const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.20,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  extremely_active: 1.90,
};

export function calculateBMR({ gender, weight_kg, height_cm, age }) {
  if (gender === 'male') {
    return 10 * weight_kg + 6.25 * height_cm - 5 * age + 5;
  }
  // female / other default
  return 10 * weight_kg + 6.25 * height_cm - 5 * age - 161;
}

export function calculateTDEE(bmr, activityLevel) {
  const mult = ACTIVITY_MULTIPLIERS[activityLevel] || 1.2;
  return bmr * mult;
}

export function calculateCalorieTarget({ tdee, goalType }) {
  const strategies = {
    skinny_to_fit: 1.20,
    muscle_gain: 1.125,
    weight_gain: 1.15,
    maintain: 1.0,
    fat_loss: 0.85,
    weight_loss: 0.85,
  };
  const mult = strategies[goalType] || 1.0;
  return tdee * mult;
}

export function calculateProteinTarget(weight_kg, factor = 2.0) {
  return weight_kg * factor;
}

export function calculateFatTarget(weight_kg, factor = 0.8) {
  return weight_kg * factor;
}

export function calculateMacros({ targetCalories, weight_kg }) {
  const proteinFactor = 2.0;
  const fatFactor = 0.8;

  const proteinG = calculateProteinTarget(weight_kg, proteinFactor);
  const fatG = calculateFatTarget(weight_kg, fatFactor);

  const proteinCal = proteinG * 4;
  const fatCal = fatG * 9;

  const carbCal = Math.max(0, targetCalories - proteinCal - fatCal);
  const carbG = carbCal / 4;

  return {
    calories: Math.round(targetCalories),
    protein_grams: Math.round(proteinG * 10) / 10,
    fat_grams: Math.round(fatG * 10) / 10,
    carbohydrate_grams: Math.round(carbG * 10) / 10,
    breakdown: {
      protein_calories: Math.round(proteinCal),
      fat_calories: Math.round(fatCal),
      carbohydrate_calories: Math.round(carbCal),
    },
  };
}
