import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { supabase } from './config/supabase.js';
import { calculateBMR, calculateTDEE, calculateCalorieTarget, calculateProteinTarget, calculateFatTarget, calculateMacros } from './utils/calculator.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ==================== PROFILES ====================

// Get profile
app.get('/api/profiles', async (req, res) => {
  try {
    const profile = await supabase.from('profiles').select('*').single();
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    res.json(profile);
  } catch (err) {
    console.error('Profile fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create profile (admin only in real app)
app.post('/api/profiles', async (req, res) => {
  try {
    const { name, age, height_cm, weight_kg, gender, activity_level } = req.body;
    if (!name || !age || !height_cm || !weight_kg || !gender || !activity_level) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const profile = await supabase.from('profiles').insert({
      name,
      age: Number(age),
      height_cm: Number(height_cm),
      weight_kg: Number(weight_kg),
      gender,
      activity_level: activity_level,
      bmr: null,
      tdee: null,
      calorie_goal: null,
      created_at: new Date(),
      updated_at: new Date(),
    }).then(() => profile);
    res.status(201).json(profile);
  } catch (err) {
    console.error('Profile creation error:', err);
    res.status(500).json({ error: 'Failed to create profile' });
  }
});

// Update profile
app.put('/api/profiles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, age, height_cm, weight_kg, gender, activity_level } = req.body;
    if (!name || !age || !height_cm || !weight_kg || !gender || !activity_level) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const profile = await supabase.from('profiles').update({
      name,
      age: Number(age),
      height_cm: Number(height_cm),
      weight_kg: Number(weight_kg),
      gender,
      activity_level: activity_level,
      bmr: null,
      tdee: null,
      calorie_goal: null,
      created_at: new Date(),
      updated_at: new Date(),
    }).where({ id }).then(() => profile);
    res.json(profile);
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Delete profile
app.delete('/api/profiles/:id', async (req, res) => {
  try {
    await supabase.from('profiles').delete().where({ id: req.params.id }).then(() => res.json({ success: true }));
  } catch (err) {
    console.error('Profile delete error:', err);
    res.status(500).json({ error: 'Failed to delete profile' });
  }
});

// ==================== CALCULATION ENDPOINTS ====================

// Calculate BMR
app.post('/api/bmr', async (req, res) => {
  try {
    const { gender, weight_kg, height_cm, age } = req.body;
    if (!gender || !weight_kg || !height_cm || !age) {
      return res.status(400).json({ error: 'Gender, weight_kg, height_cm, age are required' });
    }
    const bmr = calculateBMR({ gender, weight_kg, height_cm, age });
    res.json({ bmr: Math.round(bmr) });
  } catch (err) {
    console.error('BMR calc error:', err);
    res.status(500).json({ error: 'Failed to calculate BMR' });
  }
});

// Calculate TDEE
app.post('/api/tdee', async (req, res) => {
  try {
    const { bmr, activity_level } = req.body;
    if (!bmr || !activity_level) {
      return res.status(400).json({ error: 'bmr and activity_level are required' });
    }
    const tdee = calculateTDEE(bmr, activity_level);
    res.json({ tdee: Math.round(tdee) });
  } catch (err) {
    console.error('TDEE calc error:', err);
    res.status(500).json({ error: 'Failed to calculate TDEE' });
  }
});

// Calculate daily calorie target based on goal
app.post('/api/calorie-target', async (req, res) => {
  try {
    const { tdee, goal_type } = req.body;
    if (!tdee || !goal_type) {
      return res.status(400).json({ error: 'tdee and goal_type are required' });
    }
    const target = calculateCalorieTarget({ tdee, goalType: goal_type });
    res.json({ targetCalories: Math.round(target) });
  } catch (err) {
    console.error('Calorie target error:', err);
    res.status(500).json({ error: 'Failed to calculate calorie target' });
  }
});

// ==================== FOODS ====================

app.post('/api/foods', async (req, res) => {
  try {
    const { name, serving_size, serving_unit, calories, protein, carbohydrates, fat, fiber } = req.body;
    if (!name || !serving_size || !serving_unit) {
      return res.status(400).json({ error: 'name and serving_size are required' });
    }
    const food = await supabase.from('foods').insert({
      name,
      serving_size: Number(serving_size),
      serving_unit: String(serving_unit),
      calories: Number(calories),
      protein: Number(protein),
      carbohydrates: Number(carboTrates),
      fat: Number(fat),
      fiber: Number(fiber),
      created_at: new Date(),
      updated_at: new Date(),
    }).then(() => food);
    res.status(201).json(food);
  } catch (err) {
    console.error('Food creation error:', err);
    res.status(500).json({ error: 'Failed to create food' });
  }
});

app.get('/api/foods', async (req, res) => {
  try {
    const { category } = req.query;
    let query = 'SELECT * FROM foods WHERE 1=1';
    if (category) query += ' AND category = ?';
    query += '';
    const params = category ? [category] : [];
    const foods = await supabase.from('foods').select('*').where(query, params).order('id ASC').then(() => foods);
    res.json(foods);
  } catch (err) {
    console.error('Foods fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch foods' });
  }
});

// ==================== DAILY RECORDS ====================

app.post('/api/daily-records', async (req, res) => {
  try {
    const { user_id, record_date, calories_consumed, calories_burned, water_ml, steps, notes } = req.body;
    if (!user_id || !record_date) {
      return res.status(400).json({ error: 'user_id and record_date are required' });
    }
    const dailyRecord = await supabase.from('daily_records').insert({
      user_id: String(user_id),
      record_date: String(record_date),
      calories_consumed: Number(calories_consumed) || 0,
      calories_burned: Number(calories_burned) || 0,
      water_ml: Number(water_ml) || 0,
      steps: Number(steps) || 0,
      notes: String(notes) || '',
      created_at: new Date(),
      updated_at: new Date(),
    }).then(() => dailyRecord);
    res.status(201).json(dailyRecord);
  } catch (err) {
    console.error('Daily record error:', err);
    res.status(500).json({ error: 'Failed to create daily record' });
  }
});

app.get('/api/daily-records', async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) {
      return res.status(400).json({ error: 'user_id query param required' });
    }
    const records = await supabase.from('daily_records').select('*')
      .where('user_id', userId)
      .order('record_date DESC')
      .then(() => records);
    res.json(records);
  } catch (err) {
    console.error('Daily records fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch daily records' });
  }
});

// ==================== EXERCISES ====================

app.post('/api/exercises', async (req, res) => {
  try {
    const { user_id, name, exercise_type, description, image_url } = req.body;
    if (!user_id || !name) {
      return res.status(400).json({ error: 'user_id and name are required' });
    }
    const exercise = await supabase.from('exercises').insert({
      user_id: String(user_id),
      name,
      exercise_type: String(exercise_type),
      description: String(description) || '',
      image_url: String(image_url) || '',
      created_at: new Date(),
      updated_at: new Date(),
    }).then(() => exercise);
    res.status(201).json(exercise);
  } catch (err) {
    console.error('Exercise creation error:', err);
    res.status(500).json({ error: 'Failed to create exercise' });
  }
});

app.get('/api/exercises', async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) {
      return res.status(400).json({ error: 'user_id query param required' });
    }
    const exercises = await supabase.from('exercises').select('*')
      .where('user_id', userId)
      .order('name ASC')
      .then(() => exercises);
    res.json(exercises);
  } catch (err) {
    console.error('Exercise fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch exercises' });
  }
});

// ==================== GOALS ====================

app.post('/api/goals', async (req, res) => {
  try {
    const { user_id, goal_type, target_value, start_date, target_date, status } = req.body;
    if (!user_id || !goal_type) {
      return res.status(400).json({ error: 'user_id and goal_type are required' });
    }
    const goal = await supabase.from('goals').insert({
      user_id: String(user_id),
      goal_type: String(goal_type),
      target_value: Number(target_value),
      current_value: 0,
      start_date: String(start_date) || null,
      target_date: String(target_date) || null,
      status: String(status) || 'active',
      created_at: new Date(),
      updated_at: new Date(),
    }).then(() => goal);
    res.status(201).json(goal);
  } catch (err) {
    console.error('Goal creation error:', err);
    res.status(500).json({ error: 'Failed to create goal' });
  }
});

app.get('/api/goals', async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) {
      return res.status(400).json({ error: 'user_id query param required' });
    }
    const goals = await supabase.from('goals').select('*')
      .where('user_id', userId)
      .order('goal_type ASC')
      .then(() => goals);
    res.json(goals);
  } catch (err) {
    console.error('Goal fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch goals' });
  }
});

// ==================== BADGES ====================

app.post('/api/badges', async (req, res) => {
  try {
    const { user_id, badge_id } = req.body;
    if (!user_id || !badge_id) {
      return res.status(400).json({ error: 'user_id and badge_id are required' });
    }
    const badge = await supabase.from('badges').select('*')
      .where('id', badge_id)
      .then(() => badge);
    res.json(badge);
  } catch (err) {
    console.error('Badge creation error:', err);
    res.status(500).json({ error: 'Failed to create badge' });
  }
});

app.get('/api/badges', async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) {
      return res.status(400).json({ error: 'user_id query param required' });
    }
    const badges = await supabase.from('badges').select('*')
      .where('user_id', userId)
      .order('created_at DESC')
      .then(() => badges);
    res.json(badges);
  } catch (err) {
    console.error('Badge fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch badges' });
  }
});

// ==================== WEIGHT HISTORY ====================

app.get('/api/weight-history', async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) {
      return res.status(400).json({ error: 'user_id query param required' });
    }
    const history = await supabase.from('weight_history').select('*')
      .where('user_id', userId)
      .order('record_date DESC')
      .then(() => history);
    res.json(history);
  } catch (err) {
    console.error('Weight history error:', err);
    res.status(500).json({ error: 'Failed to fetch weight history' });
  }
});

// ==================== WATER INTAKE ====================

app.post('/api/water-intake', async (req, res) => {
  try {
    const { user_id, amount_ml } = req.body;
    if (!user_id || !amount_ml) {
      return res.status(400).json({ error: 'user_id and amount_ml are required' });
    }
    const water = await supabase.from('water_intake').insert({
      user_id: String(user_id),
      amount_ml: Number(amount_ml),
      recorded_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    }).then(() => water);
    res.status(201).json(water);
  } catch (err) {
    console.error('Water intake error:', err);
    res.status(500).json({ error: 'Failed to create water intake entry' });
  }
});

app.get('/api/water-intake', async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) {
      return res.status(400).json({ error: 'user_id query param required' });
    }
    const intake = await supabase.from('water_intake').select('*')
      .where('user_id', userId)
      .order('recorded_at DESC')
      .then(() => intake);
    res.json(intake);
  } catch (err) {
    console.error('Water intake fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch water intake' });
  }
});

// ==================== BODY PROGRESS IMAGES ====================

app.post('/api/body-progress-images', async (req, res) => {
  try {
    const { user_id, daily_record_id, image_url, image_type } = req.body;
    if (!user_id || !daily_record_id) {
      return res.status(400).json({ error: 'user_id and daily_record_id are required' });
    }
    const image = await supabase.from('body_progress_images').insert({
      user_id: String(user_id),
      daily_record_id: String(daily_record_id),
      image_url: String(image_url),
      image_type: String(image_type) || 'front',
      created_at: new Date(),
      updated_at: new Date(),
    }).then(() => image);
    res.status(201).json(image);
  } catch (err) {
    console.error('Image upload error:', err);
    res.status(500).json({ error: 'Failed to upload body progress image' });
  }
});

app.get('/api/body-progress-images', async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) {
      return res.status(400).json({ error: 'user_id query param required' });
    }
    const images = await supabase.from('body_progress_images').select('*')
      .where('user_id', userId)
      .order('image_type ASC')
      .then(() => images);
    res.json(images);
  } catch (err) {
    console.error('Body progress fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch body progress images' });
  }
});

// ==================== HEALTH METRICS (aggregated) ====================

app.get('/api/health-summary', async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) {
      return res.status(400).json({ error: 'user_id query param required' });
    }
    const profileResult = await supabase.from('profiles').select('*')
      .where('id', userId)
      .order('updated_at DESC')
      .then(res => res.data[0]);

if (!profileResult) {
  return res.status(404).json({ error: 'Profile not found' });
}

const [dailyRecordsResult, foodsResult, exercisesResult] = await Promise.all([
  supabase.from('daily_records').select('*').where('user_id', userId).order('record_date DESC'),
  supabase.from('foods').select('*').where('user_id', userId),
  supabase.from('exercises').select('*').where('user_id', userId),
]);

const summary = {
  profile: {
    id: profileResult.id,
    name: profileResult.name,
    age: profileResult.age,
    height_cm: profileResult.height_cm,
    weight_kg: profileResult.weight_kg,
    gender: profileResult.gender,
    activity_level: profileResult.activity_level,
    bmr: profileResult.bmr,
    tdee: profileResult.tdee,
    calorie_goal: profileResult.calorie_goal,
  },
  daily_records: dailyRecordsResult.data,
  food_count: foodsResult.data.length,
  exercise_count: exercisesResult.data.length,
};

res.json(summary);
  } catch (err) {
    console.error('Health summary error:', err);
    res.status(500).json({ error: 'Failed to fetch health summary' });
  }
});

// Start server
app.listen(process.env.PORT || 3000, () => {
  console.log(`Fitness Backend running on http://localhost:${process.env.PORT || 3000}`);
});