import { describe, expect, it } from 'vitest';

import { parsePublicRuntimeConfig } from './runtime';

describe('parsePublicRuntimeConfig', () => {
  it('uses safe development defaults when optional services are absent', () => {
    expect(parsePublicRuntimeConfig({})).toEqual({
      appEnvironment: 'development',
    });
  });

  it('accepts complete public service configuration', () => {
    const config = parsePublicRuntimeConfig({
      EXPO_PUBLIC_APP_ENV: 'preview',
      EXPO_PUBLIC_PRIVACY_POLICY_URL: 'https://missionkairo.example/privacy',
      EXPO_PUBLIC_REVENUECAT_ANDROID_KEY: 'android-public-key',
      EXPO_PUBLIC_REVENUECAT_IOS_KEY: 'ios-public-key',
      EXPO_PUBLIC_SUPPORT_URL: 'https://missionkairo.example/support',
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_public-key',
      EXPO_PUBLIC_SUPABASE_URL: 'https://winter-arc.supabase.co',
      EXPO_PUBLIC_TERMS_URL: 'https://missionkairo.example/terms',
    });

    expect(config.appEnvironment).toBe('preview');
    expect(config.supabaseUrl).toBe('https://winter-arc.supabase.co');
  });

  it('rejects incomplete Supabase configuration', () => {
    expect(() =>
      parsePublicRuntimeConfig({
        EXPO_PUBLIC_SUPABASE_URL: 'https://winter-arc.supabase.co',
      }),
    ).toThrow('Supabase URL and publishable key must be configured together.');
  });

  it('retains compatibility with the legacy public anon key', () => {
    expect(
      parsePublicRuntimeConfig({
        EXPO_PUBLIC_SUPABASE_ANON_KEY: 'legacy-anon-key',
        EXPO_PUBLIC_SUPABASE_URL: 'https://winter-arc.supabase.co',
      }).supabasePublishableKey,
    ).toBe('legacy-anon-key');
  });

  it('rejects malformed public values', () => {
    expect(() =>
      parsePublicRuntimeConfig({
        EXPO_PUBLIC_APP_ENV: 'staging',
      }),
    ).toThrow();
  });

  it('refuses a production build without backend and subscription configuration', () => {
    expect(() =>
      parsePublicRuntimeConfig({
        EXPO_PUBLIC_APP_ENV: 'production',
      }),
    ).toThrow('Production builds require Supabase URL and publishable key.');
  });

  it('refuses a production build without public legal and support pages', () => {
    expect(() =>
      parsePublicRuntimeConfig({
        EXPO_PUBLIC_APP_ENV: 'production',
        EXPO_PUBLIC_REVENUECAT_ANDROID_KEY: 'android-public-key',
        EXPO_PUBLIC_REVENUECAT_IOS_KEY: 'ios-public-key',
        EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_public-key',
        EXPO_PUBLIC_SUPABASE_URL: 'https://mission-kairo.supabase.co',
      }),
    ).toThrow('Production builds require public privacy, terms, and support URLs.');
  });
});
