import { z } from 'zod';

export const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 chars'),
  age: z.number().min(10, 'Age must be 10+').max(120),
  height_cm: z.number().min(100).max(300),
  weight_kg: z.number().min(20).max(500),
  gender: z.enum(['male', 'female', 'other']),
  activity_level: z.enum([
    'sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extremely_active',
  ]),
});

export const bmrSchema = z.object({
  gender: z.enum(['male', 'female', 'other']),
  weight_kg: z.number().positive(),
  height_cm: z.number().positive(),
  age: z.number().positive(),
});

export const goalSchema = z.object({
  user_id: z.string(),
  goal_type: z.enum([
    'skinny_to_fit', 'muscle_gain', 'weight_gain', 'maintain', 'fat_loss', 'weight_loss',
  ]),
  target_value: z.number().positive().optional(),
  current_value: z.number().optional(),
  start_date: z.string().optional(),
  target_date: z.string().optional(),
  status: z.enum(['active', 'completed', 'paused']).optional(),
});
