import { Router } from 'express';
import { supabase, getUserClient } from '../config/supabase.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    if (!req.headers.authorization?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing Authorization: Bearer <access_token>' });
    }
    const userClient = getUserClient(req);
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return res.status(401).json({ error: 'Invalid or expired token' });
    const { data, error } = await userClient.from('profiles').select('*').eq('id', user.id).maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Profile not found' });
    res.json(data);
  } catch (err) {
    console.error('Profile fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', req.params.id).maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Profile not found' });
    res.json(data);
  } catch (err) {
    console.error('Profile fetch by ID error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const profileFields = ['name', 'age', 'height_cm', 'weight_kg', 'gender', 'activity_level'];

function getProfilePayload(body) {
  return {
    name: body.name,
    age: Number(body.age),
    height_cm: Number(body.height_cm),
    weight_kg: Number(body.weight_kg),
    gender: body.gender,
    activity_level: body.activity_level,
    bmr: null,
    tdee: null,
    calorie_goal: null,
    updated_at: new Date(),
  };
}

function hasRequiredProfileFields(body) {
  return profileFields.every((field) => body[field]);
}

router.post('/', async (req, res) => {
  try {
    if (!hasRequiredProfileFields(req.body)) return res.status(400).json({ error: 'Missing required fields' });
    const { data, error } = await supabase.from('profiles').insert({
      ...getProfilePayload(req.body),
      created_at: new Date(),
    }).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('Profile creation error:', err);
    res.status(500).json({ error: 'Failed to create profile' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    if (!hasRequiredProfileFields(req.body)) return res.status(400).json({ error: 'Missing required fields' });
    const { data, error } = await supabase.from('profiles').update(getProfilePayload(req.body))
      .eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('profiles').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('Profile delete error:', err);
    res.status(500).json({ error: 'Failed to delete profile' });
  }
});

export default router;
