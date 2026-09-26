export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      badges: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          requirement_type: string | null
          requirement_value: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          requirement_type?: string | null
          requirement_value?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          requirement_type?: string | null
          requirement_value?: number | null
        }
        Relationships: []
      }
      body_progress_images: {
        Row: {
          created_at: string
          daily_record_id: string
          id: string
          image_type: string | null
          image_url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          daily_record_id: string
          id?: string
          image_type?: string | null
          image_url: string
          user_id: string
        }
        Update: {
          created_at?: string
          daily_record_id?: string
          id?: string
          image_type?: string | null
          image_url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "body_progress_images_daily_record_id_fkey"
            columns: ["daily_record_id"]
            isOneToOne: false
            referencedRelation: "daily_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "body_progress_images_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_exercises: {
        Row: {
          calories_burned: number | null
          created_at: string
          daily_record_id: string
          distance_km: number | null
          duration_minutes: number | null
          exercise_id: string
          id: string
          reps: number | null
          sets: number | null
          user_id: string
        }
        Insert: {
          calories_burned?: number | null
          created_at?: string
          daily_record_id: string
          distance_km?: number | null
          duration_minutes?: number | null
          exercise_id: string
          id?: string
          reps?: number | null
          sets?: number | null
          user_id: string
        }
        Update: {
          calories_burned?: number | null
          created_at?: string
          daily_record_id?: string
          distance_km?: number | null
          duration_minutes?: number | null
          exercise_id?: string
          id?: string
          reps?: number | null
          sets?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_exercises_daily_record_id_fkey"
            columns: ["daily_record_id"]
            isOneToOne: false
            referencedRelation: "daily_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_exercises_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_foods: {
        Row: {
          calories: number | null
          carbohydrates: number | null
          created_at: string
          daily_record_id: string
          fat: number | null
          food_id: string
          id: string
          meal_type: string | null
          protein: number | null
          quantity: number
          user_id: string
        }
        Insert: {
          calories?: number | null
          carbohydrates?: number | null
          created_at?: string
          daily_record_id: string
          fat?: number | null
          food_id: string
          id?: string
          meal_type?: string | null
          protein?: number | null
          quantity: number
          user_id: string
        }
        Update: {
          calories?: number | null
          carbohydrates?: number | null
          created_at?: string
          daily_record_id?: string
          fat?: number | null
          food_id?: string
          id?: string
          meal_type?: string | null
          protein?: number | null
          quantity?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_foods_daily_record_id_fkey"
            columns: ["daily_record_id"]
            isOneToOne: false
            referencedRelation: "daily_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_foods_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "foods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_foods_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_records: {
        Row: {
          calories_burned: number
          calories_consumed: number
          created_at: string
          id: string
          notes: string | null
          record_date: string
          steps: number
          user_id: string
          water_ml: number
        }
        Insert: {
          calories_burned?: number
          calories_consumed?: number
          created_at?: string
          id?: string
          notes?: string | null
          record_date: string
          steps?: number
          user_id: string
          water_ml?: number
        }
        Update: {
          calories_burned?: number
          calories_consumed?: number
          created_at?: string
          id?: string
          notes?: string | null
          record_date?: string
          steps?: number
          user_id?: string
          water_ml?: number
        }
        Relationships: [
          {
            foreignKeyName: "daily_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          created_at: string
          description: string | null
          exercise_type: string | null
          id: string
          image_url: string | null
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          exercise_type?: string | null
          id?: string
          image_url?: string | null
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          exercise_type?: string | null
          id?: string
          image_url?: string | null
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercises_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      foods: {
        Row: {
          calories: number | null
          carbohydrates: number | null
          created_at: string
          fat: number | null
          fiber: number | null
          id: string
          image_url: string | null
          name: string
          protein: number | null
          serving_size: number | null
          serving_unit: string | null
          user_id: string
        }
        Insert: {
          calories?: number | null
          carbohydrates?: number | null
          created_at?: string
          fat?: number | null
          fiber?: number | null
          id?: string
          image_url?: string | null
          name: string
          protein?: number | null
          serving_size?: number | null
          serving_unit?: string | null
          user_id: string
        }
        Update: {
          calories?: number | null
          carbohydrates?: number | null
          created_at?: string
          fat?: number | null
          fiber?: number | null
          id?: string
          image_url?: string | null
          name?: string
          protein?: number | null
          serving_size?: number | null
          serving_unit?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "foods_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          carb_target: number | null
          created_at: string
          current_value: number | null
          fat_target: number | null
          goal_type: string | null
          id: string
          protein_target: number | null
          start_date: string | null
          status: string | null
          target_calories: number | null
          target_date: string | null
          target_value: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          carb_target?: number | null
          created_at?: string
          current_value?: number | null
          fat_target?: number | null
          goal_type?: string | null
          id?: string
          protein_target?: number | null
          start_date?: string | null
          status?: string | null
          target_calories?: number | null
          target_date?: string | null
          target_value?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          carb_target?: number | null
          created_at?: string
          current_value?: number | null
          fat_target?: number | null
          goal_type?: string | null
          id?: string
          protein_target?: number | null
          start_date?: string | null
          status?: string | null
          target_calories?: number | null
          target_date?: string | null
          target_value?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          activity_level: string | null
          age: number | null
          avatar_url: string | null
          bmr: number | null
          calorie_goal: number | null
          created_at: string
          dob: string | null
          gender: string | null
          height: number | null
          id: string
          name: string
          tdee: number | null
          updated_at: string
          weight: number | null
        }
        Insert: {
          activity_level?: string | null
          age?: number | null
          avatar_url?: string | null
          bmr?: number | null
          calorie_goal?: number | null
          created_at?: string
          dob?: string | null
          gender?: string | null
          height?: number | null
          id: string
          name: string
          tdee?: number | null
          updated_at?: string
          weight?: number | null
        }
        Update: {
          activity_level?: string | null
          age?: number | null
          avatar_url?: string | null
          bmr?: number | null
          calorie_goal?: number | null
          created_at?: string
          dob?: string | null
          gender?: string | null
          height?: number | null
          id?: string
          name?: string
          tdee?: number | null
          updated_at?: string
          weight?: number | null
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      water_intake: {
        Row: {
          amount_ml: number
          id: string
          recorded_at: string
          user_id: string
        }
        Insert: {
          amount_ml: number
          id?: string
          recorded_at?: string
          user_id: string
        }
        Update: {
          amount_ml?: number
          id?: string
          recorded_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "water_intake_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      weight_history: {
        Row: {
          body_fat: number | null
          height: number | null
          id: string
          recorded_at: string
          user_id: string
          weight: number
        }
        Insert: {
          body_fat?: number | null
          height?: number | null
          id?: string
          recorded_at?: string
          user_id: string
          weight: number
        }
        Update: {
          body_fat?: number | null
          height?: number | null
          id?: string
          recorded_at?: string
          user_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "weight_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}


// Convenient row aliases used across the app (avoids `any` for table data).
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Goal = Database['public']['Tables']['goals']['Row'];
export type DailyRecord = Database['public']['Tables']['daily_records']['Row'];
export type Food = Database['public']['Tables']['foods']['Row'];
export type DailyFood = Database['public']['Tables']['daily_foods']['Row'];
export type Exercise = Database['public']['Tables']['exercises']['Row'];
export type DailyExercise = Database['public']['Tables']['daily_exercises']['Row'];
export type WeightEntry = Database['public']['Tables']['weight_history']['Row'];
export type WaterEntry = Database['public']['Tables']['water_intake']['Row'];
export type BodyImage = Database['public']['Tables']['body_progress_images']['Row'];
export type Badge = Database['public']['Tables']['badges']['Row'];
export type UserBadge = Database['public']['Tables']['user_badges']['Row'];

// Backend list endpoints enrich rows with joined/derived fields absent from
// the raw table types — declared here instead of falling back to `any`.
export type DailyFoodRow = DailyFood & {
  record_date?: string;
  name?: string;
  foods?: { name?: string | null } | null;
  food_name?: string | null;
};
export type DailyExerciseRow = DailyExercise & {
  record_date?: string;
  name?: string;
  exercises?: { name?: string | null } | null;
  exercise_name?: string | null;
};
export type WaterRow = WaterEntry & { created_at?: string };
