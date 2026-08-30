import { type ConfigContext, type ExpoConfig } from 'expo/config';

export default function defineAppConfig({ config }: ConfigContext): ExpoConfig {
  if (process.env.EXPO_PUBLIC_APP_ENV === 'production') {
    const requiredVariables = [
      'EXPO_PUBLIC_SUPABASE_URL',
      'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
      'EXPO_PUBLIC_REVENUECAT_IOS_KEY',
      'EXPO_PUBLIC_REVENUECAT_ANDROID_KEY',
      'EXPO_PUBLIC_PRIVACY_POLICY_URL',
      'EXPO_PUBLIC_TERMS_URL',
      'EXPO_PUBLIC_SUPPORT_URL',
    ];
    const missing = requiredVariables.filter((name) => !process.env[name]?.trim());

    if (missing.length > 0) {
      throw new Error(`Production build preflight failed. Missing: ${missing.join(', ')}.`);
    }
  }

  return config as ExpoConfig;
}
