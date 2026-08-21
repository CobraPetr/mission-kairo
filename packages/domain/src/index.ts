export * from './generator';
export * from './mission-library';
export * from './models';
export * from './schemas';
export * from './state-machine';

import { WINTER_ARC_DURATION_DAYS } from './models';

export function calculateCompletionPercent(completedDays: number): number {
  if (!Number.isFinite(completedDays)) return 0;
  const wholeDays = Math.floor(completedDays);
  const boundedDays = Math.min(Math.max(wholeDays, 0), WINTER_ARC_DURATION_DAYS);
  return Math.round((boundedDays / WINTER_ARC_DURATION_DAYS) * 100);
}
