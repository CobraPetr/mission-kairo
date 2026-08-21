export const featureFlags = {
  aiCoach: false,
  liveLeaderboard: false,
  worldwideChat: false,
} as const;

export type FeatureFlag = keyof typeof featureFlags;

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return featureFlags[flag];
}
