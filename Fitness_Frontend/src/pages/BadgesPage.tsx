import { useMemo, useState } from 'react';
import { 
  Award, Trophy, Lock, ChevronDown, Target, Zap, Crown, Star, Flag, 
  TrendingUp, Medal, Sparkles, BarChart2, HelpCircle
} from 'lucide-react';
import { PageHeader, ProgressBar } from '../components/ui';
import { useAuthStore } from '../store/auth';
import { useBadges, useDailyRecords, useGoals, useUserBadges } from '../lib/queries';
import {
  BADGE_DEFINITIONS,
  getBadgesByGoalType,
  getAllGoalTypes,
  getLevelInfo,
  getBadgeColorClasses,
  calculateBadgeProgress,
  getUserRank,
  type BadgeDefinition,
  type ProgressInputs,
  type UserBadgeProgress,
  GOAL_LABELS,
  type GoalType,
} from '../lib/badges';

type ExtendedBadge = BadgeDefinition & { 
  progress: number; 
  currentValue: number; 
  targetValue: number; 
  earned: boolean; 
  earnedAt?: string 
};

const ICON_MAP: Record<string, any> = {
  Flag, Zap, Target, Crown, Star,
};

export default function BadgesPage() {
  const { user } = useAuthStore();
  const uid = user?.id;

  // Shared cached queries — revisits render instantly with no refetch.
  const badgesQ = useBadges(uid);
  const userBadgesQ = useUserBadges(uid);
  const goalsQ = useGoals(uid);
  const recordsQ = useDailyRecords(uid);
  const badges: any[] = badgesQ.data ?? [];
  const goals: any[] = goalsQ.data ?? [];
  const records: any[] = recordsQ.data ?? [];
  const userBadges: UserBadgeProgress[] = useMemo(
    () =>
      (userBadgesQ.data ?? []).map((ub: any) => ({
        badgeId: ub.badge_id,
        earned: true,
        earnedAt: ub.earned_at,
        progress: 100,
        currentValue: 100,
        targetValue: 100,
      })),
    [userBadgesQ.data],
  );
  const loading = badgesQ.isLoading || userBadgesQ.isLoading || goalsQ.isLoading || recordsQ.isLoading;
  const [expandedGoals, setExpandedGoals] = useState<Record<GoalType, boolean>>({
    skinny_to_fit: true,
    muscle_gain: false,
    weight_gain: false,
    maintain: false,
    fat_loss: false,
    weight_loss: false,
  });
  const [selectedBadge, setSelectedBadge] = useState<ExtendedBadge | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  // Calculate progress for all badges
  const progressInputs = useMemo((): ProgressInputs => {
    const activeGoal = goals.find((goal) => goal.status === 'active');
    const activeGoalType = activeGoal?.goal_type as GoalType || user?.goal_type as GoalType || 'muscle_gain';
    const loggedDates = new Set(records.filter((record) => Number(record.calories_consumed) > 0 || Number(record.calories_burned) > 0 || Number(record.water_ml) > 0 || Number(record.steps) > 0).map((record) => record.record_date));
    let currentStreak = 0;
    const cursor = new Date();
    for (let index = 0; index < 365; index += 1) {
      if (!loggedDates.has(cursor.toISOString().slice(0, 10))) break;
      currentStreak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    const targetCalories = Number(activeGoal?.target_calories ?? activeGoal?.target_value) || 0;
    const scoredRecords = targetCalories > 0 ? records.filter((record) => Number(record.calories_consumed) > 0) : [];
    const adherenceRate = scoredRecords.length
      ? (scoredRecords.filter((record) => Math.abs(Number(record.calories_consumed) - targetCalories) / targetCalories <= 0.1).length / scoredRecords.length) * 100
      : 0;

    return {
      goalProgress: goals.some((goal) => goal.goal_type === activeGoalType && goal.status === 'completed') ? 100 : 0,
      currentStreak,
      adherenceRate,
      adherenceDays: scoredRecords.length,
      totalDaysLogged: loggedDates.size,
      isActiveGoal: Boolean(activeGoal),
      goalStartDate: activeGoal?.created_at,
      activeGoalType,
    };
  }, [goals, records, user]);

  // Merge badge definitions with user progress
  const badgeSections = useMemo(() => {
    const goalTypes = getAllGoalTypes();
    
    return goalTypes.map(goalType => {
      const definitions = getBadgesByGoalType(goalType);
      const activeGoalType = progressInputs.activeGoalType;
      const isActiveGoal = goalType === activeGoalType;
      
      const badgesWithProgress = definitions.map(def => {
        // Check if user has earned this badge from backend data
        const normalizeBadgeName = (value: string) => value.replace('→', '->');
        const backendBadge = badges.find((b: any) => b.id === def.id || normalizeBadgeName(String(b.name)) === normalizeBadgeName(def.name));
        const userBadge = userBadges.find(ub => ub.badgeId === def.id);
        const isEarnedFromBackend = backendBadge?.earned === true;
        const earnedAt = backendBadge?.earned_at || userBadge?.earnedAt;
        const hasCompletedGoal = goals.some((goal) => goal.goal_type === goalType && goal.status === 'completed');
        const isEligibleGoal = isActiveGoal || (hasCompletedGoal && def.level === 5);
        
        const inputs = {
          ...progressInputs,
          goalProgress: goals.some((goal) => goal.goal_type === goalType && goal.status === 'completed') ? 100 : progressInputs.goalProgress,
          isActiveGoal: isActiveGoal && def.level === 1,
        };
        
        // For level 1, earned if this is the active goal
        if (def.level === 1) {
          inputs.isActiveGoal = isActiveGoal;
        }
        
        const calculated = isEligibleGoal ? calculateBadgeProgress(def, inputs) : { progress: 0, currentValue: 0, targetValue: def.requirement.target, earned: false };
        
        return {
          ...def,
          ...calculated,
          earned: isEarnedFromBackend || userBadge?.earned || calculated.earned,
          earnedAt: earnedAt,
          progress: isEarnedFromBackend ? 100 : calculated.progress,
          currentValue: isEarnedFromBackend ? calculated.targetValue : calculated.currentValue,
        };
      });

      const earnedCount = badgesWithProgress.filter(b => b.earned).length;
      const totalXP = badgesWithProgress
        .filter(b => b.earned)
        .reduce((sum, b) => sum + b.xpReward, 0);

      return {
        goalType,
        label: GOAL_LABELS[goalType],
        badges: badgesWithProgress,
        earnedCount,
        totalCount: badgesWithProgress.length,
        totalXP,
        isActiveGoal,
        expanded: expandedGoals[goalType],
      };
    });
  }, [badges, userBadges, progressInputs, expandedGoals]);

  // Overall stats
  const totalEarned = useMemo(() => 
    badgeSections.reduce((sum, s) => sum + s.earnedCount, 0), [badgeSections]);
  const totalBadges = BADGE_DEFINITIONS.length;
  const totalXP = useMemo(() => 
    badgeSections.reduce((sum, s) => sum + s.totalXP, 0), [badgeSections]);
  const { rank, emoji, nextRankXP } = getUserRank(totalXP);

  // Toggle section expansion
  const toggleSection = (goalType: GoalType) => {
    setExpandedGoals(prev => ({ ...prev, [goalType]: !prev[goalType] }));
  };

  // Open badge detail modal
  const openBadgeDetail = (badge: ExtendedBadge) => {
    setSelectedBadge(badge);
    setShowDetail(true);
  };

  if (loading) {
    return (
      <div className="py-16 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Trophy className="text-brand-400 animate-spin" size={48} />
            <div className="absolute inset-0 border-4 border-brand-500/20 rounded-full animate-ping" />
          </div>
          <p className="text-slate-400">Loading your badges...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">
      {/* Header with Stats */}
      <div>
        <PageHeader
          title="Badges & Achievements"
          subtitle={`Collect badges across 6 goal types. ${totalEarned}/${totalBadges} earned • ${totalXP} XP • Rank: ${emoji} ${rank}`}
          icon={Trophy}
        />

        {/* XP Progress Bar */}
        <div className="mt-4 bg-slate-900/50 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-brand-900/30 border border-brand-600/30">
                <Sparkles className="text-brand-400" size={20} />
              </div>
              <div>
                <div className="text-white font-bold text-lg">Total XP: <span className="text-brand-400">{totalXP.toLocaleString()}</span></div>
                <div className="text-xs text-slate-500">Rank: <span className="text-white font-semibold">{emoji} {rank}</span></div>
              </div>
            </div>
            {nextRankXP && (
              <div className="text-right text-sm">
                <div className="text-slate-400">Next Rank</div>
                <div className="text-brand-400 font-bold">{(nextRankXP - totalXP).toLocaleString()} XP</div>
              </div>
            )}
          </div>
          <ProgressBar 
            value={nextRankXP ? Math.min((totalXP / nextRankXP) * 100, 100) : 100} 
            max={100}
            color="bg-brand-500"
          />
        </div>
      </div>

      {/* Goal Type Sections */}
      <div className="space-y-4">
        {badgeSections.map((section) => {
          const colors = getBadgeColorClasses(section.badges[0]?.color || 'emerald');
          const isActive = section.isActiveGoal;
          
          return (
            <section key={section.goalType} className={`group ${colors.bg} ${colors.border} rounded-3xl overflow-hidden transition-all duration-300 ${isActive ? 'ring-1 ring-brand-500/30 shadow-lg' : ''} ${colors.glow}`}>
              {/* Section Header */}
              <button
                onClick={() => toggleSection(section.goalType)}
                className="w-full flex items-center justify-between gap-4 p-5 md:p-6 text-left hover:bg-white/[0.02] transition-colors"
                aria-expanded={section.expanded}
              >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  {/* Goal Type Icon */}
                  <div className={`flex-shrink-0 p-3 rounded-2xl ${colors.bg} ${colors.border} ${colors.glow}`}>
                    <Target className={colors.icon} size={24} />
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-xl font-bold text-white truncate">{section.label}</h3>
                      {isActive && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-600/30 text-brand-300 border border-brand-500/30 whitespace-nowrap">
                          Active Goal
                        </span>
                      )}
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/10 text-slate-400 border border-white/10 whitespace-nowrap">
                        {section.earnedCount}/{section.totalCount}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <Medal className={colors.icon} size={14} />
                        {section.totalXP.toLocaleString()} XP
                      </span>
                      <div className="flex-1 max-w-xs h-1.5">
                        <ProgressBar 
                          value={(section.earnedCount / section.totalCount) * 100} 
                          max={100}
                          color="bg-brand-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 flex-shrink-0">
                  <ChevronDown 
                    className={`text-slate-400 transition-transform duration-300 ${section.expanded ? 'rotate-180' : ''}`} 
                    size={20} 
                  />
                </div>
              </button>

              {/* Expanded Badge Grid */}
              {section.expanded && (
                <div className="px-5 pb-6 pt-2 animate-in slide-in-from-top-2 duration-300">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                    {section.badges.map((badge) => (
                      <BadgeCard 
                        key={badge.id}
                        badge={badge}
                        onClick={() => openBadgeDetail(badge)}
                        colors={colors}
                      />
                    ))}
                  </div>
                </div>
              )}
            </section>
          );
        })}
      </div>

      {/* Legend / Guide */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
        <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <HelpCircle className="text-brand-400" size={20} /> How Badges Work
        </h4>
        <div className="grid md:grid-cols-5 gap-4 text-sm">
          {([1,2,3,4,5] as const).map(level => {
            const { label, subtitle } = getLevelInfo(level);
            const Icon = [Flag, Zap, Target, Crown, Star][level - 1];
            return (
              <div key={level} className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/50 border border-slate-800">
                <div className="flex-shrink-0 p-2 rounded-lg bg-brand-900/30 border border-brand-600/30">
                  <Icon className="text-brand-400" size={18} />
                </div>
                <div>
                  <div className="font-semibold text-white">{label} <span className="font-normal text-slate-500">Lv.{level}</span></div>
                  <div className="text-slate-500 text-xs mt-0.5">{subtitle}</div>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="mt-6 pt-6 border-t border-slate-800 grid md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-start gap-2 p-3 rounded-xl bg-slate-950/50 border border-slate-800">
            <TrendingUp className="text-green-400 flex-shrink-0 mt-0.5" size={16} />
            <div>
              <div className="font-medium text-white">Goal Progress</div>
              <div className="text-slate-500 text-xs">% toward your target weight/calories</div>
            </div>
          </div>
          <div className="flex items-start gap-2 p-3 rounded-xl bg-slate-950/50 border border-slate-800">
            <BarChart2 className="text-blue-400 flex-shrink-0 mt-0.5" size={16} />
            <div>
              <div className="font-medium text-white">Consistency Streaks</div>
              <div className="text-slate-500 text-xs">Daily logging streaks (7/30/60 days)</div>
            </div>
          </div>
          <div className="flex items-start gap-2 p-3 rounded-xl bg-slate-950/50 border border-slate-800">
            <Target className="text-orange-400 flex-shrink-0 mt-0.5" size={16} />
            <div>
              <div className="font-medium text-white">Target Adherence</div>
              <div className="text-slate-500 text-xs">Staying within 10% of daily calorie goal</div>
            </div>
          </div>
        </div>
      </div>

      {/* Badge Detail Modal */}
      {showDetail && selectedBadge && (
        <BadgeDetailModal 
          badge={selectedBadge} 
          onClose={() => { setShowDetail(false); setSelectedBadge(null); }}
          colors={getBadgeColorClasses(selectedBadge.color)}
        />
      )}
    </div>
  );
}

// Badge Card Component
interface BadgeCardProps {
  badge: BadgeDefinition & { progress: number; currentValue: number; targetValue: number; earned: boolean; earnedAt?: string };
  onClick: () => void;
  colors: { bg: string; border: string; text: string; icon: string; glow: string };
}

function BadgeCard({ badge, onClick, colors }: BadgeCardProps) {
  const Icon = ICON_MAP[badge.icon] || Award;
  const isEarned = badge.earned;

  return (
    <button
      onClick={onClick}
      className={`relative group rounded-2xl p-4 text-center border transition-all duration-300 cursor-pointer ${
        isEarned
          ? `${colors.bg} ${colors.border} shadow-lg ${colors.glow} hover:shadow-xl hover:-translate-y-1`
          : 'bg-slate-900/40 border-slate-800 opacity-60 hover:opacity-80 hover:border-slate-700'
      }`}
      disabled={!isEarned && badge.level > 1 && badge.progress === 0}
    >
      {/* Lock overlay for unearned higher levels */}
      {!isEarned && badge.level > 1 && (
        <div className="absolute inset-0 rounded-2xl bg-black/60 flex items-center justify-center z-10 pointer-events-none">
          <Lock className="text-slate-500" size={28} />
        </div>
      )}

      {/* Badge Content */}
      <div className="relative z-10">
        {/* Level Badge */}
        <div className="flex items-center justify-center gap-1.5 mb-3">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
            isEarned ? `${colors.bg} ${colors.text} border ${colors.border}` : 'bg-slate-800 text-slate-500 border-slate-700'
          }`}>
            Lv.{badge.level}
          </span>
          {isEarned && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
              EARNED
            </span>
          )}
        </div>

        {/* Icon */}
        <div className={`mx-auto mb-3 relative ${isEarned ? '' : 'grayscale'}`}>
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto ${isEarned ? `${colors.bg} ${colors.border} ${colors.glow}` : 'bg-slate-800 border-slate-700'}`}>
            <Icon className={`${isEarned ? colors.icon : 'text-slate-500'}`} size={32} />
          </div>
          
          {/* Earned checkmark */}
          {isEarned && (
            <div className="absolute -bottom-2 -right-2 w-6 h-6 rounded-full bg-green-500 border-2 border-slate-900 flex items-center justify-center">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          )}
        </div>

        {/* Name */}
        <h4 className={`font-bold text-sm mb-1 ${isEarned ? 'text-white' : 'text-slate-500'}`}>
          {badge.name}
        </h4>

        {/* Progress Bar */}
        {!isEarned && badge.level > 1 && (
          <div className="mb-3">
            <div className="h-1.5">
              <ProgressBar 
                value={badge.progress} 
                max={100}
                color="bg-brand-500"
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>{badge.currentValue}</span>
              <span>/ {badge.targetValue}</span>
            </div>
          </div>
        )}

        {/* Description */}
        <p className={`text-[11px] ${isEarned ? 'text-slate-400' : 'text-slate-600'} line-clamp-2`}>
          {badge.description}
        </p>

        {/* Earned Date */}
        {isEarned && badge.earnedAt && (
          <div className="mt-2 text-[10px] text-brand-400 font-medium">
            Earned {new Date(badge.earnedAt).toLocaleDateString()}
          </div>
        )}

        {/* XP Reward */}
        <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-center gap-1 text-[11px]">
          <Star className="text-yellow-400" size={12} />
          <span className={`font-bold ${isEarned ? 'text-yellow-400' : 'text-slate-500'}`}>
            +{badge.xpReward} XP
          </span>
        </div>
      </div>

      {/* Hover glow for earned */}
      {isEarned && (
        <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" 
             style={{ boxShadow: `0 0 30px ${colors.icon.replace('text-', '')}80` }} />
      )}
    </button>
  );
}

// Badge Detail Modal
interface BadgeDetailModalProps {
  badge: BadgeDefinition & { progress: number; currentValue: number; targetValue: number; earned: boolean; earnedAt?: string };
  onClose: () => void;
  colors: { bg: string; border: string; text: string; icon: string; glow: string };
}

function BadgeDetailModal({ badge, onClose, colors }: BadgeDetailModalProps) {
  const { label: levelLabel, subtitle } = getLevelInfo(badge.level);
  const Icon = ICON_MAP[badge.icon] || Award;
  const isEarned = badge.earned;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className={`bg-slate-900 border rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom-4 duration-300 ${colors.border} ${colors.glow}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`relative p-6 border-b ${colors.border}`}>
          <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white p-1" aria-label="Close">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          
          <div className="text-center">
            <div className={`inline-flex items-center justify-center w-24 h-24 rounded-3xl mb-4 ${colors.bg} ${colors.border} ${colors.glow}`}>
              <Icon className={colors.icon} size={40} />
            </div>
            
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${isEarned ? `${colors.bg} ${colors.text} border ${colors.border}` : 'bg-slate-800 text-slate-500 border-slate-700'}`}>
                Level {badge.level} · {levelLabel}
              </span>
              {isEarned && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-500/20 text-green-400 border border-green-500/30">
                  EARNED
                </span>
              )}
            </div>
            
            <h3 className="text-2xl font-bold text-white mb-1">{badge.name}</h3>
            <p className="text-slate-400 text-sm">{subtitle}</p>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Description */}
          <div className="bg-slate-950/50 rounded-2xl p-4 border border-slate-800">
            <h4 className="text-sm font-semibold text-slate-400 mb-2 uppercase tracking-wide">Description</h4>
            <p className="text-white text-base leading-relaxed">{badge.description}</p>
          </div>

          {/* Requirement */}
          <div className="bg-slate-950/50 rounded-2xl p-4 border border-slate-800">
            <h4 className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wide flex items-center gap-2">
              <Target className={colors.icon} size={16} />
              Requirement
            </h4>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/50 border border-slate-800">
              <div className="p-2 rounded-lg bg-brand-900/30 border border-brand-600/30">
                <Target className="text-brand-400" size={20} />
              </div>
              <div className="flex-1">
                <div className="text-white font-medium">{badge.requirement.description}</div>
                <div className="text-slate-500 text-sm mt-0.5">Type: {badge.requirement.type.replace('_', ' ')} • Target: {badge.requirement.target}</div>
              </div>
            </div>
          </div>

          {/* Progress */}
          {!isEarned && badge.level > 1 && (
            <div className="bg-slate-950/50 rounded-2xl p-4 border border-slate-800">
              <h4 className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wide flex items-center gap-2">
                <BarChart2 className={colors.icon} size={16} />
                Your Progress
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Progress</span>
                  <span className="text-white font-bold">{badge.progress}%</span>
                </div>
                <div className="h-3">
                  <ProgressBar 
                    value={badge.progress} 
                    max={100}
                    color="bg-brand-500"
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Current: {badge.currentValue}</span>
                  <span>Target: {badge.targetValue}</span>
                </div>
              </div>
            </div>
          )}

          {/* Earned Info */}
          {isEarned && badge.earnedAt && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-green-500/20 border border-green-500/30">
                  <Award className="text-green-400" size={24} />
                </div>
                <div>
                  <div className="text-green-400 font-bold">Badge Earned!</div>
                  <div className="text-slate-400 text-sm">{new Date(badge.earnedAt).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-green-500/20 flex items-center justify-center gap-2 text-sm">
                <Star className="text-yellow-400" size={16} />
                <span className="text-yellow-400 font-bold">+{badge.xpReward} XP awarded</span>
              </div>
            </div>
          )}

          {/* Locked Message */}
          {!isEarned && badge.level > 1 && badge.progress === 0 && (
            <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4 text-center">
              <Lock className="text-slate-600 mx-auto mb-2" size={28} />
              <p className="text-slate-500 text-sm">Complete the previous badge to unlock this one</p>
            </div>
          )}

          {/* XP Reward */}
          <div className="flex items-center justify-center gap-2 p-4 rounded-2xl bg-slate-950/50 border border-slate-800">
            <Star className="text-yellow-400" size={20} />
            <span className="text-white font-semibold">XP Reward: </span>
            <span className={`text-xl font-extrabold ${isEarned ? 'text-yellow-400' : 'text-slate-400'}`}>
              +{badge.xpReward}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}