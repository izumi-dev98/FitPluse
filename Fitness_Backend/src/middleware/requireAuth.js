import { supabase } from '../config/supabase.js';

function tokenFrom(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return null;
  return header.slice(7).trim() || null;
}

// Rejects requests without a valid Supabase access token.
// Attaches the authenticated user as req.authUser.
export async function requireAuth(req, res, next) {
  try {
    const token = tokenFrom(req);
    if (!token) return res.status(401).json({ error: 'Missing Authorization: Bearer <access_token>' });
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) return res.status(401).json({ error: 'Invalid or expired access token' });
    req.authUser = data.user;
    next();
  } catch (err) {
    console.error(`[${req.id}] auth verification failed`, err);
    res.status(401).json({ error: 'Invalid or expired access token' });
  }
}

// Must run after requireAuth. When the request carries a user_id
// (body.user_id, ?userId=, ?user_id=), it must match the token owner.
// Routes that identify the user from the token alone are unaffected.
export function requireOwner(req, res, next) {
  const claimed = req.body?.user_id ?? req.query?.userId ?? req.query?.user_id;
  if (claimed !== undefined && claimed !== null && String(claimed) !== String(req.authUser?.id)) {
    return res.status(403).json({ error: 'You can only access your own data' });
  }
  next();
}
