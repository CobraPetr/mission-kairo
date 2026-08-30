import { describe, expect, it } from 'vitest';

import { extractAuthCallbackParameters, isTrustedAuthCallbackUrl } from './auth-callback';

describe('extractAuthCallbackParameters', () => {
  it('extracts a PKCE authorization code', () => {
    expect(extractAuthCallbackParameters('missionkairo://auth/callback?code=secure-code')).toEqual({
      accessToken: undefined,
      code: 'secure-code',
      refreshToken: undefined,
    });
  });

  it('supports token fragments without logging or retaining the source URL', () => {
    expect(
      extractAuthCallbackParameters(
        'missionkairo://auth/callback#access_token=access&refresh_token=refresh',
      ),
    ).toEqual({
      accessToken: 'access',
      code: undefined,
      refreshToken: 'refresh',
    });
  });

  it('accepts only exact configured callback destinations', () => {
    const allowed = [
      'missionkairo://auth/callback',
      'https://missionkairo.example/auth/reset-password',
    ];

    expect(isTrustedAuthCallbackUrl('missionkairo://auth/callback?code=secure', allowed)).toBe(
      true,
    );
    expect(
      isTrustedAuthCallbackUrl(
        'https://missionkairo.example/auth/reset-password#access_token=a&refresh_token=b',
        allowed,
      ),
    ).toBe(true);
    expect(isTrustedAuthCallbackUrl('missionkairo://anything?code=secure', allowed)).toBe(false);
    expect(
      isTrustedAuthCallbackUrl('https://evil.example/auth/callback?code=secure', allowed),
    ).toBe(false);
    expect(isTrustedAuthCallbackUrl('not-a-url', allowed)).toBe(false);
  });
});
