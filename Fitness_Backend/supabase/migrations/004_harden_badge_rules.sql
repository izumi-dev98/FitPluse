-- Update existing badge descriptions after raising the difficulty thresholds.
UPDATE badges
SET description = CASE
  WHEN name LIKE '% Momentum' THEN 'Log consistently for 14 days.'
  WHEN name LIKE '% Dedicated' THEN 'Log consistently for 30 days.'
  WHEN name LIKE '% Master' THEN 'Stay within 10% of your calorie target on 90% of at least 30 logged days.'
  ELSE description
END
WHERE name LIKE '% Momentum'
   OR name LIKE '% Dedicated'
   OR name LIKE '% Master';
