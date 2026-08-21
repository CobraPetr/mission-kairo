import { type OnboardingDraft, type OnboardingSection } from './onboarding-schema';

export const onboardingRoutes = {
  activity: '/(onboarding)/activity',
  career: '/(onboarding)/career',
  confidence: '/(onboarding)/confidence',
  emotional: '/(onboarding)/emotional',
  identity: '/(onboarding)/identity',
  mainGoal: '/(onboarding)/main-goal',
  planPreview: '/(onboarding)/plan-preview',
  physical: '/(onboarding)/physical',
  relationship: '/(onboarding)/relationship',
  relationshipGoal: '/(onboarding)/relationship-goal',
  review: '/(onboarding)/review',
  situation: '/(onboarding)/situation',
  targetBuild: '/(onboarding)/target-build',
  targetWeight: '/(onboarding)/target-weight',
} as const satisfies Record<OnboardingSection, string>;

export function resolveOnboardingResumeRoute(draft: OnboardingDraft) {
  const hasStartedEmotional =
    draft.emotionalIndex > 0 || Object.values(draft.emotionalAnswers).some(Boolean);
  if (draft.section === 'emotional' && !hasStartedEmotional) return null;
  return onboardingRoutes[draft.section];
}
