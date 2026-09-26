import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { supabase, supabaseAdmin, getUserClient } from './config/supabase.js';
import { calculateBMR, calculateTDEE, calculateCalorieTarget, calculateProteinTarget, calculateFatTarget, calculateMacros } from './utils/calculator.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('combined'));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ==================== AUTH (backend-handled login) ====================

// Signup — creates auth user, trigger auto-creates public.profiles
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: 'password must be at least 6 characters' });
    }
    const { data, error } = await supabase.auth.signUp({
      email: String(email),
      password: String(password),
      options: { data: { name: name ? String(name) : String(email).split('@')[0] } },
    });
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json({
      user: data.user,
      session: data.session, // null if email confirmation enabled
      access_token: data.session?.access_token || null,
      refresh_token: data.session?.refresh_token || null,
    });

    // Auto-create profile
    try {
      await supabase.from('profiles').insert({
        id: data.user.id,
        name: name ? String(name) : String(email).split('@')[0],
        age: null,
        height_cm: null,
        weight_kg: null,
        gender: null,
        activity_level: 'moderately_active',
        bmr: null,
        tdee: null,
        calorie_goal: null,
        created_at: new Date(),
        updated_at: new Date(),
      }).select().single().catch(() => {});
    } catch {}
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login — returns access_token for Postman Authorization header
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email: String(email),
      password: String(password),
    });
    if (error) return res.status(401).json({ error: error.message });
    res.json({
      user: data.user,
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Refresh session
app.post('/api/auth/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) return res.status(400).json({ error: 'refresh_token is required' });
    const { data, error } = await supabase.auth.refreshSession({ refresh_token: String(refresh_token) });
    if (error) return res.status(401).json({ error: error.message });
    res.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
    });
  } catch (err) {
    console.error('Refresh error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Me — validates Bearer token, returns user + profile
app.get('/api/auth/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing Authorization: Bearer <access_token>' });
    }
    const userClient = getUserClient(req);
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return res.status(401).json({ error: 'Invalid or expired token' });
    const { data: profile } = await userClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    res.json({ user, profile });
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== PROFILES ====================

// Get own profile — requires Authorization: Bearer <access_token>
app.get('/api/profiles', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing Authorization: Bearer <access_token>' });
    }
    const userClient = getUserClient(req);
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    const { data, error } = await userClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Profile not found' });
    res.json(data);
  } catch (err) {
    console.error('Profile fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get profile by ID (public or with auth)
app.get('/api/profiles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Profile not found' });
    res.json(data);
  } catch (err) {
    console.error('Profile fetch by ID error:', err);
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
    const { data, error } = await supabase.from('profiles').insert({
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
    }).select().single();
    if (error) throw error;
    res.status(201).json(data);
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
    const { data, error } = await supabase.from('profiles').update({
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
    }).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Delete profile
app.delete('/api/profiles/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('profiles').delete().where({ id: req.params.id });
    if (error) throw error;
    res.json({ success: true });
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
    const { user_id, name, serving_size, serving_unit, calories, protein, carbohydrates, fat, fiber } = req.body;
    if (!name || !serving_size || !serving_unit) {
      return res.status(400).json({ error: 'name, serving_size and serving_unit are required' });
    }
    const { data, error } = await supabase.from('foods').insert({
      user_id: user_id ? String(user_id) : null,
      name: String(name),
      serving_size: Number(serving_size),
      serving_unit: String(serving_unit),
      calories: Number(calories) || 0,
      protein: Number(protein) || 0,
      carbohydrates: Number(carbohydrates) || 0,
      fat: Number(fat) || 0,
      fiber: Number(fiber) || 0,
    }).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('Food creation error:', err);
    res.status(500).json({ error: 'Failed to create food' });
  }
});

app.get('/api/foods', async (req, res) => {
  try {
    const userId = req.query.userId;
    let q = supabase.from('foods').select('*').order('name', { ascending: true });
    if (userId) q = q.eq('user_id', userId);
    const { data, error } = await q;
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('Foods fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch foods' });
  }
});

// ==================== DAILY FOODS ====================

app.post('/api/daily-foods', async (req, res) => {
  try {
    const { user_id, daily_record_id, food_id, meal_type, quantity, calories, protein, carbohydrates, fat } = req.body;
    if (!user_id || !food_id) {
      return res.status(400).json({ error: 'user_id and food_id are required' });
    }
    const { data, error } = await supabase.from('daily_foods').insert({
      user_id: String(user_id),
      daily_record_id: daily_record_id ? String(daily_record_id) : null,
      food_id: String(food_id),
      meal_type: meal_type ? String(meal_type) : 'Snack',
      quantity: Number(quantity) || 1,
      calories: Number(calories) || 0,
      protein: Number(protein) || 0,
      carbohydrates: Number(carbohydrates) || 0,
      fat: Number(fat) || 0,
    }).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('Daily food creation error:', err);
    res.status(500).json({ error: 'Failed to create daily food record' });
  }
});

app.get('/api/daily-foods', async (req, res) => {
  try {
    const userId = req.query.userId;
    const dailyRecordId = req.query.dailyRecordId;
    if (!userId) return res.status(400).json({ error: 'userId query param required' });
    let q = supabase.from('daily_foods').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (dailyRecordId) q = q.eq('daily_record_id', dailyRecordId);
    const { data, error } = await q;
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('Daily foods fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch daily foods' });
  }
});

// ==================== DAILY RECORDS ====================

app.post('/api/daily-records', async (req, res) => {
  try {
    const { user_id, record_date, calories_consumed, calories_burned, water_ml, steps, notes } = req.body;
    if (!user_id || !record_date) {
      return res.status(400).json({ error: 'user_id and record_date are required' });
    }
    const { data, error } = await supabase.from('daily_records').upsert({
      user_id: String(user_id),
      record_date: String(record_date),
      calories_consumed: Number(calories_consumed) || 0,
      calories_burned: Number(calories_burned) || 0,
      water_ml: Number(water_ml) || 0,
      steps: Number(steps) || 0,
      notes: notes ? String(notes) : '',
    }, { onConflict: 'user_id,record_date' }).select().single();
    if (error) throw error;
    res.status(201).json(data);
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
    const { data, error } = await supabase.from('daily_records').select('*')
      .eq('user_id', String(userId))
      .order('record_date', { ascending: false });
    if (error) throw error;
    res.json(data || []);
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
    const { data, error } = await supabase.from('exercises').insert({
      user_id: String(user_id),
      name: String(name),
      exercise_type: exercise_type ? String(exercise_type) : 'Strength',
      description: description ? String(description) : '',
      image_url: image_url ? String(image_url) : '',
    }).select().single();
    if (error) throw error;
    res.status(201).json(data);
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
    const { data, error } = await supabase.from('exercises').select('*')
      .eq('user_id', String(userId))
      .order('name', { ascending: true });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('Exercise fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch exercises' });
  }
});

// ==================== DAILY EXERCISES ====================

app.post('/api/daily-exercises', async (req, res) => {
  try {
    const { user_id, daily_record_id, exercise_id, sets, reps, duration_minutes, calories_burned, distance_km } = req.body;
    if (!user_id || !exercise_id) {
      return res.status(400).json({ error: 'user_id and exercise_id are required' });
    }
    const { data, error } = await supabase.from('daily_exercises').insert({
      user_id: String(user_id),
      daily_record_id: daily_record_id ? String(daily_record_id) : null,
      exercise_id: String(exercise_id),
      sets: Number(sets) || 0,
      reps: Number(reps) || 0,
      duration_minutes: Number(duration_minutes) || 0,
      calories_burned: Number(calories_burned) || 0,
      distance_km: Number(distance_km) || 0,
    }).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('Daily exercise creation error:', err);
    res.status(500).json({ error: 'Failed to create daily exercise record' });
  }
});

app.get('/api/daily-exercises', async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ error: 'userId query param required' });
    const { data, error } = await supabase.from('daily_exercises').select('*')
      .eq('user_id', String(userId))
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('Daily exercises fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch daily exercises' });
  }
});

// ==================== GOALS ====================

app.post('/api/goals', async (req, res) => {
  try {
    const { user_id, goal_type, target_value, target_calories, protein_target, fat_target, carb_target, start_date, target_date, status } = req.body;
    if (!user_id || !goal_type) {
      return res.status(400).json({ error: 'user_id and goal_type are required' });
    }
    const val = Number(target_value ?? target_calories) || 0;
    const { data, error } = await supabase.from('goals').insert({
      user_id: String(user_id),
      goal_type: String(goal_type),
      target_value: val,
      current_value: 0,
      start_date: start_date ? String(start_date) : null,
      target_date: target_date ? String(target_date) : null,
      status: status ? String(status) : 'active',
    }).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('Goal creation error:', err);
    res.status(500).json({ error: 'Failed to create goal: ' + err.message });
  }
});

app.get('/api/goals', async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) {
      return res.status(400).json({ error: 'user_id query param required' });
    }
    const { data, error } = await supabase.from('goals').select('*')
      .eq('user_id', String(userId))
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('Goal fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch goals' });
  }
});

// ==================== CHANGE PASSWORD ====================

app.post('/api/auth/change-password', async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing Authorization' });
    }
    const userClient = getUserClient(req);
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return res.status(401).json({ error: 'Invalid token' });

    // Update password via Supabase
    const { error } = await supabase.auth.updateUser({ password: new_password });
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true, message: 'Password updated' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// ==================== WEIGHT HISTORY ====================

app.post('/api/weight-history', async (req, res) => {
  try {
    const { user_id, weight, body_fat } = req.body;
    if (!user_id || !weight) {
      return res.status(400).json({ error: 'user_id and weight are required' });
    }
    const { data, error } = await supabase.from('weight_history').insert({
      user_id: String(user_id),
      weight: Number(weight),
      body_fat: body_fat ? Number(body_fat) : null,
      recorded_at: new Date(),
    }).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('Weight history creation error:', err);
    res.status(500).json({ error: 'Failed to log weight' });
  }
});

// ==================== USER BADGES ====================

// Earned badges for the caller — requires Authorization: Bearer <access_token>.
// userId must match the token owner (mirrors the user_badges RLS policy).
app.get('/api/user-badges', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing Authorization: Bearer <access_token>' });
    }
    const userClient = getUserClient(req);
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    const userId = req.query.userId;
    if (!userId) {
      return res.status(400).json({ error: 'user_id query param required' });
    }
    if (String(userId) !== user.id) {
      return res.status(403).json({ error: 'Can only view your own badges' });
    }
    const { data, error } = await userClient.from('user_badges').select('*')
      .eq('user_id', user.id)
      .order('earned_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('User badges fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch user badges' });
  }
});

// ==================== BADGES ====================

// Award a badge to the caller — idempotent via UNIQUE(user_id, badge_id).
// Correct route is POST /api/user-badges; POST /api/badges kept as deprecated alias.
async function awardBadge(req, res) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing Authorization: Bearer <access_token>' });
    }
    const userClient = getUserClient(req);
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    const { user_id, badge_id } = req.body;
    if (!user_id || !badge_id) {
      return res.status(400).json({ error: 'user_id and badge_id are required' });
    }
    if (String(user_id) !== user.id) {
      return res.status(403).json({ error: 'Can only award badges to yourself' });
    }
    const { data, error } = await userClient.from('user_badges').upsert({
      user_id: user.id,
      badge_id: String(badge_id),
      earned_at: new Date().toISOString(),
    }, { onConflict: 'user_id,badge_id', ignoreDuplicates: true }).select();
    if (error) {
      if (error.code === '23503') {
        return res.status(400).json({ error: 'Badge does not exist' });
      }
      throw error;
    }
    if (data?.[0]) return res.status(201).json(data[0]);
    // Already earned — return the existing row.
    const { data: existing, error: fetchError } = await userClient.from('user_badges')
      .select('*')
      .eq('user_id', user.id)
      .eq('badge_id', String(badge_id))
      .maybeSingle();
    if (fetchError) throw fetchError;
    res.status(200).json({ ...existing, already_earned: true });
  } catch (err) {
    console.error('Badge award error:', err);
    res.status(500).json({ error: 'Failed to award badge' });
  }
}

app.post('/api/user-badges', awardBadge);
app.post('/api/badges', awardBadge); // deprecated alias

app.get('/api/badges', async (req, res) => {
  try {
    // Badge catalog is global, but RLS needs an authenticated caller.
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing Authorization: Bearer <access_token>' });
    }
    const userClient = getUserClient(req);
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    // Return all available badges (global list)
    const { data, error } = await userClient.from('badges').select('*')
      .order('created_at', { ascending: true });
    if (error) throw error;
    // Mark which ones the caller has earned (userId param accepted only if it matches the token owner)
    const userId = req.query.userId ? String(req.query.userId) : user.id;
    if (userId !== user.id) {
      return res.status(403).json({ error: 'Can only view your own badges' });
    }
    const { data: ub } = await userClient.from('user_badges').select('badge_id, earned_at').eq('user_id', user.id);
    const userBadges = ub || [];
    const userBadgeIds = userBadges.map((b) => b.badge_id);
    const badgesWithStatus = (data || []).map((badge) => {
      const earned = userBadgeIds.includes(badge.id);
      let earned_at = null;
      if (earned) {
        const found = userBadges.find((u) => u.badge_id === badge.id);
        if (found) earned_at = found.earned_at;
      }
      return { ...badge, earned, earned_at };
    });
    res.json(badgesWithStatus);
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
    const { data, error } = await supabase.from('weight_history').select('*')
      .eq('user_id', userId)
      .order('recorded_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
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
    const { data, error } = await supabase.from('water_intake').insert({
      user_id: String(user_id),
      amount_ml: Number(amount_ml),
      recorded_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    }).select().single();
    if (error) throw error;
    res.status(201).json(data);
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
    const { data, error } = await supabase.from('water_intake').select('*')
      .eq('user_id', userId)
      .order('recorded_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('Water intake fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch water intake' });
  }
});

// ==================== BODY PROGRESS IMAGES ====================

app.post('/api/body-progress-images', async (req, res) => {
  try {
    const { user_id, image_url, image_type, daily_record_id } = req.body;
    if (!user_id || !image_url) {
      return res.status(400).json({ error: 'user_id and image_url are required' });
    }

    // If no daily_record_id provided, find or create today's daily record
    let finalDailyRecordId = daily_record_id ? String(daily_record_id) : null;
    if (!finalDailyRecordId) {
      const today = new Date().toISOString().slice(0, 10);
      // Try to find existing record
      let { data: existingRecord } = await supabaseAdmin
        .from('daily_records')
        .select('id')
        .eq('user_id', user_id)
        .eq('record_date', today)
        .maybeSingle();
      
      if (!existingRecord) {
        // Create new daily record
        const { data: newRecord, error: createError } = await supabaseAdmin
          .from('daily_records')
          .insert({
            user_id: String(user_id),
            record_date: today,
            calories_consumed: 0,
            calories_burned: 0,
            water_ml: 0,
            steps: 0,
            notes: '',
          })
          .select()
          .single();
        if (createError) throw createError;
        finalDailyRecordId = newRecord.id;
      } else {
        finalDailyRecordId = existingRecord.id;
      }
    }

    const insertData = {
      user_id: String(user_id),
      image_url: String(image_url),
      image_type: String(image_type) || 'front',
      daily_record_id: finalDailyRecordId,
      created_at: new Date(),
    };
    const image = await supabaseAdmin.from('body_progress_images').insert(insertData).select().single();
    if (image.error) throw image.error;
    res.status(201).json(image.data);
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
    const { data, error } = await supabaseAdmin.from('body_progress_images').select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('Body progress fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch body progress images' });
  }
});

// ==================== STORAGE ====================

app.post('/api/storage/:bucket', async (req, res) => {
  try {
    const { bucket } = req.params;
    const { fileName, file } = req.body;
    if (!fileName || !file) {
      return res.status(400).json({ error: 'fileName and file are required' });
    }
    // In a full implementation, this would upload to Supabase Storage
    // For now, return the storage path
    const filePath = `${bucket}/${fileName}`;
    res.json({ path: filePath, bucket, fileName });
  } catch (err) {
    console.error('Storage error:', err);
    res.status(500).json({ error: 'Storage upload failed' });
  }
});

// ==================== HEALTH METRICS (aggregated) ====================

app.get('/api/health-summary', async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) {
      return res.status(400).json({ error: 'user_id query param required' });
    }
    const { data: profileData, error: profileError } = await supabase.from('profiles').select('*')
      .eq('id', userId)
      .order('updated_at', { ascending: false })
      .limit(1);
    if (profileError) throw profileError;
    const profileResult = profileData?.[0];
    if (!profileResult) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const [dailyRecordsResult, foodsResult, exercisesResult] = await Promise.all([
      supabase.from('daily_records').select('*').eq('user_id', userId).order('record_date', { ascending: false }),
      supabase.from('foods').select('*').eq('user_id', userId),
      supabase.from('exercises').select('*').eq('user_id', userId),
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