export const WINTER_ARC_DURATION_DAYS = 90 as const;
export const PLAN_VERSION = 1 as const;

export type MissionCategory =
  'physical' | 'mindset' | 'presence' | 'career' | 'relationship' | 'recovery' | 'checkpoint';

export type MissionSource = 'core' | 'personalized';
export type MissionIntensity = 'low' | 'moderate' | 'high';
export type DayKind = 'training' | 'recovery' | 'checkpoint';
export type BaseTrack = 'foundation' | 'bodyRecomp' | 'athletic' | 'definition';
export type RelationshipGoal = 'selfFocus' | 'approach' | 'date' | 'relationship' | 'strengthen';

export type MissionStep = {
  id: string;
  instruction: string;
  order: number;
};

export type MissionTemplate = {
  category: MissionCategory;
  durationMinutes: number;
  id: string;
  intensity: MissionIntensity;
  minAge: number;
  steps: MissionStep[];
  title: string;
  xp: number;
};

export type ScheduledMission = MissionTemplate & {
  scheduledId: string;
  source: MissionSource;
};

export type PlanDay = {
  day: number;
  kind: DayKind;
  missions: ScheduledMission[];
};

export type WinterArcPlan = {
  baseTrack: BaseTrack;
  days: PlanDay[];
  durationDays: typeof WINTER_ARC_DURATION_DAYS;
  planId: string;
  version: typeof PLAN_VERSION;
};

export type PlanAssessment = {
  age: number;
  careerGoal: string;
  confidenceGoals: string[];
  currentBuild: 'starting' | 'average' | 'athletic' | 'defined';
  currentWeightKg: number;
  gymAccess: 'member' | 'home' | 'outdoor' | 'none';
  hoursPerWeek: number;
  mainGoal: string;
  relationshipGoal: RelationshipGoal;
  targetBuild: 'lean' | 'athletic' | 'muscular' | 'defined';
  targetWeightKg: number;
};

export type CapabilityProfile = {
  equipment: 'fullGym' | 'limited' | 'bodyweight';
  level: 'starting' | 'consistent' | 'advanced';
  weeklyMinutes: number;
};

export type PlanGenerationState =
  | { status: 'idle' }
  | { status: 'generating' }
  | { plan: WinterArcPlan; status: 'ready' }
  | { message: string; status: 'error' };

export type PlanGenerationAction =
  | { type: 'START' }
  | { plan: WinterArcPlan; type: 'SUCCEED' }
  | { message: string; type: 'FAIL' }
  | { type: 'RESET' };
