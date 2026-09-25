-- Supabase Fitness Database Schema
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles (linked to auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    age INT,
    height_cm DECIMAL(5,2),
    weight_kg DECIMAL(5,2),
    gender TEXT,
    activity_level TEXT,
    bmr DECIMAL(8,2),
    tdee DECIMAL(8,2),
    calorie_goal DECIMAL(8,2),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Weight History
CREATE TABLE weight_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    weight_kg DECIMAL(5,2) NOT NULL,
    height_cm DECIMAL(5,2),
    body_fat_percentage DECIMAL(5,2),
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Daily Records
CREATE TABLE daily_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    record_date DATE NOT NULL,
    calories_consumed DECIMAL(8,2) DEFAULT 0,
    calories_burned DECIMAL(8,2) DEFAULT 0,
    water_ml INT DEFAULT 0,
    steps INT DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, record_date)
);

-- 4. Foods
CREATE TABLE foods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    serving_size DECIMAL(8,2),
    serving_unit TEXT,
    calories DECIMAL(8,2),
    protein DECIMAL(8,2),
    carbohydrates DECIMAL(8,2),
    fat DECIMAL(8,2),
    fiber DECIMAL(8,2),
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Daily Foods
CREATE TABLE daily_foods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    daily_record_id UUID NOT NULL REFERENCES daily_records(id) ON DELETE CASCADE,
    food_id UUID REFERENCES foods(id) ON DELETE SET NULL,
    meal_type TEXT,
    quantity DECIMAL(8,2) NOT NULL,
    calories DECIMAL(8,2),
    protein DECIMAL(8,2),
    carbohydrates DECIMAL(8,2),
    fat DECIMAL(8,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Exercises
CREATE TABLE exercises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    exercise_type TEXT,
    description TEXT,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Daily Exercises
CREATE TABLE daily_exercises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    daily_record_id UUID NOT NULL REFERENCES daily_records(id) ON DELETE CASCADE,
    exercise_id UUID REFERENCES exercises(id) ON DELETE SET NULL,
    sets INT,
    reps INT,
    duration_minutes INT,
    calories_burned DECIMAL(8,2),
    distance_km DECIMAL(8,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Body Progress Images
CREATE TABLE body_progress_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    daily_record_id UUID NOT NULL REFERENCES daily_records(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    image_type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Badges
CREATE TABLE badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    image_url TEXT,
    requirement_type TEXT,
    requirement_value INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. User Badges
CREATE TABLE user_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, badge_id)
);

-- 11. Goals
CREATE TABLE goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    goal_type TEXT NOT NULL,
    target_value DECIMAL(10,2),
    current_value DECIMAL(10,2) DEFAULT 0,
    start_date DATE,
    target_date DATE,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Water Intake
CREATE TABLE water_intake (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    amount_ml INT NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_weight_history_user_recorded ON weight_history(user_id, recorded_at DESC);
CREATE INDEX idx_daily_records_user_date ON daily_records(user_id, record_date DESC);
CREATE INDEX idx_daily_foods_user ON daily_foods(user_id);
CREATE INDEX idx_daily_foods_record ON daily_foods(daily_record_id);
CREATE INDEX idx_daily_exercises_user ON daily_exercises(user_id);
CREATE INDEX idx_daily_exercises_record ON daily_exercises(daily_record_id);
CREATE INDEX idx_goals_user ON goals(user_id);
CREATE INDEX idx_water_intake_user ON water_intake(user_id);
CREATE INDEX idx_body_progress_user ON body_progress_images(user_id);
CREATE INDEX idx_badges_user ON user_badges(user_id);

-- Row Level Security (RLS) policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_progress_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE water_intake ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view own weight history" ON weight_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weight history" ON weight_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own daily records" ON daily_records
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily records" ON daily_records
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily records" ON daily_records
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own foods" ON foods
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own foods" ON foods
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own foods" ON foods
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own foods" ON foods
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own daily foods" ON daily_foods
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily foods" ON daily_foods
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own exercises" ON exercises
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own exercises" ON exercises
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own exercises" ON exercises
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own exercises" ON exercises
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own daily exercises" ON daily_exercises
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily exercises" ON daily_exercises
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own body progress images" ON body_progress_images
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own body progress images" ON body_progress_images
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own badges" ON badges
    FOR SELECT USING (true); -- public badges

CREATE POLICY "Users can view own user_badges" ON user_badges
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own user_badges" ON user_badges
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own goals" ON goals
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own goals" ON goals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals" ON goals
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own water intake" ON water_intake
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own water intake" ON water_intake
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_foods_updated_at BEFORE UPDATE ON foods
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exercises_updated_at BEFORE UPDATE ON exercises
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();