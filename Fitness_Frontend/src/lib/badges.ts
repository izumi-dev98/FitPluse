// Badge System Definitions
// 6 Goal Types × 5 Badges Each = 30 Total Badges

import { GOAL_LABELS, type GoalType } from './theory';

export interface BadgeDefinition {
  id: string;
  goalType: GoalType;
  level: 1 | 2 | 3 | 4 | 5;
  name: string;
  description: string;
  icon: string; // lucide-react icon name
  color: string; // CSS color class
  requirement: {
    type: 'goal_progress' | 'streak' | 'adherence' | 'special' | 'milestone';
    target: number;
    description: string;
  };
  xpReward: number;
}

export interface UserBadgeProgress {
  badgeId: string;
  earned: boolean;
  earnedAt?: string;
  progress: number; // 0-100
  currentValue: number;
  targetValue: number;
}

// Badge Icons mapping (using lucide-react icon names)
const ICONS = {
  // Level 1 - Starter
  starter: 'Flag',
  // Level 2 - Momentum  
  momentum: 'Zap',
  // Level 3 - Dedicated
  dedicated: 'Target',
  // Level 4 - Master
  master: 'Crown',
  // Level 5 - Legend
  legend: 'Star',
} as const;

// Goal-type specific colors
const GOAL_COLORS: Record<GoalType, { primary: string; secondary: string; glow: string }> = {
  skinny_to_fit: { primary: 'emerald', secondary: 'green', glow: 'shadow-emerald-500/30' },
  muscle_gain: { primary: 'red', secondary: 'rose', glow: 'shadow-red-500/30' },
  weight_gain: { primary: 'blue', secondary: 'sky', glow: 'shadow-blue-500/30' },
  maintain: { primary: 'violet', secondary: 'purple', glow: 'shadow-violet-500/30' },
  fat_loss: { primary: 'orange', secondary: 'amber', glow: 'shadow-orange-500/30' },
  weight_loss: { primary: 'pink', secondary: 'rose', glow: 'shadow-pink-500/30' },
};

// Generate all 30 badges
export const BADGE_DEFINITIONS: BadgeDefinition[] = [];

const goalTypes: GoalType[] = ['skinny_to_fit', 'muscle_gain', 'weight_gain', 'maintain', 'fat_loss', 'weight_loss'];

goalTypes.forEach(goalType => {
  const colors = GOAL_COLORS[goalType];
  const goalLabel = GOAL_LABELS[goalType];
  
  // Level 1: Starter - Begin the journey
  BADGE_DEFINITIONS.push({
    id: `${goalType}_starter`,
    goalType,
    level: 1,
    name: `${goalLabel} Starter`,
    description: `Begin your ${goalLabel.toLowerCase()} journey by setting this goal`,
    icon: ICONS.starter,
    color: colors.primary,
    requirement: {
      type: 'milestone',
      target: 1,
      description: 'Set this as your active goal',
    },
    xpReward: 50,
  });

  // Level 2: Momentum - 14-day streak
  BADGE_DEFINITIONS.push({
    id: `${goalType}_momentum`,
    goalType,
    level: 2,
    name: `${goalLabel} Momentum`,
    description: `Maintain a 14-day logging streak`,
    icon: ICONS.momentum,
    color: colors.primary,
    requirement: {
      type: 'goal_progress',
      target: 25,
      description: 'Maintain a 14-day logging streak',
    },
    xpReward: 100,
  });

  // Level 3: Dedicated - 30-day streak
  BADGE_DEFINITIONS.push({
    id: `${goalType}_dedicated`,
    goalType,
    level: 3,
    name: `${goalLabel} Dedicated`,
    description: `Maintain a 30-day logging streak`,
    icon: ICONS.dedicated,
    color: colors.primary,
    requirement: {
      type: 'goal_progress',
      target: 50,
      description: 'Maintain a 30-day logging streak',
    },
    xpReward: 200,
  });

  // Level 4: Master - 90% adherence across at least 30 logged days
  BADGE_DEFINITIONS.push({
    id: `${goalType}_master`,
    goalType,
    level: 4,
    name: `${goalLabel} Master`,
    description: `Maintain 90% target adherence across at least 30 logged days`,
    icon: ICONS.master,
    color: colors.primary,
    requirement: {
      type: 'adherence',
      target: 90,
      description: 'Maintain 90% target adherence across at least 30 logged days',
    },
    xpReward: 400,
  });

  // Level 5: Legend - Goal achieved (100%)
  BADGE_DEFINITIONS.push({
    id: `${goalType}_legend`,
    goalType,
    level: 5,
    name: `${goalLabel} Legend`,
    description: `Fully achieve your ${goalLabel.toLowerCase()} goal - the ultimate accomplishment`,
    icon: ICONS.legend,
    color: colors.primary,
    requirement: {
      type: 'goal_progress',
      target: 100,
      description: 'Achieve 100% of your goal target',
    },
    xpReward: 1000,
  });
});

// Helper functions
export function getBadgesByGoalType(goalType: GoalType): BadgeDefinition[] {
  return BADGE_DEFINITIONS.filter(b => b.goalType === goalType).sort((a, b) => a.level - b.level);
}

export function getAllGoalTypes(): GoalType[] {
  return goalTypes;
}

export function getBadgeById(id: string): BadgeDefinition | undefined {
  return BADGE_DEFINITIONS.find(b => b.id === id);
}

// Re-export for convenience
export { GOAL_LABELS };
export type { GoalType };

export function getBadgeColorClasses(color: string): { bg: string; border: string; text: string; icon: string; glow: string } {
  const colorMap: Record<string, { bg: string; border: string; text: string; icon: string; glow: string }> = {
    emerald: { bg: 'bg-emerald-900/20', border: 'border-emerald-600/30', text: 'text-emerald-400', icon: 'text-emerald-400', glow: 'shadow-emerald-500/20' },
    red: { bg: 'bg-red-900/20', border: 'border-red-600/30', text: 'text-red-400', icon: 'text-red-400', glow: 'shadow-red-500/20' },
    blue: { bg: 'bg-blue-900/20', border: 'border-blue-600/30', text: 'text-blue-400', icon: 'text-blue-400', glow: 'shadow-blue-500/20' },
    violet: { bg: 'bg-violet-900/20', border: 'border-violet-600/30', text: 'text-violet-400', icon: 'text-violet-400', glow: 'shadow-violet-500/20' },
    orange: { bg: 'bg-orange-900/20', border: 'border-orange-600/30', text: 'text-orange-400', icon: 'text-orange-400', glow: 'shadow-orange-500/20' },
    pink: { bg: 'bg-pink-900/20', border: 'border-pink-600/30', text: 'text-pink-400', icon: 'text-pink-400', glow: 'shadow-pink-500/20' },
    green: { bg: 'bg-green-900/20', border: 'border-green-600/30', text: 'text-green-400', icon: 'text-green-400', glow: 'shadow-green-500/20' },
    rose: { bg: 'bg-rose-900/20', border: 'border-rose-600/30', text: 'text-rose-400', icon: 'text-rose-400', glow: 'shadow-rose-500/20' },
    sky: { bg: 'bg-sky-900/20', border: 'border-sky-600/30', text: 'text-sky-400', icon: 'text-sky-400', glow: 'shadow-sky-500/20' },
    purple: { bg: 'bg-purple-900/20', border: 'border-purple-600/30', text: 'text-purple-400', icon: 'text-purple-400', glow: 'shadow-purple-500/20' },
    amber: { bg: 'bg-amber-900/20', border: 'border-amber-600/30', text: 'text-amber-400', icon: 'text-amber-400', glow: 'shadow-amber-500/20' },
  };
  return colorMap[color] || colorMap.emerald;
}

export function getLevelInfo(level: number): { label: string; subtitle: string } {
  const levels = {
    1: { label: 'Starter', subtitle: 'Begin the journey' },
    2: { label: 'Momentum', subtitle: 'Building consistency' },
    3: { label: 'Dedicated', subtitle: 'Halfway there' },
    4: { label: 'Master', subtitle: 'Nearly complete' },
    5: { label: 'Legend', subtitle: 'Goal achieved!' },
  };
  return levels[level as keyof typeof levels] || levels[1];
}

// Calculate progress for a badge based on user data
export interface ProgressInputs {
  // Goal progress (0-100%)
  goalProgress: number;
  // Current logging streak in days
  currentStreak: number;
  // Adherence rate (0-100%) over last 60 days
  adherenceRate: number;
  adherenceDays: number;
  // Total days logged
  totalDaysLogged: number;
  // Whether this goal type is currently active
  isActiveGoal: boolean;
  // Goal start date
  goalStartDate?: string;
}

export interface ProgressInputs {
  // Goal progress (0-100%)
  goalProgress: number;
  // Current logging streak in days
  currentStreak: number;
  // Adherence rate (0-100%) over last 60 days
  adherenceRate: number;
  adherenceDays: number;
  // Total days logged
  totalDaysLogged: number;
  // Whether this goal type is currently active
  isActiveGoal: boolean;
  // Goal start date
  goalStartDate?: string;
  // Active goal type
  activeGoalType?: GoalType;
}

export function calculateBadgeProgress(
  badge: BadgeDefinition,
  inputs: ProgressInputs
): { progress: number; currentValue: number; targetValue: number; earned: boolean } {
  const { goalProgress, currentStreak, adherenceRate, adherenceDays, totalDaysLogged, isActiveGoal } = inputs;
  
  let progress = 0;
  let currentValue = 0;
  let targetValue = badge.requirement.target;
  let earned = false;

  switch (badge.requirement.type) {
    case 'milestone':
      // Level 1: Just need to have this as active goal
      currentValue = isActiveGoal ? 1 : 0;
      progress = isActiveGoal ? 100 : 0;
      earned = isActiveGoal;
      break;

    case 'goal_progress':
      // Levels 2, 3, 5: Based on goal progress percentage
      currentValue = Math.min(goalProgress, 100);
      progress = Math.min(goalProgress, 100);
      earned = goalProgress >= badge.requirement.target;
      break;

    case 'streak':
      // Alternative: streak-based (for momentum/dedicated)
      currentValue = currentStreak;
      progress = Math.min((currentStreak / badge.requirement.target) * 100, 100);
      earned = currentStreak >= badge.requirement.target;
      break;

    case 'adherence':
      // Level 4: Adherence rate over period
      currentValue = Math.round(adherenceRate);
      progress = Math.min((adherenceRate / badge.requirement.target) * 100, 100);
      earned = adherenceDays >= 30 && adherenceRate >= badge.requirement.target;
      break;

    case 'special':
      // Special achievements
      currentValue = totalDaysLogged;
      progress = Math.min((totalDaysLogged / badge.requirement.target) * 100, 100);
      earned = totalDaysLogged >= badge.requirement.target;
      break;
  }

  // For hybrid badges (goal_progress OR streak), check both
  if (badge.level === 2 || badge.level === 3) {
    const streakTarget = badge.level === 2 ? 14 : 30;
    const streakProgress = Math.min((currentStreak / streakTarget) * 100, 100);
    const streakEarned = currentStreak >= streakTarget;
    
    // Use whichever is higher
    if (streakProgress > progress) {
      progress = streakProgress;
      currentValue = currentStreak;
      targetValue = streakTarget;
      earned = streakEarned;
    }
  }

  // Level 4 hybrid: goal progress OR adherence
  if (badge.level === 4) {
    const goalProgressValue = Math.min(goalProgress, 100);
    const adherenceProgress = Math.min((adherenceRate / 90) * 100, 100);
    
    if (adherenceProgress > goalProgressValue) {
      progress = adherenceProgress;
      currentValue = Math.round(adherenceRate);
      targetValue = 90;
      earned = adherenceDays >= 30 && adherenceRate >= 90;
    } else {
      progress = goalProgressValue;
      currentValue = Math.round(goalProgress);
      targetValue = 75;
      earned = goalProgress >= 75;
    }
  }

  return { progress: Math.round(progress), currentValue, targetValue, earned };
}

// Total XP calculation
export function calculateTotalXP(userBadges: UserBadgeProgress[]): number {
  return userBadges
    .filter(b => b.earned)
    .reduce((sum, b) => {
      const badge = getBadgeById(b.badgeId);
      return sum + (badge?.xpReward || 0);
    }, 0);
}

// Get user rank based on total XP
export function getUserRank(totalXP: number): { rank: string; emoji: string; nextRankXP: number | null } {
  const ranks = [
    { rank: 'Novice', emoji: '🌱', minXP: 0 },
    { rank: 'Rookie', emoji: '🥉', minXP: 100 },
    { rank: 'Athlete', emoji: '🥈', minXP: 500 },
    { rank: 'Pro', emoji: '🥇', minXP: 1500 },
    { rank: 'Elite', emoji: '💎', minXP: 3000 },
    { rank: 'Champion', emoji: '🏆', minXP: 5000 },
    { rank: 'Legend', emoji: '👑', minXP: 10000 },
  ];

  let currentRank = ranks[0];
  let nextRankXP: number | null = null;

  for (let i = 0; i < ranks.length; i++) {
    if (totalXP >= ranks[i].minXP) {
      currentRank = ranks[i];
    } else {
      nextRankXP = ranks[i].minXP;
      break;
    }
  }

  if (!nextRankXP && currentRank.minXP === ranks[ranks.length - 1].minXP) {
    nextRankXP = null; // Max rank
  }

  return { rank: currentRank.rank, emoji: currentRank.emoji, nextRankXP };
}

export const TOTAL_BADGES = BADGE_DEFINITIONS.length; // 30
export const BADGES_PER_GOAL = 5;