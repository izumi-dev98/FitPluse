# Fitness Backend

A Node.js REST API for fitness tracking with BMR/TDEE calculations and Supabase integration.

## Features

- **BMR Calculation** – Mifflin-St Jeor equation for men and women
- **TDEE Calculation** – Activity multipliers (sedentary to extremely active)
- **Goal-Based Calorie Targets** – Skinny→Fit, Muscle Gain, Weight Gain, Maintain, Fat Loss, Weight Loss
- **Macro Planning** – Protein, Fat, Carbohydrate targets
- **Full Supabase Schema** – Profiles, weights, daily records, foods, exercises, body progress, badges, goals, water intake
- **RESTful API** – Express.js backend with health checks, profiling, analytics

## Project Structure

```
Fitness_Backend/
├── src/
│   ├── index.js               # Entry point, Express server
│   ├── config/
│   │   └── supabase.js        # Supabase client initialization
│   ├── utils/
│   │   └── calculator.js      # BMR, TDEE, macro calculations
│   ├── controllers/
│   │   ├── profileController.js
│   │   ├── calculationController.js
│   │   ├── foodController.js
│   │   ├── exerciseController.js
│   │   ├── goalController.js
│   │   ├── badgeController.js
│   │   ├── weightHistoryController.js
│   │   └── waterIntakeController.js
│   └── routes/
│       ├── profileRoutes.js
│       ├── calculationRoutes.js
│       ├── foodRoutes.js
│       ├── exerciseRoutes.js
│       ├── goalRoutes.js
│       ├── badgeRoutes.js
│       ├── weightHistoryRoutes.js
│       └── waterRoutes.js
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql   # Supabase DDL
├── .env                         # Environment variables (see .env.example)
└── package.json
```

## Setup

1. **Install dependencies**
   ```bash
   cd Fitness_Backend
   npm install
   ```

2. **Configure Supabase**
   - Copy `.env.example` to `.env`
   - Fill in `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`
   - Ensure the project has the tables defined in `supabase/migrations/001_initial_schema.sql`

3. **Run the server**
   ```bash
   npm start
   ```
   The API will be available at `http://localhost:3000`

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/api/auth/signup` | Create User Account |
| `GET` | `/api/auth/login` | Login User Account |
| `GET` | `/api/auth/me` | Find Account |
| `GET` | `/api/auth/refresh` | Auto refresh token |

| `POST` | `/api/bmr` | Calculate BMR from gender, weight, height, age |
| `POST` | `/api/tdee` | Calculate TDEE from BMR + activity level |
| `POST` | `/api/calorie-target` | Calculate daily calorie target by goal type |
| `GET` | `/api/profiles` | List all profiles |
| `POST` | `/api/profiles` | Create a profile |
| `PUT` | `/api/profiles/:id` | Update a profile |
| `DELETE` | `/api/profiles/:id` | Delete a profile |
| `POST` | `/api/foods` | Add a food item |
| `GET` | `/api/foods` | List foods (with optional category filter) |
| `POST` | `/api/daily-records` | Log daily consumption |
| `GET` | `/api/daily-records` | List daily records for a user |
| `POST` | `/api/exercises` | Add an exercise |
| `GET` | `/api/exercises` | List exercises for a user |
| `POST` | `/api/goals` | Create a fitness goal |
| `GET` | `/api/goals` | List goals for a user |
| `POST` | `/api/badges` | Award a badge |
| `GET` | `/api/badges` | List badges for a user |
| `POST` | `/api/water-intake` | Log water intake |
| `GET` | `/api/water-intake` | List water intake for a user |
| `GET` | `/api/health-summary` | Full health summary (profile + daily records + food count + exercise count) |

## Usage Examples

### Calculate BMR
```bash
curl -X POST http://localhost:3000/api/bmr \
  -H "Content-Type: application/json" \
  -d '{"gender":"male","weight_kg":70,"height_cm":175,"age":30}'
```

### Create Profile
```bash
curl -X POST http://localhost:3000/api/profiles \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","age":30,"height_cm":175,"weight_kg":70,"gender":"male","activity_level":"moderately_active"}'
```
