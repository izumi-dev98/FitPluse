import { Router } from 'express';
import { supabase, supabaseAdmin, getUserClient } from '../config/supabase.js';

const router = Router();

function requireBearer(req, res) {
  if (!req.headers.authorization?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing Authorization: Bearer <access_token>' });
    return false;
  }
  return true;
}

async function currentUser(req) {
  const client = getUserClient(req);
  const { data: { user }, error } = await client.auth.getUser();
  return { client, user, error };
}

router.get('/user-badges', async (req, res) => {
  try {
    if (!requireBearer(req, res)) return;
    const { client, user, error } = await currentUser(req);
    if (error || !user) return res.status(401).json({ error: 'Invalid or expired token' });
    if (!req.query.userId) return res.status(400).json({ error: 'user_id query param required' });
    if (String(req.query.userId) !== user.id) return res.status(403).json({ error: 'Can only view your own badges' });
    const result = await client.from('user_badges').select('*').eq('user_id', user.id).order('earned_at', { ascending: false });
    if (result.error) throw result.error;
    res.json(result.data || []);
  } catch (error) { console.error('User badges fetch error:', error); res.status(500).json({ error: 'Failed to fetch user badges' }); }
});

async function awardBadge(req, res) {
  try {
    if (!requireBearer(req, res)) return;
    const { client, user, error } = await currentUser(req);
    if (error || !user) return res.status(401).json({ error: 'Invalid or expired token' });
    const { user_id, badge_id } = req.body;
    if (!user_id || !badge_id) return res.status(400).json({ error: 'user_id and badge_id are required' });
    if (String(user_id) !== user.id) return res.status(403).json({ error: 'Can only award badges to yourself' });
    const result = await client.from('user_badges').upsert({ user_id: user.id, badge_id: String(badge_id), earned_at: new Date().toISOString() }, { onConflict: 'user_id,badge_id', ignoreDuplicates: true }).select();
    if (result.error) { if (result.error.code === '23503') return res.status(400).json({ error: 'Badge does not exist' }); throw result.error; }
    if (result.data?.[0]) return res.status(201).json(result.data[0]);
    const existing = await client.from('user_badges').select('*').eq('user_id', user.id).eq('badge_id', String(badge_id)).maybeSingle();
    if (existing.error) throw existing.error;
    res.json({ ...existing.data, already_earned: true });
  } catch (error) { console.error('Badge award error:', error); res.status(500).json({ error: 'Failed to award badge' }); }
}
router.post('/user-badges', awardBadge);
router.post('/badges', awardBadge);
function badgeGoalType(name) {
  const labels = {
    'Skinny -> Fit': 'skinny_to_fit',
    'Muscle Gain': 'muscle_gain',
    'Weight Gain': 'weight_gain',
    'Fit / Maintain': 'maintain',
    'Fat Loss': 'fat_loss',
    'Weight Loss': 'weight_loss',
  };
  return Object.entries(labels).find(([label]) => name.startsWith(label))?.[1] || null;
}

function currentLoggingStreak(records) {
  const dates = new Set(records.filter((record) => Number(record.calories_consumed) > 0 || Number(record.calories_burned) > 0 || Number(record.water_ml) > 0 || Number(record.steps) > 0).map((record) => record.record_date));
  let streak = 0;
  const cursor = new Date();
  for (let index = 0; index < 365; index += 1) {
    if (!dates.has(cursor.toISOString().slice(0, 10))) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return { dates, streak };
}

router.get('/badges', async (req, res) => {
  try {
    if (!requireBearer(req, res)) return;
    const { client, user, error } = await currentUser(req);
    if (error || !user) return res.status(401).json({ error: 'Invalid or expired token' });
    if (req.query.userId && String(req.query.userId) !== user.id) return res.status(403).json({ error: 'Can only view your own badges' });
    const badges = await client.from('badges').select('*').order('created_at', { ascending: true });
    if (badges.error) throw badges.error;
    const [goals, records] = await Promise.all([
      client.from('goals').select('goal_type, status, target_calories, target_value').eq('user_id', user.id),
      client.from('daily_records').select('record_date, calories_consumed, calories_burned, water_ml, steps').eq('user_id', user.id),
    ]);
    if (goals.error) throw goals.error;
    if (records.error) throw records.error;
    const { dates, streak } = currentLoggingStreak(records.data || []);
    const activeGoal = (goals.data || []).find((goal) => goal.status === 'active');
    const targetCalories = Number(activeGoal?.target_calories ?? activeGoal?.target_value) || 0;
    const scored = targetCalories > 0 ? (records.data || []).filter((record) => Number(record.calories_consumed) > 0) : [];
    const adherence = scored.length ? scored.filter((record) => Math.abs(Number(record.calories_consumed) - targetCalories) / targetCalories <= 0.1).length / scored.length * 100 : 0;
    const earnedCandidates = (badges.data || []).filter((badge) => {
      const goalType = badgeGoalType(badge.name);
      if (!goalType) return false;
      const level = badge.name.split(' ').pop()?.toLowerCase();
      if (level === 'starter') return activeGoal?.goal_type === goalType;
      if (level === 'momentum') return activeGoal?.goal_type === goalType && streak >= 14;
      if (level === 'dedicated') return activeGoal?.goal_type === goalType && streak >= 30;
      if (level === 'master') return activeGoal?.goal_type === goalType && scored.length >= 30 && adherence >= 90;
      if (level === 'legend') return (goals.data || []).some((goal) => goal.goal_type === goalType && goal.status === 'completed');
      return false;
    });
    if (earnedCandidates.length) {
      const earnedRows = await client.from('user_badges').upsert(earnedCandidates.map((badge) => ({ user_id: user.id, badge_id: badge.id })), { onConflict: 'user_id,badge_id', ignoreDuplicates: true });
      if (earnedRows.error) throw earnedRows.error;
    }
    const earned = await client.from('user_badges').select('badge_id, earned_at').eq('user_id', user.id);
    const validEarnedIds = new Set(earnedCandidates.map((badge) => badge.id));
    const earnedMap = new Map((earned.data || []).filter((item) => validEarnedIds.has(item.badge_id)).map((item) => [item.badge_id, item.earned_at]));
    res.json((badges.data || []).map((badge) => ({ ...badge, earned: earnedMap.has(badge.id), earned_at: earnedMap.get(badge.id) || null })));
  } catch (error) { console.error('Badge fetch error:', error); res.status(500).json({ error: 'Failed to fetch badges' }); }
});

router.post('/body-progress-images', async (req, res) => {
  try {
    const { user_id, image_url, image_type, daily_record_id } = req.body;
    if (!user_id || !image_url) return res.status(400).json({ error: 'user_id and image_url are required' });
    let recordId = daily_record_id ? String(daily_record_id) : null;
    if (!recordId) {
      const today = new Date().toISOString().slice(0, 10);
      let record = await supabaseAdmin.from('daily_records').select('id').eq('user_id', user_id).eq('record_date', today).maybeSingle();
      if (record.error) throw record.error;
      if (!record.data) record = await supabaseAdmin.from('daily_records').insert({ user_id: String(user_id), record_date: today, calories_consumed: 0, calories_burned: 0, water_ml: 0, steps: 0, notes: '' }).select('id').single();
      if (record.error) throw record.error;
      recordId = record.data.id;
    }
    const result = await supabaseAdmin.from('body_progress_images').insert({ user_id: String(user_id), image_url: String(image_url), image_type: image_type ? String(image_type) : 'front', daily_record_id: recordId, created_at: new Date() }).select().single();
    if (result.error) throw result.error;
    res.status(201).json(result.data);
  } catch (error) { console.error('Image upload error:', error); res.status(500).json({ error: 'Failed to upload body progress image' }); }
});
router.get('/body-progress-images', async (req, res) => { if (!req.query.userId) return res.status(400).json({ error: 'user_id query param required' }); const result = await supabaseAdmin.from('body_progress_images').select('*').eq('user_id', req.query.userId).order('created_at', { ascending: false }); if (result.error) return res.status(500).json({ error: 'Failed to fetch body progress images' }); res.json(result.data || []); });

router.get('/health-summary', async (req, res) => {
  try {
    if (!req.query.userId) return res.status(400).json({ error: 'user_id query param required' });
    const userId = req.query.userId;
    const profile = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (profile.error) throw profile.error;
    if (!profile.data) return res.status(404).json({ error: 'Profile not found' });
    const [records, foods, exercises] = await Promise.all([supabase.from('daily_records').select('*').eq('user_id', userId).order('record_date', { ascending: false }), supabase.from('foods').select('*').eq('user_id', userId), supabase.from('exercises').select('*').eq('user_id', userId)]);
    res.json({ profile: profile.data, daily_records: records.data, food_count: foods.data?.length || 0, exercise_count: exercises.data?.length || 0 });
  } catch (error) { console.error('Health summary error:', error); res.status(500).json({ error: 'Failed to fetch health summary' }); }
});

export default router;
