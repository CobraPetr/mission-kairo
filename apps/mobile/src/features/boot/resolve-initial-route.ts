import { onboardingRoutes } from '../onboarding/resolve-onboarding-route';
import { onboardingSections, type OnboardingSection } from '../onboarding/onboarding-schema';

export type SessionState = 'loading' | 'guest' | 'authenticated' | 'error';
export type VerificationState = 'unknown' | 'required' | 'complete';
export type OnboardingState = 'unknown' | 'required' | 'complete';
export type GuardianApprovalState = 'unknown' | 'required' | 'approved' | 'notRequired';
export type ActivationState = 'unknown' | 'required' | 'complete';
export type EntitlementState = 'unknown' | 'required' | 'active' | 'notEnforced';
export type AppReadinessState = 'unknown' | 'ready' | 'error';
export type AuthFlowState = 'standard' | 'passwordRecovery';

export type OnboardingRoute = (typeof onboardingRoutes)[OnboardingSection] | '/(onboarding)';

export type BootSnapshot = {
  activation: ActivationState;
  appReadiness: AppReadinessState;
  authFlow: AuthFlowState;
  configuration: 'ready' | 'error';
  developmentPreview: boolean;
  emailVerification: VerificationState;
  entitlement: EntitlementState;
  guardianApproval: GuardianApprovalState;
  onboarding: OnboardingState;
  onboardingRoute: OnboardingRoute | null;
  session: SessionState;
  workspaceSafety: 'ready' | 'error';
};

export type InitialRoute =
  | '/(app)/today'
  | '/(auth)/verify'
  | '/(auth)/welcome'
  | '/(onboarding)'
  | '/(onboarding)/review'
  | '/(onboarding)/plan-preview';

export type BootPhase =
  | 'configuration'
  | 'session'
  | 'workspaceSafety'
  | 'emailVerification'
  | 'onboarding'
  | 'guardianApproval'
  | 'activation'
  | 'entitlement'
  | 'appReadiness'
  | 'ready';

export type BootResolution =
  | { kind: 'loading'; phase: BootPhase }
  | { kind: 'error'; phase: BootPhase; reason: string }
  | { kind: 'route'; phase: BootPhase; route: InitialRoute | OnboardingRoute };

export type RouteRequest =
  | { group: 'root' }
  | { group: 'app' }
  | { group: 'auth'; screen: string }
  | { group: 'authCallback' }
  | { group: 'passwordReset' }
  | { group: 'onboarding'; section: OnboardingSection | 'index' | 'unknown' }
  | { group: 'demoReset' }
  | { group: 'unknown' };

export type RouteAccessDecision =
  | { action: 'allow' }
  | { action: 'redirect'; route: InitialRoute | OnboardingRoute }
  | { action: 'hold'; phase: BootPhase }
  | { action: 'error'; phase: BootPhase; reason: string };

const publicGuestAuthScreens = new Set([
  'forgot-password',
  'sign-in',
  'sign-up',
  'verify',
  'welcome',
]);

function routeForRequiredOnboarding(snapshot: BootSnapshot): OnboardingRoute {
  return snapshot.onboardingRoute ?? '/(onboarding)';
}

export function resolveBoot(snapshot: BootSnapshot): BootResolution {
  if (snapshot.configuration === 'error') {
    return {
      kind: 'error',
      phase: 'configuration',
      reason: 'This build is missing its required service configuration.',
    };
  }

  if (snapshot.session === 'loading') return { kind: 'loading', phase: 'session' };
  if (snapshot.session === 'error') {
    return {
      kind: 'error',
      phase: 'session',
      reason: 'The secure session could not be restored.',
    };
  }
  if (snapshot.workspaceSafety === 'error') {
    return {
      kind: 'error',
      phase: 'workspaceSafety',
      reason: 'Your private workspace could not be loaded safely.',
    };
  }
  if (snapshot.session === 'guest') {
    return { kind: 'route', phase: 'session', route: '/(auth)/welcome' };
  }

  if (snapshot.emailVerification === 'unknown') {
    return { kind: 'loading', phase: 'emailVerification' };
  }
  if (snapshot.emailVerification === 'required') {
    return { kind: 'route', phase: 'emailVerification', route: '/(auth)/verify' };
  }

  if (snapshot.onboarding === 'unknown') return { kind: 'loading', phase: 'onboarding' };
  if (snapshot.onboarding === 'required') {
    return {
      kind: 'route',
      phase: 'onboarding',
      route: routeForRequiredOnboarding(snapshot),
    };
  }

  if (snapshot.guardianApproval === 'unknown') {
    return { kind: 'loading', phase: 'guardianApproval' };
  }
  if (snapshot.guardianApproval === 'required') {
    return {
      kind: 'route',
      phase: 'guardianApproval',
      route: '/(onboarding)/review',
    };
  }

  if (snapshot.activation === 'unknown') return { kind: 'loading', phase: 'activation' };
  if (snapshot.activation === 'required') {
    return {
      kind: 'route',
      phase: 'activation',
      route: '/(onboarding)/plan-preview',
    };
  }

  if (snapshot.entitlement === 'unknown') return { kind: 'loading', phase: 'entitlement' };
  if (snapshot.entitlement === 'required') {
    return {
      kind: 'error',
      phase: 'entitlement',
      reason: 'Subscription access is required, but the paywall is not available in this build.',
    };
  }

  if (snapshot.appReadiness === 'unknown') return { kind: 'loading', phase: 'appReadiness' };
  if (snapshot.appReadiness === 'error') {
    return {
      kind: 'error',
      phase: 'appReadiness',
      reason: 'The mission workspace is not ready.',
    };
  }

  return { kind: 'route', phase: 'ready', route: '/(app)/today' };
}

export function resolveInitialRoute(snapshot: BootSnapshot): InitialRoute | OnboardingRoute | null {
  const resolution = resolveBoot(snapshot);
  return resolution.kind === 'route' ? resolution.route : null;
}

export function classifyRoute(segments: readonly string[]): RouteRequest {
  const [first, second] = segments;
  if (!first || first === 'index') return { group: 'root' };
  if (first === '(app)') return { group: 'app' };
  if (first === '(auth)') return { group: 'auth', screen: second ?? 'index' };
  if (first === '(onboarding)') {
    if (!second || second === 'index') return { group: 'onboarding', section: 'index' };
    const section = onboardingSections.find(
      (candidate) => onboardingRoutes[candidate].split('/').at(-1) === second,
    );
    return { group: 'onboarding', section: section ?? 'unknown' };
  }
  if (first === 'auth' && second === 'callback') return { group: 'authCallback' };
  if (first === 'auth' && second === 'reset-password') return { group: 'passwordReset' };
  if (first === 'demo-reset') return { group: 'demoReset' };
  return { group: 'unknown' };
}

function onboardingIndex(section: OnboardingSection | 'index' | 'unknown'): number {
  if (section === 'index') return 0;
  if (section === 'unknown') return Number.POSITIVE_INFINITY;
  return onboardingSections.indexOf(section) + 1;
}

function allowedOnboardingIndex(snapshot: BootSnapshot, resolution: BootResolution): number {
  if (resolution.kind === 'route' && resolution.phase === 'guardianApproval') {
    return onboardingIndex('review');
  }
  if (resolution.kind === 'route' && resolution.phase === 'activation') {
    return onboardingIndex('planPreview');
  }
  const route = snapshot.onboardingRoute;
  if (!route) return 0;
  if (route === '/(onboarding)') return onboardingIndex('emotional');
  const section = onboardingSections.find((candidate) => onboardingRoutes[candidate] === route);
  return section ? onboardingIndex(section) : 0;
}

function canAccessOnboarding(
  request: Extract<RouteRequest, { group: 'onboarding' }>,
  snapshot: BootSnapshot,
  resolution: BootResolution,
): boolean {
  return onboardingIndex(request.section) <= allowedOnboardingIndex(snapshot, resolution);
}

export function resolveRouteAccess(
  snapshot: BootSnapshot,
  request: RouteRequest,
): RouteAccessDecision {
  const resolution = resolveBoot(snapshot);

  if (request.group === 'authCallback') {
    if (resolution.kind === 'error') return { action: 'error', ...resolution };
    return { action: 'allow' };
  }

  if (
    request.group === 'passwordReset' &&
    (snapshot.authFlow === 'passwordRecovery' || snapshot.session === 'loading')
  ) {
    return { action: 'allow' };
  }

  if (request.group === 'demoReset') {
    return snapshot.developmentPreview
      ? { action: 'allow' }
      : resolution.kind === 'route'
        ? { action: 'redirect', route: resolution.route }
        : resolution.kind === 'loading'
          ? { action: 'hold', phase: resolution.phase }
          : { action: 'error', ...resolution };
  }

  if (resolution.kind === 'loading') return { action: 'hold', phase: resolution.phase };
  if (resolution.kind === 'error') return { action: 'error', ...resolution };
  if (request.group === 'root') return { action: 'redirect', route: resolution.route };

  if (snapshot.session === 'guest') {
    const developmentMissionReady =
      snapshot.developmentPreview &&
      snapshot.onboarding === 'complete' &&
      snapshot.guardianApproval !== 'required' &&
      snapshot.activation === 'complete' &&
      snapshot.appReadiness === 'ready';
    if (request.group === 'app' && developmentMissionReady) {
      return { action: 'allow' };
    }
    if (request.group === 'auth' && publicGuestAuthScreens.has(request.screen)) {
      return { action: 'allow' };
    }
    if (request.group === 'onboarding') {
      if (!snapshot.onboardingRoute) return { action: 'hold', phase: 'onboarding' };
      return canAccessOnboarding(request, snapshot, resolution)
        ? { action: 'allow' }
        : { action: 'redirect', route: snapshot.onboardingRoute };
    }
    return { action: 'redirect', route: resolution.route };
  }

  if (resolution.phase === 'emailVerification') {
    return request.group === 'auth' && request.screen === 'verify'
      ? { action: 'allow' }
      : { action: 'redirect', route: resolution.route };
  }

  if (
    resolution.phase === 'onboarding' ||
    resolution.phase === 'guardianApproval' ||
    resolution.phase === 'activation'
  ) {
    if (request.group !== 'onboarding') {
      return { action: 'redirect', route: resolution.route };
    }
    return canAccessOnboarding(request, snapshot, resolution)
      ? { action: 'allow' }
      : { action: 'redirect', route: resolution.route };
  }

  return request.group === 'app'
    ? { action: 'allow' }
    : { action: 'redirect', route: resolution.route };
}
