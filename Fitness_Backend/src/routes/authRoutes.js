import { Router } from 'express';
import { supabase, getUserClient } from '../config/supabase.js';

const router = Router();

router.post('/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password are required' });
    if (String(password).length < 6) return res.status(400).json({ error: 'password must be at least 6 characters' });

    const displayName = name ? String(name) : String(email).split('@')[0];
    const { data, error } = await supabase.auth.signUp({
      email: String(email),
      password: String(password),
      options: { data: { name: displayName } },
    });
    if (error) return res.status(400).json({ error: error.message });

    // The handle_new_user trigger creates the profile row automatically —
    // do NOT insert here (a previous fire-and-forget insert crashed the
    // request: PostgREST builders have .then but no .catch, and it also
    // used wrong column names, so the 201 was followed by a headers-sent
    // crash). Respond exactly once.
    return res.status(201).json({
      user: data.user,
      session: data.session,
      access_token: data.session?.access_token || null,
      refresh_token: data.session?.refresh_token || null,
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password are required' });

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

router.post('/refresh', async (req, res) => {
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

router.get('/me', async (req, res) => {
  try {
    if (!req.headers.authorization?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing Authorization: Bearer <access_token>' });
    }
    const userClient = getUserClient(req);
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return res.status(401).json({ error: 'Invalid or expired token' });
    const { data: profile } = await userClient.from('profiles').select('*').eq('id', user.id).maybeSingle();
    res.json({ user, profile });
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/change-password', async (req, res) => {
  try {
    if (!req.headers.authorization?.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing Authorization' });
    const userClient = getUserClient(req);
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return res.status(401).json({ error: 'Invalid token' });
    const { error } = await supabase.auth.updateUser({ password: req.body.new_password });
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true, message: 'Password updated' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

export default router;
