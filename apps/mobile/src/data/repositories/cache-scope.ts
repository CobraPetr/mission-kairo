export const GUEST_WORKSPACE_ID = 'guest';

export type WorkspaceOwnerId = typeof GUEST_WORKSPACE_ID | string;

export function buildScopedCacheKey(
  ownerId: WorkspaceOwnerId,
  resource: 'execution' | 'onboarding' | 'plan' | 'profile' | 'subscription',
  version: number,
): string {
  const normalizedOwner = ownerId.trim();
  if (!normalizedOwner) throw new Error('A cache owner is required.');
  if (!Number.isInteger(version) || version < 1)
    throw new Error('A positive cache version is required.');
  return `winterarc:${encodeURIComponent(normalizedOwner)}:${resource}:v${version}`;
}
