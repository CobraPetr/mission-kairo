import { planAssessmentSchema, type PlanAssessment } from '@winter-arc/domain';

import { type OnboardingDraft } from '../onboarding/onboarding-schema';

export function buildPlanAssessment(draft: OnboardingDraft): PlanAssessment {
  return planAssessmentSchema.parse({
    age: draft.identity.age,
    careerGoal: draft.goals.careerGoal,
    confidenceGoals: draft.goals.confidenceGoals,
    currentBuild: draft.physical.currentBuild,
    currentWeightKg: draft.identity.weightKg,
    gymAccess: draft.activity.gymAccess,
    hoursPerWeek: draft.activity.hoursPerWeek,
    mainGoal: draft.goals.mainGoal,
    relationshipGoal: draft.goals.relationshipGoal,
    targetBuild: draft.goals.targetBuild,
    targetWeightKg: draft.goals.targetWeightKg,
  });
}
