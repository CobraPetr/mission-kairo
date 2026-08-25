import { type SessionState } from './resolve-initial-route';

export type BootAuthStatus = 'loading' | 'guest' | 'authenticated' | 'unconfigured' | 'error';

export type AppEnvironment = 'development' | 'preview' | 'production';

export type BootAuthAdapterResult = {
  configuration: 'ready' | 'error';
  developmentPreview: boolean;
  session: SessionState;
};

export function adaptAuthStatusForBoot(
  status: BootAuthStatus,
  appEnvironment: AppEnvironment,
): BootAuthAdapterResult {
  if (status === 'unconfigured') {
    if (appEnvironment === 'development') {
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

export function canUseGuestWorkspace(
  status: BootAuthStatus,
  appEnvironment: AppEnvironment,
): boolean {
  return status === 'guest' || (status === 'unconfigured' && appEnvironment === 'development');
}
