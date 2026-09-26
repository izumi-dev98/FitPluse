import { Router } from 'express';
import { supabase } from '../config/supabase.js';

const router = Router();
const stringValue = (value) => value == null ? null : String(value);
const numberValue = (value, fallback = 0) => Number(value) || fallback;

async function query(res, operation, errorMessage, status = 200) {
  try {
    const { data, error } = await operation();
    if (error) throw error;
    res.status(status).json(data || []);
  } catch (error) {
    console.error(errorMessage, error);
    res.status(500).json({ error: errorMessage });
  }
}

const collection = (path, table, order = 'created_at') => {
  router.get(path, (req, res) => {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ error: 'user_id query param required' });
    return query(res, () => supabase.from(table).select('*').eq('user_id', userId).order(order, { ascending: false }), `Failed to fetch ${table}`);
  });
};

router.post('/foods', async (req, res) => {
  const { user_id, name, serving_size, serving_unit, calories, protein, carbohydrates, fat, fiber } = req.body;
  if (!name || !serving_size || !serving_unit) return res.status(400).json({ error: 'name, serving_size and serving_unit are required' });
  const calculatedCalories = numberValue(protein) * 4 + numberValue(carbohydrates) * 4 + numberValue(fat) * 9;
  return query(res, () => supabase.from('foods').insert({ user_id: stringValue(user_id), name: String(name), serving_size: numberValue(serving_size), serving_unit: String(serving_unit), calories: calculatedCalories || numberValue(calories), protein: numberValue(protein), carbohydrates: numberValue(carbohydrates), fat: numberValue(fat), fiber: numberValue(fiber) }).select().single(), 'Failed to create food', 201);
});
router.put('/foods/:id', async (req, res) => {
  const { user_id, name, serving_size, serving_unit, calories, protein, carbohydrates, fat, fiber } = req.body;
  if (!name || !serving_size || !serving_unit) return res.status(400).json({ error: 'name, serving_size and serving_unit are required' });
  const calculatedCalories = numberValue(protein) * 4 + numberValue(carbohydrates) * 4 + numberValue(fat) * 9;
  return query(res, () => supabase.from('foods').update({ user_id: stringValue(user_id), name: String(name), serving_size: numberValue(serving_size), serving_unit: String(serving_unit), calories: calculatedCalories || numberValue(calories), protein: numberValue(protein), carbohydrates: numberValue(carbohydrates), fat: numberValue(fat), fiber: numberValue(fiber) }).eq('id', req.params.id).select().single(), 'Failed to update food');
});
router.delete('/foods/:id', async (req, res) => query(res, () => supabase.from('foods').delete().eq('id', req.params.id), 'Failed to delete food'));
router.get('/foods', (req, res) => { let request = supabase.from('foods').select('*').order('name', { ascending: true }); if (req.query.userId) request = request.eq('user_id', req.query.userId); return query(res, () => request, 'Failed to fetch foods'); });

router.post('/daily-foods', async (req, res) => {
  const { user_id, daily_record_id, food_id, meal_type, quantity, calories, protein, carbohydrates, fat } = req.body;
  if (!user_id || !food_id) return res.status(400).json({ error: 'user_id and food_id are required' });
  return query(res, () => supabase.from('daily_foods').insert({ user_id: String(user_id), daily_record_id: stringValue(daily_record_id), food_id: String(food_id), meal_type: meal_type ? String(meal_type) : 'Snack', quantity: numberValue(quantity, 1), calories: numberValue(calories), protein: numberValue(protein), carbohydrates: numberValue(carbohydrates), fat: numberValue(fat) }).select().single(), 'Failed to create daily food record', 201);
});
router.get('/daily-foods', (req, res) => { if (!req.query.userId) return res.status(400).json({ error: 'userId query param required' }); let request = supabase.from('daily_foods').select('*').eq('user_id', req.query.userId).order('created_at', { ascending: false }); if (req.query.dailyRecordId) request = request.eq('daily_record_id', req.query.dailyRecordId); return query(res, () => request, 'Failed to fetch daily foods'); });

router.post('/daily-records', async (req, res) => { const { user_id, record_date, calories_consumed, calories_burned, water_ml, steps, notes } = req.body; if (!user_id || !record_date) return res.status(400).json({ error: 'user_id and record_date are required' }); return query(res, () => supabase.from('daily_records').upsert({ user_id: String(user_id), record_date: String(record_date), calories_consumed: numberValue(calories_consumed), calories_burned: numberValue(calories_burned), water_ml: numberValue(water_ml), steps: numberValue(steps), notes: notes ? String(notes) : '' }, { onConflict: 'user_id,record_date' }).select().single(), 'Failed to create daily record', 201); });
router.get('/daily-records', (req, res) => { if (!req.query.userId) return res.status(400).json({ error: 'user_id query param required' }); return query(res, () => supabase.from('daily_records').select('*').eq('user_id', req.query.userId).order('record_date', { ascending: false }), 'Failed to fetch daily records'); });

router.post('/exercises', async (req, res) => { const { user_id, name, exercise_type, description, image_url } = req.body; if (!user_id || !name) return res.status(400).json({ error: 'user_id and name are required' }); return query(res, () => supabase.from('exercises').insert({ user_id: String(user_id), name: String(name), exercise_type: exercise_type ? String(exercise_type) : 'Strength', description: description ? String(description) : '', image_url: image_url ? String(image_url) : '' }).select().single(), 'Failed to create exercise', 201); });
router.put('/exercises/:id', async (req, res) => { const { user_id, name, exercise_type, description, image_url } = req.body; if (!user_id || !name) return res.status(400).json({ error: 'user_id and name are required' }); return query(res, () => supabase.from('exercises').update({ user_id: String(user_id), name: String(name), exercise_type: exercise_type ? String(exercise_type) : 'Strength', description: description ? String(description) : '', image_url: image_url ? String(image_url) : '' }).eq('id', req.params.id).select().single(), 'Failed to update exercise'); });
router.delete('/exercises/:id', async (req, res) => query(res, () => supabase.from('exercises').delete().eq('id', req.params.id), 'Failed to delete exercise'));
router.get('/exercises', (req, res) => { if (!req.query.userId) return res.status(400).json({ error: 'user_id query param required' }); return query(res, () => supabase.from('exercises').select('*').eq('user_id', req.query.userId).order('name', { ascending: true }), 'Failed to fetch exercises'); });
router.post('/daily-exercises', async (req, res) => { const { user_id, daily_record_id, exercise_id, sets, reps, duration_minutes, calories_burned, distance_km } = req.body; if (!user_id || !exercise_id) return res.status(400).json({ error: 'user_id and exercise_id are required' }); return query(res, () => supabase.from('daily_exercises').insert({ user_id: String(user_id), daily_record_id: stringValue(daily_record_id), exercise_id: String(exercise_id), sets: numberValue(sets), reps: numberValue(reps), duration_minutes: numberValue(duration_minutes), calories_burned: numberValue(calories_burned), distance_km: numberValue(distance_km) }).select().single(), 'Failed to create daily exercise record', 201); });
router.get('/daily-exercises', (req, res) => { if (!req.query.userId) return res.status(400).json({ error: 'userId query param required' }); return query(res, () => supabase.from('daily_exercises').select('*').eq('user_id', req.query.userId).order('created_at', { ascending: false }), 'Failed to fetch daily exercises'); });

router.post('/goals', async (req, res) => { const { user_id, goal_type, target_value, target_calories, protein_target, fat_target, carb_target, start_date, target_date, status } = req.body; if (!user_id || !goal_type) return res.status(400).json({ error: 'user_id and goal_type are required' }); return query(res, () => supabase.from('goals').insert({ user_id: String(user_id), goal_type: String(goal_type), target_value: numberValue(target_value ?? target_calories), target_calories: numberValue(target_calories ?? target_value), protein_target: numberValue(protein_target), fat_target: numberValue(fat_target), carb_target: numberValue(carb_target), current_value: 0, start_date: stringValue(start_date), target_date: stringValue(target_date), status: status ? String(status) : 'active', updated_at: new Date() }).select().single(), 'Failed to create goal', 201); });
router.put('/goals/:id', async (req, res) => { const { status } = req.body; if (!status) return res.status(400).json({ error: 'status is required' }); return query(res, () => supabase.from('goals').update({ status: String(status), updated_at: new Date() }).eq('id', req.params.id).select().single(), 'Failed to update goal'); });
router.delete('/goals/:id', async (req, res) => query(res, () => supabase.from('goals').delete().eq('id', req.params.id), 'Failed to delete goal'));
router.get('/goals', (req, res) => { if (!req.query.userId) return res.status(400).json({ error: 'user_id query param required' }); return query(res, () => supabase.from('goals').select('*').eq('user_id', req.query.userId).order('created_at', { ascending: false }), 'Failed to fetch goals'); });

router.post('/weight-history', async (req, res) => { const { user_id, weight, body_fat } = req.body; if (!user_id || !weight) return res.status(400).json({ error: 'user_id and weight are required' }); return query(res, () => supabase.from('weight_history').insert({ user_id: String(user_id), weight: Number(weight), body_fat: body_fat ? Number(body_fat) : null, recorded_at: new Date() }).select().single(), 'Failed to log weight', 201); });
collection('/weight-history', 'weight_history', 'recorded_at');
router.post('/water-intake', async (req, res) => { const { user_id, amount_ml } = req.body; if (!user_id || !amount_ml) return res.status(400).json({ error: 'user_id and amount_ml are required' }); return query(res, () => supabase.from('water_intake').insert({ user_id: String(user_id), amount_ml: Number(amount_ml) }).select().single(), 'Failed to create water intake entry', 201); });
collection('/water-intake', 'water_intake', 'recorded_at');
router.post('/storage/:bucket', (req, res) => { const { bucket } = req.params; const { fileName, file } = req.body; if (!fileName || !file) return res.status(400).json({ error: 'fileName and file are required' }); res.json({ path: `${bucket}/${fileName}`, bucket, fileName }); });

export default router;
