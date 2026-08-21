export type DemoResetRuntime = {
  appEnvironment: 'development' | 'preview' | 'production';
  backendConfigured: boolean;
};

export function canRunDemoReset(runtime: DemoResetRuntime): boolean {
  return runtime.appEnvironment === 'development' && !runtime.backendConfigured;
}
