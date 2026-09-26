import { Router } from 'express';
import { calculateBMR, calculateTDEE, calculateCalorieTarget } from '../utils/calculator.js';

const router = Router();

router.post('/bmr', (req, res) => {
  try {
    const { gender, weight_kg, height_cm, age } = req.body;
    if (!gender || !weight_kg || !height_cm || !age) return res.status(400).json({ error: 'Gender, weight_kg, height_cm, age are required' });
    res.json({ bmr: Math.round(calculateBMR({ gender, weight_kg, height_cm, age })) });
  } catch (err) {
    console.error('BMR calc error:', err);
    res.status(500).json({ error: 'Failed to calculate BMR' });
  }
});

router.post('/tdee', (req, res) => {
  try {
    const { bmr, activity_level } = req.body;
    if (!bmr || !activity_level) return res.status(400).json({ error: 'bmr and activity_level are required' });
    res.json({ tdee: Math.round(calculateTDEE(bmr, activity_level)) });
  } catch (err) {
    console.error('TDEE calc error:', err);
    res.status(500).json({ error: 'Failed to calculate TDEE' });
  }
});

router.post('/calorie-target', (req, res) => {
  try {
    const { tdee, goal_type } = req.body;
    if (!tdee || !goal_type) return res.status(400).json({ error: 'tdee and goal_type are required' });
    res.json({ targetCalories: Math.round(calculateCalorieTarget({ tdee, goalType: goal_type })) });
  } catch (err) {
    console.error('Calorie target error:', err);
    res.status(500).json({ error: 'Failed to calculate calorie target' });
  }
});

export default router;
