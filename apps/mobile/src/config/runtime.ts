import { z } from 'zod';

const optionalText = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().min(1).optional(),
);

const optionalUrl = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.url().optional(),
);

const publicRuntimeSchema = z
  .object({
    appEnvironment: z.enum(['development', 'preview', 'production']).default('development'),
    privacyPolicyUrl: optionalUrl,
    revenueCatAndroidKey: optionalText,
    revenueCatIosKey: optionalText,
    supportUrl: optionalUrl,
    supabaseUrl: optionalUrl,
    supabasePublishableKey: optionalText,
    termsUrl: optionalUrl,
  })
  .superRefine((value, context) => {
    const hasSupabaseUrl = value.supabaseUrl !== undefined;
    const hasSupabaseKey = value.supabasePublishableKey !== undefined;

    if (hasSupabaseUrl !== hasSupabaseKey) {
      context.addIssue({
        code: 'custom',
        message: 'Supabase URL and publishable key must be configured together.',
        path: hasSupabaseUrl ? ['supabasePublishableKey'] : ['supabaseUrl'],
      });
    }

    if (value.appEnvironment === 'production') {
      if (!hasSupabaseUrl || !hasSupabaseKey) {
        context.addIssue({
          code: 'custom',
          message: 'Production builds require Supabase URL and publishable key.',
          path: ['supabaseUrl'],
        });
      }
      if (!value.revenueCatIosKey || !value.revenueCatAndroidKey) {
        context.addIssue({
          code: 'custom',
          message: 'Production builds require both RevenueCat platform keys.',
          path: ['revenueCatIosKey'],
        });
      }
      if (!value.privacyPolicyUrl || !value.termsUrl || !value.supportUrl) {
        context.addIssue({
          code: 'custom',
          message: 'Production builds require public privacy, terms, and support URLs.',
          path: ['privacyPolicyUrl'],
        });
      }
    }
  });

export type PublicRuntimeConfig = z.infer<typeof publicRuntimeSchema>;

type PublicEnvironmentSource = {
  EXPO_PUBLIC_APP_ENV?: string;
  EXPO_PUBLIC_PRIVACY_POLICY_URL?: string;
  EXPO_PUBLIC_REVENUECAT_ANDROID_KEY?: string;
  EXPO_PUBLIC_REVENUECAT_IOS_KEY?: string;
  EXPO_PUBLIC_SUPPORT_URL?: string;
  EXPO_PUBLIC_SUPABASE_ANON_KEY?: string;
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
  EXPO_PUBLIC_SUPABASE_URL?: string;
  EXPO_PUBLIC_TERMS_URL?: string;
};

export function parsePublicRuntimeConfig(source: PublicEnvironmentSource): PublicRuntimeConfig {
  return publicRuntimeSchema.parse({
    appEnvironment: source.EXPO_PUBLIC_APP_ENV,
    privacyPolicyUrl: source.EXPO_PUBLIC_PRIVACY_POLICY_URL,
    revenueCatAndroidKey: source.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
    revenueCatIosKey: source.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
    supportUrl: source.EXPO_PUBLIC_SUPPORT_URL,
    supabasePublishableKey:
      source.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? source.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    supabaseUrl: source.EXPO_PUBLIC_SUPABASE_URL,
    termsUrl: source.EXPO_PUBLIC_TERMS_URL,
  });
}

export const publicRuntimeConfig = parsePublicRuntimeConfig({
  EXPO_PUBLIC_APP_ENV: process.env.EXPO_PUBLIC_APP_ENV,
  EXPO_PUBLIC_PRIVACY_POLICY_URL: process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL,
  EXPO_PUBLIC_REVENUECAT_ANDROID_KEY: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
  EXPO_PUBLIC_REVENUECAT_IOS_KEY: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
  EXPO_PUBLIC_SUPPORT_URL: process.env.EXPO_PUBLIC_SUPPORT_URL,
  EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_TERMS_URL: process.env.EXPO_PUBLIC_TERMS_URL,
});
