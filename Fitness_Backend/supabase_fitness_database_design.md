# Supabase Database Design

## Overview

This database is designed for a fitness, nutrition, body-progress, and achievement tracking application using Supabase PostgreSQL.

Authentication is handled by:

```text
auth.users
```

Application-specific user information is stored in:

```text
profiles
```

---

# 1. Profiles

Stores user profile and body information.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK, FK → auth.users.id | Supabase user ID |
| name | TEXT | NOT NULL | User name |
| age | INT | | User age |
| height | DECIMAL(5,2) | | Height in cm |
| weight | DECIMAL(5,2) | | Current weight in kg |
| gender | TEXT | | Gender |
| activity_level | TEXT | | Activity level |
| bmr | DECIMAL(8,2) | | Basal Metabolic Rate |
| tdee | DECIMAL(8,2) | | Total Daily Energy Expenditure |
| calorie_goal | DECIMAL(8,2) | | Daily calorie target |
| avatar_url | TEXT | | Profile image |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Created date |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Updated date |

---

# 2. Weight History

Stores historical weight measurements.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | Record ID |
| user_id | UUID | FK → profiles.id | User |
| weight | DECIMAL(5,2) | NOT NULL | Weight in kg |
| height | DECIMAL(5,2) | | Height in cm |
| body_fat | DECIMAL(5,2) | | Body fat percentage |
| recorded_at | TIMESTAMPTZ | DEFAULT NOW() | Measurement date |

---

# 3. Daily Records

Main daily tracking table.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | Record ID |
| user_id | UUID | FK → profiles.id | User |
| record_date | DATE | NOT NULL | Tracking date |
| calories_consumed | DECIMAL(8,2) | DEFAULT 0 | Calories consumed |
| calories_burned | DECIMAL(8,2) | DEFAULT 0 | Calories burned |
| water_ml | INT | DEFAULT 0 | Water intake |
| steps | INT | DEFAULT 0 | Daily steps |
| notes | TEXT | | Daily notes |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Created date |

Recommended constraint:

```text
UNIQUE(user_id, record_date)
```

---

# 4. Foods

Stores reusable food information.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | Food ID |
| user_id | UUID | FK → profiles.id | Food owner |
| name | TEXT | NOT NULL | Food name |
| serving_size | DECIMAL(8,2) | | Serving size |
| serving_unit | TEXT | | g, ml, piece, etc. |
| calories | DECIMAL(8,2) | | Calories |
| protein | DECIMAL(8,2) | | Protein (g) |
| carbohydrates | DECIMAL(8,2) | | Carbohydrates (g) |
| fat | DECIMAL(8,2) | | Fat (g) |
| fiber | DECIMAL(8,2) | | Fiber (g) |
| image_url | TEXT | | Food image |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Created date |

---

# 5. Daily Food Records

A user can eat multiple foods every day.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | Record ID |
| user_id | UUID | FK → profiles.id | User |
| daily_record_id | UUID | FK → daily_records.id | Daily record |
| food_id | UUID | FK → foods.id | Food |
| meal_type | TEXT | | Breakfast/Lunch/Dinner/Snack |
| quantity | DECIMAL(8,2) | NOT NULL | Quantity |
| calories | DECIMAL(8,2) | | Calculated calories |
| protein | DECIMAL(8,2) | | Protein |
| carbohydrates | DECIMAL(8,2) | | Carbohydrates |
| fat | DECIMAL(8,2) | | Fat |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Created date |

---

# 6. Exercises

Stores reusable exercises.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | Exercise ID |
| user_id | UUID | FK → profiles.id | Exercise owner |
| name | TEXT | NOT NULL | Exercise name |
| exercise_type | TEXT | | Cardio/Strength/etc. |
| description | TEXT | | Exercise description |
| image_url | TEXT | | Exercise image |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Created date |

---

# 7. Daily Exercises

Stores exercises performed on a specific day.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | Record ID |
| user_id | UUID | FK → profiles.id | User |
| daily_record_id | UUID | FK → daily_records.id | Daily record |
| exercise_id | UUID | FK → exercises.id | Exercise |
| sets | INT | | Number of sets |
| reps | INT | | Repetitions |
| duration_minutes | INT | | Duration |
| calories_burned | DECIMAL(8,2) | | Calories burned |
| distance_km | DECIMAL(8,2) | | Distance |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Created date |

---

# 8. Body Progress Images

Stores multiple body progress images per day.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | Image ID |
| user_id | UUID | FK → profiles.id | User |
| daily_record_id | UUID | FK → daily_records.id | Daily record |
| image_url | TEXT | NOT NULL | Supabase Storage URL |
| image_type | TEXT | | Front/Side/Back |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Upload date |

## Storage Structure

```text
Supabase Storage
└── body-progress/
    └── {user_id}/
        ├── front/
        ├── side/
        └── back/
```

---

# 9. Badges

Stores available achievements.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | Badge ID |
| name | TEXT | UNIQUE | Badge name |
| description | TEXT | | Badge description |
| image_url | TEXT | | Badge image |
| requirement_type | TEXT | | Requirement type |
| requirement_value | INT | | Required value |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Created date |

---

# 10. User Badges

Many-to-many relationship between users and badges.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | Record ID |
| user_id | UUID | FK → profiles.id | User |
| badge_id | UUID | FK → badges.id | Badge |
| earned_at | TIMESTAMPTZ | DEFAULT NOW() | Earned date |

Recommended constraint:

```text
UNIQUE(user_id, badge_id)
```

---

# 11. Goals

Allows users to set fitness goals.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | Goal ID |
| user_id | UUID | FK → profiles.id | User |
| goal_type | TEXT | | Weight/Calories/Steps/etc. |
| target_value | DECIMAL(10,2) | | Target |
| current_value | DECIMAL(10,2) | | Current progress |
| start_date | DATE | | Goal start |
| target_date | DATE | | Target date |
| status | TEXT | | Active/Completed/Failed |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Created date |

---

# 12. Water Intake

Optional detailed water tracking table.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | Record ID |
| user_id | UUID | FK → profiles.id | User |
| amount_ml | INT | NOT NULL | Water amount |
| recorded_at | TIMESTAMPTZ | DEFAULT NOW() | Drinking time |

---

# 13. Database Relationship

```text
auth.users
    │
    └── profiles
          │
          ├── weight_history
          │
          ├── daily_records
          │      │
          │      ├── daily_foods
          │      │       └── foods
          │      │
          │      ├── daily_exercises
          │      │       └── exercises
          │      │
          │      └── body_progress_images
          │
          ├── goals
          │
          ├── water_intake
          │
          └── user_badges
                    │
                    └── badges
```

---

# 14. Supabase Storage

Recommended buckets:

```text
avatars
food-images
exercise-images
body-progress
badge-images
```

---

# 15. Supabase Authentication

Do NOT create these fields in `profiles`:

```text
password
password_hash
```

Use:

```text
auth.users
```

for:

- Email
- Password
- Email verification
- Login
- Password reset
- OAuth

Application tables reference:

```text
auth.users.id
```

using UUID.

---

# 16. Recommended Final Tables

```text
auth.users                  ← Supabase managed

profiles
weight_history
daily_records
foods
daily_foods
exercises
daily_exercises
body_progress_images
badges
user_badges
goals
water_intake
```

## Features Supported

- Weight progress
- Food tracking
- Calorie tracking
- Exercise tracking
- Water tracking
- Body progress images
- Badges / achievements
- Fitness goals
- Daily / weekly / monthly statistics
- Supabase Authentication
- Supabase Storage
- Row Level Security (RLS)
