export * from './generator.ts';
export * from './mission-library.ts';
export * from './models.ts';
export * from './schemas.ts';
export * from './state-machine.ts';

import { WINTER_ARC_DURATION_DAYS } from './models.ts';

export function calculateCompletionPercent(completedDays: number): number {
  if (!Number.isFinite(completedDays)) return 0;
  const wholeDays = Math.floor(completedDays);
  const boundedDays = Math.min(Math.max(wholeDays, 0), WINTER_ARC_DURATION_DAYS);
  return Math.round((boundedDays / WINTER_ARC_DURATION_DAYS) * 100);
}
