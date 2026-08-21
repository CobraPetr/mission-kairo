export type SessionState = 'loading' | 'guest' | 'authenticated';
export type OnboardingState = 'unknown' | 'required' | 'complete';
export type PhoneVerificationState = 'unknown' | 'required' | 'complete';
export type PlanState = 'unknown' | 'missing' | 'ready';
export type ExecutionState = 'unknown' | 'ready';

export type BootSnapshot = {
  execution: ExecutionState;
  onboarding: OnboardingState;
  phoneVerification: PhoneVerificationState;
  plan: PlanState;
  session: SessionState;
};

export type InitialRoute =
  | '/(app)/today'
  | '/(auth)/verify-phone'
  | '/(auth)/welcome'
  | '/(onboarding)'
  | '/(onboarding)/plan-preview'
  | null;

export function resolveInitialRoute(snapshot: BootSnapshot): InitialRoute {
  if (snapshot.session === 'loading') {
    return null;
  }

  if (snapshot.session === 'guest') {
    return '/(auth)/welcome';
  }

  if (snapshot.phoneVerification === 'unknown') return null;
  if (snapshot.phoneVerification === 'required') return '/(auth)/verify-phone';

  if (snapshot.onboarding === 'unknown') return null;
  if (snapshot.onboarding === 'required') {
    return '/(onboarding)';
  }

  if (snapshot.plan === 'unknown') return null;
  if (snapshot.plan === 'missing') return '/(onboarding)/plan-preview';
  if (snapshot.execution === 'unknown') return null;

  return '/(app)/today';
}
