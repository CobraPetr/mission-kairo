import { describe, expect, it } from 'vitest';

import {
  classifyRoute,
  resolveBoot,
  resolveInitialRoute,
  resolveRouteAccess,
  type BootSnapshot,
} from './resolve-initial-route';

const ready: BootSnapshot = {
  activation: 'complete',
  appReadiness: 'ready',
  authFlow: 'standard',
  configuration: 'ready',
  developmentPreview: false,
  emailVerification: 'complete',
  entitlement: 'notEnforced',
  guardianApproval: 'notRequired',
  onboarding: 'complete',
  onboardingRoute: '/(onboarding)/plan-preview',
  session: 'authenticated',
  workspaceSafety: 'ready',
};

describe('resolveInitialRoute', () => {
  it.each([
    ['session', { session: 'loading' as const }],
    ['emailVerification', { emailVerification: 'unknown' as const }],
    ['onboarding', { onboarding: 'unknown' as const }],
    ['guardianApproval', { guardianApproval: 'unknown' as const }],
    ['activation', { activation: 'unknown' as const }],
    ['entitlement', { entitlement: 'unknown' as const }],
    ['appReadiness', { appReadiness: 'unknown' as const }],
  ])('holds at the %s dependency while it hydrates', (phase, patch) => {
    expect(resolveBoot({ ...ready, ...patch })).toEqual({ kind: 'loading', phase });
  });

  it.each([
    ['guest session', { session: 'guest' as const }, '/(auth)/welcome'],
    ['unverified email', { emailVerification: 'required' as const }, '/(auth)/verify'],
    [
      'unfinished onboarding',
      {
        onboarding: 'required' as const,
        onboardingRoute: '/(onboarding)/career' as const,
      },
      '/(onboarding)/career',
    ],
    [
      'missing guardian approval',
      { guardianApproval: 'required' as const },
      '/(onboarding)/review',
    ],
    [
      'missing canonical activation',
      { activation: 'required' as const },
      '/(onboarding)/plan-preview',
    ],
  ])('routes the %s prerequisite', (_name, patch, route) => {
    expect(resolveInitialRoute({ ...ready, ...patch })).toBe(route);
  });

  it('opens Today only after every prerequisite is complete', () => {
    expect(resolveInitialRoute(ready)).toBe('/(app)/today');
  });

  it('fails closed for configuration, session, workspace, and unavailable entitlement errors', () => {
    expect(resolveBoot({ ...ready, configuration: 'error' }).kind).toBe('error');
    expect(resolveBoot({ ...ready, session: 'error' }).kind).toBe('error');
    expect(resolveBoot({ ...ready, workspaceSafety: 'error' })).toMatchObject({
      kind: 'error',
      phase: 'workspaceSafety',
    });
    expect(resolveBoot({ ...ready, appReadiness: 'error' }).kind).toBe('error');
    expect(resolveBoot({ ...ready, entitlement: 'required' })).toMatchObject({
      kind: 'error',
      phase: 'entitlement',
    });
  });
});

describe('classifyRoute', () => {
  it.each([
    [[], { group: 'root' }],
    [['(app)', 'today'], { group: 'app' }],
    [['(auth)', 'sign-in'], { group: 'auth', screen: 'sign-in' }],
    [['auth', 'callback'], { group: 'authCallback' }],
    [['auth', 'reset-password'], { group: 'passwordReset' }],
    [['(onboarding)', 'career'], { group: 'onboarding', section: 'career' }],
    [['demo-reset'], { group: 'demoReset' }],
    [['private-unknown'], { group: 'unknown' }],
  ])('classifies %j', (segments, expected) => {
    expect(classifyRoute(segments)).toEqual(expected);
  });
});

describe('resolveRouteAccess', () => {
  it('blocks every protected group for a guest', () => {
    const guest = { ...ready, session: 'guest' as const };
    expect(resolveRouteAccess(guest, { group: 'app' })).toEqual({
      action: 'redirect',
      route: '/(auth)/welcome',
    });
    expect(resolveRouteAccess(guest, { group: 'unknown' })).toEqual({
      action: 'redirect',
      route: '/(auth)/welcome',
    });
  });

  it('allows only the public email authentication screens for a guest', () => {
    const guest = { ...ready, session: 'guest' as const };
    for (const screen of ['welcome', 'sign-in', 'sign-up', 'forgot-password', 'verify']) {
      expect(resolveRouteAccess(guest, { group: 'auth', screen })).toEqual({ action: 'allow' });
    }
    expect(
      resolveRouteAccess(guest, { group: 'auth', screen: 'private-auth-route' }),
    ).toMatchObject({
      action: 'redirect',
    });
  });

  it('allows guest onboarding only up to the canonical resume step', () => {
    const guest = {
      ...ready,
      onboarding: 'required' as const,
      onboardingRoute: '/(onboarding)/activity' as const,
      session: 'guest' as const,
    };
    expect(resolveRouteAccess(guest, { group: 'onboarding', section: 'identity' })).toEqual({
      action: 'allow',
    });
    expect(resolveRouteAccess(guest, { group: 'onboarding', section: 'physical' })).toEqual({
      action: 'redirect',
      route: '/(onboarding)/activity',
    });
  });

  it.each([
    ['email', { emailVerification: 'required' as const }, { group: 'app' as const }],
    ['onboarding', { onboarding: 'required' as const }, { group: 'app' as const }],
    ['activation', { activation: 'required' as const }, { group: 'app' as const }],
  ])('prevents a direct app link from skipping %s', (_name, patch, request) => {
    expect(resolveRouteAccess({ ...ready, ...patch }, request).action).toBe('redirect');
  });

  it('prevents forward onboarding deep links while allowing completed steps', () => {
    const onboarding = {
      ...ready,
      onboarding: 'required' as const,
      onboardingRoute: '/(onboarding)/confidence' as const,
    };
    expect(
      resolveRouteAccess(onboarding, { group: 'onboarding', section: 'targetWeight' }),
    ).toEqual({ action: 'allow' });
    expect(resolveRouteAccess(onboarding, { group: 'onboarding', section: 'career' })).toEqual({
      action: 'redirect',
      route: '/(onboarding)/confidence',
    });
  });

  it('allows password recovery only while the recovery flow is active', () => {
    expect(
      resolveRouteAccess({ ...ready, authFlow: 'passwordRecovery' }, { group: 'passwordReset' }),
    ).toEqual({ action: 'allow' });
    expect(resolveRouteAccess(ready, { group: 'passwordReset' })).toEqual({
      action: 'redirect',
      route: '/(app)/today',
    });
  });

  it('allows callbacks as a safe transition without exposing app content', () => {
    expect(resolveRouteAccess({ ...ready, session: 'loading' }, { group: 'authCallback' })).toEqual(
      {
        action: 'allow',
      },
    );
  });

  it('exposes demo reset only through the explicit development preview adapter', () => {
    expect(
      resolveRouteAccess({ ...ready, developmentPreview: true }, { group: 'demoReset' }),
    ).toEqual({ action: 'allow' });
    expect(resolveRouteAccess(ready, { group: 'demoReset' })).toEqual({
      action: 'redirect',
      route: '/(app)/today',
    });
  });

  it('allows the completed local mission only through the development preview adapter', () => {
    const previewGuest = {
      ...ready,
      developmentPreview: true,
      session: 'guest' as const,
    };
    expect(resolveRouteAccess(previewGuest, { group: 'app' })).toEqual({ action: 'allow' });
    expect(
      resolveRouteAccess({ ...previewGuest, activation: 'required' }, { group: 'app' }),
    ).toMatchObject({ action: 'redirect' });
  });

  it('holds instead of rendering stale content during an account switch', () => {
    expect(resolveRouteAccess({ ...ready, appReadiness: 'unknown' }, { group: 'app' })).toEqual({
      action: 'hold',
      phase: 'appReadiness',
    });
  });
});
