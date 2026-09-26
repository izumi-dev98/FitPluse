-- Persist the nutrition targets shown on the Goals page.
ALTER TABLE goals ADD COLUMN IF NOT EXISTS target_calories DECIMAL(10,2);
ALTER TABLE goals ADD COLUMN IF NOT EXISTS protein_target DECIMAL(10,2);
ALTER TABLE goals ADD COLUMN IF NOT EXISTS fat_target DECIMAL(10,2);
ALTER TABLE goals ADD COLUMN IF NOT EXISTS carb_target DECIMAL(10,2);
ALTER TABLE goals ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_goals_user_status ON goals(user_id, status);
