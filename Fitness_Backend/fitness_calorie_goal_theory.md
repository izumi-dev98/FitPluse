# Fitness Calorie & Goal Theory

## Purpose

This document defines the calorie, nutrition, and fitness calculation theories for a fitness tracking application.

Supported goals:

- Skinny → Fit
- Muscle Gain
- Weight Gain
- Fit / Maintain Weight
- Fat Loss
- Weight Loss

The system uses:

```text
User Profile
    ↓
BMR
    ↓
TDEE
    ↓
Goal Strategy
    ↓
Daily Calorie Target
    ↓
Protein / Nutrition Target
    ↓
Exercise & Progress Tracking
    ↓
Weekly Progress Adjustment
```

---

# 1. BMR — Basal Metabolic Rate

BMR is the estimated number of calories the body needs at complete rest.

The application uses the **Mifflin-St Jeor Equation**.

## Men

```text
BMR = (10 × weight_kg)
    + (6.25 × height_cm)
    − (5 × age)
    + 5
```

## Women

```text
BMR = (10 × weight_kg)
    + (6.25 × height_cm)
    − (5 × age)
    − 161
```

### Example

```text
Weight = 55 kg
Height = 170 cm
Age    = 25

BMR
= (10 × 55)
+ (6.25 × 170)
− (5 × 25)
+ 5

= 1,511 kcal/day
```

---

# 2. TDEE — Total Daily Energy Expenditure

TDEE estimates the calories required to maintain current body weight based on activity.

```text
TDEE = BMR × Activity Multiplier
```

## Activity Multipliers

| Activity Level | Multiplier | Description |
|---|---:|---|
| Sedentary | 1.20 | Little or no exercise |
| Lightly Active | 1.375 | Light exercise 1–3 days/week |
| Moderately Active | 1.55 | Moderate exercise 3–5 days/week |
| Very Active | 1.725 | Hard exercise 6–7 days/week |
| Extremely Active | 1.90 | Very hard training / physical job |

---

# 3. Goal-Based Calorie Strategy

The application should NOT use one calorie formula for every user.

The calorie target depends on the selected goal.

```text
BMR
 ↓
TDEE
 ↓
Goal
 ├── Skinny → Fit
 ├── Muscle Gain
 ├── Weight Gain
 ├── Maintain
 ├── Fat Loss
 └── Weight Loss
```

---

# 4. Skinny → Fit

Primary objective:

```text
Increase body weight
+
Build muscle
+
Improve strength
```

Recommended starting calorie strategy:

```text
Target Calories = TDEE × 1.10 ~ 1.20
```

For a simple application default:

```text
Target Calories = TDEE × 1.20
```

### Example

```text
TDEE = 2,000 kcal

Target
= 2,000 × 1.20
= 2,400 kcal/day
```

The application should monitor actual weight changes and adjust calories rather than permanently keeping the same multiplier.

---

# 5. Muscle Gain

Muscle gain is similar to Skinny → Fit, but the focus is specifically on increasing lean mass.

Starting calorie strategy:

```text
Target Calories = TDEE × 1.10 ~ 1.15
```

A smaller surplus can be used when the user wants to minimize unnecessary fat gain.

Recommended system:

```text
TDEE
+
10–15% surplus
=
Muscle Gain Target
```

---

# 6. Weight Gain

For users whose primary goal is increasing body weight:

```text
Target Calories = TDEE × 1.10 ~ 1.20
```

Example:

```text
TDEE = 2,200

10% surplus:
2,200 × 1.10 = 2,420 kcal

20% surplus:
2,200 × 1.20 = 2,640 kcal
```

The app can start around the lower end and adjust according to the user's progress.

---

# 7. Fit / Maintain Weight

The objective is to maintain approximately the current body weight.

```text
Target Calories ≈ TDEE
```

Example:

```text
TDEE = 2,200

Maintenance Target
≈ 2,200 kcal/day
```

The actual maintenance level should be adjusted based on the user's weight trend.

---

# 8. Fat Loss

The objective is to reduce body fat while preserving as much lean mass as practical.

Starting calorie strategy:

```text
Target Calories = TDEE × 0.80 ~ 0.90
```

Example:

```text
TDEE = 2,200

10% deficit:
2,200 × 0.90
= 1,980 kcal/day

20% deficit:
2,200 × 0.80
= 1,760 kcal/day
```

A moderate deficit is generally preferable to an aggressive deficit for a fitness application.

---

# 9. Weight Loss

For general weight loss:

```text
Target Calories = TDEE × 0.80 ~ 0.90
```

The app should avoid automatically creating extremely low calorie targets.

A minimum-calorie safety rule should be implemented separately based on user-specific requirements rather than relying only on a fixed number.

---

# 10. Protein Target

Protein is important for muscle maintenance and muscle growth.

For users doing resistance training, a practical target is:

```text
Protein = Body Weight × 1.6–2.2 g/kg/day
```

### Example

```text
Weight = 60 kg

1.6 g/kg:
60 × 1.6 = 96 g/day

2.2 g/kg:
60 × 2.2 = 132 g/day
```

Application target:

```text
Protein Goal = Weight × Protein Factor
```

Where:

```text
Protein Factor = 1.6–2.2
```

---

# 11. Fat Target

Dietary fat should not be removed completely.

A practical starting range can be:

```text
Fat = Body Weight × 0.6–1.0 g/kg/day
```

The remaining calories can be allocated to carbohydrates.

---

# 12. Carbohydrate Target

After protein and fat targets are calculated:

```text
Protein Calories = Protein(g) × 4

Fat Calories = Fat(g) × 9
```

Remaining calories:

```text
Carbohydrate Calories
=
Target Calories
− Protein Calories
− Fat Calories
```

Then:

```text
Carbohydrate (g)
=
Carbohydrate Calories ÷ 4
```

---

# 13. Complete Macro Calculation

Example:

```text
Target Calories = 2,400 kcal
Weight = 60 kg
```

Protein:

```text
60 × 2.0
= 120 g

120 × 4
= 480 kcal
```

Fat:

```text
60 × 0.8
= 48 g

48 × 9
= 432 kcal
```

Carbohydrates:

```text
2,400 − 480 − 432
= 1,488 kcal

1,488 ÷ 4
= 372 g carbohydrates
```

Result:

```text
Calories      = 2,400 kcal
Protein       = 120 g
Fat           = 48 g
Carbohydrates = 372 g
```

These are starting targets, not exact physiological requirements.

---

# 14. Goal Configuration

Recommended application configuration:

```text
SKINNY_TO_FIT

calorie_strategy:
    TDEE × 1.10–1.20

protein:
    1.6–2.2 g/kg
```

```text
MUSCLE_GAIN

calorie_strategy:
    TDEE × 1.10–1.15

protein:
    1.6–2.2 g/kg
```

```text
WEIGHT_GAIN

calorie_strategy:
    TDEE × 1.10–1.20

protein:
    1.6–2.0 g/kg
```

```text
MAINTAIN

calorie_strategy:
    TDEE × 1.00

protein:
    1.6–2.0 g/kg
```

```text
FAT_LOSS

calorie_strategy:
    TDEE × 0.80–0.90

protein:
    1.6–2.2 g/kg
```

```text
WEIGHT_LOSS

calorie_strategy:
    TDEE × 0.80–0.90

protein:
    1.6–2.2 g/kg
```

---

# 15. Weekly Progress Adjustment

The application should not rely only on BMR/TDEE formulas.

Actual progress should be used to adjust the calorie target.

```text
Daily Weight
     ↓
7-Day Average
     ↓
Compare With Previous Average
     ↓
Adjust Calories
```

## For Weight Gain

If weight is not increasing:

```text
Increase calories gradually
```

If weight is increasing too quickly:

```text
Reduce calorie surplus
```

## For Weight Loss

If weight is not decreasing over time:

```text
Review calorie intake
+
Review activity
+
Adjust calories gradually
```

If weight is decreasing too quickly:

```text
Increase calories / reduce deficit
```

---

# 16. Weight Trend

Daily weight can fluctuate because of:

- Water
- Food volume
- Sodium
- Glycogen
- Exercise
- Time of measurement

Therefore, the application should prioritize:

```text
7-Day Average Weight
```

instead of reacting to a single day's weight.

Example:

```text
Day 1  = 60.2 kg
Day 2  = 60.5 kg
Day 3  = 59.9 kg
Day 4  = 60.4 kg
Day 5  = 60.1 kg
Day 6  = 60.6 kg
Day 7  = 60.3 kg

Average ≈ 60.29 kg
```

---

# 17. Progress Tracking

Recommended metrics:

```text
Current Weight
Target Weight
Weight Change
7-Day Average
Calories Consumed
Calories Target
Protein Consumed
Protein Target
Exercise Sessions
Calories Burned
Steps
Body Measurements
Progress Photos
```

---

# 18. Database Goal Model

Recommended `goals` table:

| Column | Type | Description |
|---|---|---|
| id | UUID | Goal ID |
| user_id | UUID | User ID |
| goal_type | TEXT | Main fitness goal |
| starting_weight | DECIMAL | Starting weight |
| target_weight | DECIMAL | Target weight |
| target_calories | DECIMAL | Daily calorie target |
| protein_target | DECIMAL | Daily protein target |
| fat_target | DECIMAL | Daily fat target |
| carb_target | DECIMAL | Daily carbohydrate target |
| start_date | DATE | Goal start |
| target_date | DATE | Target date |
| status | TEXT | Active/Completed/Paused |
| created_at | TIMESTAMPTZ | Created date |
| updated_at | TIMESTAMPTZ | Updated date |

---

# 19. Recommended Goal Types

```text
SKINNY_TO_FIT
MUSCLE_GAIN
WEIGHT_GAIN
MAINTAIN
FAT_LOSS
WEIGHT_LOSS
GENERAL_FITNESS
```

---

# 20. Complete Calculation Flow

```text
                User Profile
                     │
          ┌──────────┴──────────┐
          │                     │
       Weight                 Height
          │                     │
          └──────────┬──────────┘
                     ↓
                   BMR
                     ↓
             Activity Level
                     ↓
                   TDEE
                     ↓
                User Goal
                     │
       ┌─────────────┼─────────────┐
       ↓             ↓             ↓
    Surplus       Maintain       Deficit
       ↓             ↓             ↓
  +10–20%           ×1.00       −10–20%
       │             │             │
       └─────────────┼─────────────┘
                     ↓
              Daily Calories
                     ↓
          Protein / Fat / Carbs
                     ↓
              Daily Tracking
                     ↓
              Weekly Average
                     ↓
            Progress Adjustment
```

---

# 21. Important Implementation Rule

BMR and TDEE are estimates.

Do not treat:

```text
TDEE = exact maintenance calories
```

Instead:

```text
Estimated TDEE
        ↓
Starting Target
        ↓
Real-world Weight Trend
        ↓
Adjustment
```

This makes the application more adaptive.

---

# 22. Recommended App Architecture

```text
Supabase Auth
      ↓
Profiles
      ↓
Goal
      ↓
BMR Calculator
      ↓
TDEE Calculator
      ↓
Calorie Strategy
      ↓
Macro Calculator
      ↓
Daily Food
      ↓
Daily Exercise
      ↓
Daily Weight
      ↓
Progress Analytics
      ↓
Badge / Achievement
```

---

# 23. Final Formula Summary

## BMR

### Men

```text
(10 × weight)
+ (6.25 × height)
− (5 × age)
+ 5
```

### Women

```text
(10 × weight)
+ (6.25 × height)
− (5 × age)
− 161
```

## TDEE

```text
BMR × Activity Multiplier
```

## Skinny → Fit

```text
TDEE × 1.10–1.20
```

## Muscle Gain

```text
TDEE × 1.10–1.15
```

## Weight Gain

```text
TDEE × 1.10–1.20
```

## Maintain

```text
TDEE × 1.00
```

## Fat Loss

```text
TDEE × 0.80–0.90
```

## Weight Loss

```text
TDEE × 0.80–0.90
```

## Protein

```text
Weight × 1.6–2.2 g/kg
```

## Fat

```text
Weight × 0.6–1.0 g/kg
```

## Carbohydrate

```text
(Target Calories
− Protein Calories
− Fat Calories) ÷ 4
```

---

# Note

These formulas provide estimates and starting points. Individual calorie needs vary. The application's recommendation engine should use actual weight trends and user progress to adjust targets over time rather than treating any single formula as exact.
