import { missionLibrary } from './mission-library';
import {
  PLAN_VERSION,
  WINTER_ARC_DURATION_DAYS,
  type BaseTrack,
  type CapabilityProfile,
  type MissionTemplate,
  type PlanAssessment,
  type PlanDay,
  type ScheduledMission,
  type WinterArcPlan,
} from './models';
import { planAssessmentSchema, winterArcPlanSchema } from './schemas';

export function normalizeAssessment(input: PlanAssessment): PlanAssessment {
  const parsed = planAssessmentSchema.parse(input);
  return {
    ...parsed,
    careerGoal: parsed.careerGoal.trim(),
    confidenceGoals: [...parsed.confidenceGoals].map((goal) => goal.trim()).sort(),
    mainGoal: parsed.mainGoal.trim(),
    relationshipGoal: parsed.relationshipGoal,
  };
}

export function deriveCapabilityProfile(assessment: PlanAssessment): CapabilityProfile {
  const equipment =
    assessment.gymAccess === 'member'
      ? 'fullGym'
      : assessment.gymAccess === 'none'
        ? 'bodyweight'
        : 'limited';
  const level =
    assessment.hoursPerWeek < 2 || assessment.currentBuild === 'starting'
      ? 'starting'
      : assessment.hoursPerWeek >= 6 &&
          (assessment.currentBuild === 'athletic' || assessment.currentBuild === 'defined')
        ? 'advanced'
        : 'consistent';

  return {
    equipment,
    level,
    weeklyMinutes: Math.round(assessment.hoursPerWeek * 60),
  };
}

export function selectBaseTrack(assessment: PlanAssessment): BaseTrack {
  if (assessment.currentBuild === 'starting') return 'foundation';
  if (assessment.targetBuild === 'muscular') return 'bodyRecomp';
  if (assessment.targetBuild === 'defined') return 'definition';
  return 'athletic';
}

function stableAssessmentValue(assessment: PlanAssessment): string {
  return JSON.stringify({
    age: assessment.age,
    careerGoal: assessment.careerGoal,
    confidenceGoals: assessment.confidenceGoals,
    currentBuild: assessment.currentBuild,
    currentWeightKg: assessment.currentWeightKg,
    gymAccess: assessment.gymAccess,
    hoursPerWeek: assessment.hoursPerWeek,
    mainGoal: assessment.mainGoal,
    relationshipGoal: assessment.relationshipGoal,
    targetBuild: assessment.targetBuild,
    targetWeightKg: assessment.targetWeightKg,
  });
}

function stableHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36).padStart(8, '0').slice(-8);
}

function scheduleMission(
  planId: string,
  day: number,
  template: MissionTemplate,
  source: ScheduledMission['source'],
): ScheduledMission {
  return {
    ...template,
    scheduledId: `${planId}.${String(day).padStart(2, '0')}.${template.id}.${source}`,
    source,
  };
}

function choosePhysicalMission(capability: CapabilityProfile, day: number): MissionTemplate {
  if (day === 1 || capability.level === 'starting') return missionLibrary.baselineWalk;
  if (capability.equipment === 'fullGym') return missionLibrary.gymFoundation;
  return missionLibrary.bodyweightCircuit;
}

function createBaseDay(
  assessment: PlanAssessment,
  capability: CapabilityProfile,
  day: number,
  planId: string,
): PlanDay {
  const isRecovery = day % 7 === 0;
  const isCheckpoint = day === 30 || day === 60 || day === 90;
  const missions: ScheduledMission[] = [];

  if (isRecovery) {
    missions.push(scheduleMission(planId, day, missionLibrary.recoveryWalk, 'core'));
    missions.push(scheduleMission(planId, day, missionLibrary.weeklyReview, 'core'));
  } else {
    missions.push(scheduleMission(planId, day, choosePhysicalMission(capability, day), 'core'));
    missions.push(
      scheduleMission(
        planId,
        day,
        isCheckpoint
          ? missionLibrary.checkpoint
          : day % 2 === 0
            ? missionLibrary.postureReset
            : missionLibrary.standardJournal,
        'core',
      ),
    );
  }

  // One personalized mission on exactly 45 days creates an 80/20 core-to-personalized split.
  if (day % 2 === 0) {
    const personalized =
      day % 4 === 0 || assessment.relationshipGoal === 'selfFocus'
        ? missionLibrary.careerFocus
        : missionLibrary.socialRepetition;
    missions.push(scheduleMission(planId, day, personalized, 'personalized'));
  }

  return {
    day,
    kind: isCheckpoint ? 'checkpoint' : isRecovery ? 'recovery' : 'training',
    missions,
  };
}

export function calculatePlanXpRange(plan: WinterArcPlan): { maximum: number; minimum: number } {
  const maximum = plan.days
    .flatMap((day) => day.missions)
    .reduce((sum, mission) => sum + mission.xp, 0);
  return { maximum, minimum: Math.round(maximum * 0.7) };
}

export function validatePlanSafety(plan: WinterArcPlan, age: number): string[] {
  const issues: string[] = [];
  const ids = new Set<string>();

  if (plan.days.length !== WINTER_ARC_DURATION_DAYS) issues.push('Plan must contain 90 days.');

  plan.days.forEach((day, index) => {
    if (day.day !== index + 1) issues.push(`Day ${index + 1} is missing or out of order.`);
    const minutes = day.missions.reduce((sum, mission) => sum + mission.durationMinutes, 0);
    if (minutes > 90) issues.push(`Day ${day.day} exceeds the 90-minute workload limit.`);
    if (day.missions.filter((mission) => mission.intensity === 'high').length > 1) {
      issues.push(`Day ${day.day} has too many high-intensity missions.`);
    }
    day.missions.forEach((mission) => {
      if (age < mission.minAge) issues.push(`${mission.id} is not allowed for this age.`);
      if (ids.has(mission.scheduledId)) issues.push(`${mission.scheduledId} is duplicated.`);
      ids.add(mission.scheduledId);
    });
  });

  return issues;
}

export function generateWinterArcPlan(rawAssessment: PlanAssessment): WinterArcPlan {
  const assessment = normalizeAssessment(rawAssessment);
  const planId = `wa_${stableHash(stableAssessmentValue(assessment))}`;
  const capability = deriveCapabilityProfile(assessment);
  const days = Array.from({ length: WINTER_ARC_DURATION_DAYS }, (_, index) =>
    createBaseDay(assessment, capability, index + 1, planId),
  );
  const plan: WinterArcPlan = {
    baseTrack: selectBaseTrack(assessment),
    days,
    durationDays: WINTER_ARC_DURATION_DAYS,
    planId,
    version: PLAN_VERSION,
  };

  winterArcPlanSchema.parse(plan);
  const safetyIssues = validatePlanSafety(plan, assessment.age);
  if (safetyIssues.length > 0) {
    throw new Error(`Unsafe plan rejected: ${safetyIssues.join(' ')}`);
  }
  return plan;
}
