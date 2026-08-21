export type AuthCallbackParameters = {
  accessToken?: string;
  code?: string;
  refreshToken?: string;
};

function callbackIdentity(url: string): string | null {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}${parsed.pathname.replace(/\/+$/, '')}`;
  } catch {
    return null;
  }
}

export function isTrustedAuthCallbackUrl(url: string, allowedRedirectUrls: string[]): boolean {
  const identity = callbackIdentity(url);
  return (
    identity !== null &&
    allowedRedirectUrls.some((allowed) => callbackIdentity(allowed) === identity)
  );
}

export function extractAuthCallbackParameters(url: string): AuthCallbackParameters {
  const parsed = new URL(url);
  const fragment = new URLSearchParams(parsed.hash.replace(/^#/, ''));

  return {
    accessToken: fragment.get('access_token') ?? undefined,
    code: parsed.searchParams.get('code') ?? undefined,
    refreshToken: fragment.get('refresh_token') ?? undefined,
  };
}
