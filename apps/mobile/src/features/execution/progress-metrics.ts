import { type PlanDay } from '@winter-arc/domain';

export function getActiveWeekStartIndex(activeDay: number): number {
  const boundedDay = Math.min(Math.max(Math.trunc(activeDay), 1), 90);
  return Math.floor((boundedDay - 1) / 7) * 7;
}

export function calculateSealedDayStreak(
  sealedDayNumbers: number[],
  missedDayNumbers: number[] = [],
): number {
  const uniqueDays = [...new Set(sealedDayNumbers)]
    .filter((day) => Number.isInteger(day) && day >= 1 && day <= 90)
    .sort((left, right) => right - left);
  if (uniqueDays.length === 0) return 0;

  const latestMissedDay = Math.max(0, ...missedDayNumbers);
  if (latestMissedDay > uniqueDays[0]!) return 0;

  let streak = 1;
  for (let index = 1; index < uniqueDays.length; index += 1) {
    if (uniqueDays[index] !== uniqueDays[index - 1]! - 1) break;
    streak += 1;
  }
  return streak;
}

export function calculateActiveWeekProgress(
  days: PlanDay[],
  activeDay: number,
  completedMissionIds: string[],
): number[] {
  const start = getActiveWeekStartIndex(activeDay);
  const completed = new Set(completedMissionIds);

  return Array.from({ length: 7 }, (_, index) => {
    const day = days[start + index];
    if (!day || day.missions.length === 0) return 0;
    return (
      day.missions.filter((mission) => completed.has(mission.scheduledId)).length /
      day.missions.length
    );
  });
}
