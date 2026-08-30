import { type SessionState } from './resolve-initial-route';

export type BootAuthStatus = 'loading' | 'guest' | 'authenticated' | 'unconfigured' | 'error';

export type AppEnvironment = 'development' | 'preview' | 'production';

export type DevelopmentAuthOperation = 'refreshSession' | 'resendVerification' | 'signUp';

export type DevelopmentAuthAdapter = {
  continuationAfter(
    operation: Extract<DevelopmentAuthOperation, 'refreshSession'>,
  ): '/(app)/today' | null;
  enabled: boolean;
  handle(operation: DevelopmentAuthOperation): boolean;
};

export type BootAuthAdapterResult = {
  configuration: 'ready' | 'error';
  developmentPreview: boolean;
  session: SessionState;
};

export function createDevelopmentAuthAdapter(runtime: {
  appEnvironment: AppEnvironment;
  backendConfigured: boolean;
}): DevelopmentAuthAdapter {
  const enabled = runtime.appEnvironment === 'development' && !runtime.backendConfigured;

  return {
    continuationAfter() {
      if (!enabled) return null;
      return '/(app)/today';
    },
    enabled,
    handle() {
      return enabled;
    },
  };
}

export function adaptAuthStatusForBoot(
  status: BootAuthStatus,
  developmentPreview: boolean,
): BootAuthAdapterResult {
  if (status === 'unconfigured') {
    if (developmentPreview) {
      return {
        configuration: 'ready',
        developmentPreview: true,
        session: 'guest',
      };
    }

    return {
      configuration: 'error',
      developmentPreview: false,
      session: 'error',
    };
  }

  return {
    configuration: 'ready',
    developmentPreview: false,
    session: status,
  };
}

export function canUseGuestWorkspace(status: BootAuthStatus, developmentPreview: boolean): boolean {
  return status === 'guest' || (status === 'unconfigured' && developmentPreview);
}
