-- Seed the database catalog used by the real badge flow.
WITH goal_types(goal_type, label, color) AS (
  VALUES
    ('skinny_to_fit', 'Skinny -> Fit', 'emerald'),
    ('muscle_gain', 'Muscle Gain', 'red'),
    ('weight_gain', 'Weight Gain', 'blue'),
    ('maintain', 'Fit / Maintain', 'violet'),
    ('fat_loss', 'Fat Loss', 'orange'),
    ('weight_loss', 'Weight Loss', 'pink')
), levels(level, suffix, requirement_type, requirement_value, xp) AS (
  VALUES
    (1, 'starter', 'milestone', 1, 50),
    (2, 'momentum', 'streak', 14, 100),
    (3, 'dedicated', 'streak', 30, 200),
    (4, 'master', 'adherence', 90, 400),
    (5, 'legend', 'special', 1, 1000)
)
INSERT INTO badges (name, description, requirement_type, requirement_value)
SELECT
  gt.label || ' ' || initcap(levels.suffix),
  CASE levels.level
    WHEN 1 THEN 'Set this as your active goal.'
    WHEN 2 THEN 'Log consistently for 14 days.'
    WHEN 3 THEN 'Log consistently for 30 days.'
    WHEN 4 THEN 'Stay within 10% of your calorie target on 90% of at least 30 logged days.'
    ELSE 'Complete this goal.'
  END,
  levels.requirement_type,
  levels.requirement_value
FROM goal_types gt CROSS JOIN levels
ON CONFLICT (name) DO NOTHING;
