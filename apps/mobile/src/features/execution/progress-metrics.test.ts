import { generateWinterArcPlan } from '@winter-arc/domain';
import { describe, expect, it } from 'vitest';

import {
  calculateActiveWeekProgress,
  calculateSealedDayStreak,
  getActiveWeekStartIndex,
} from './progress-metrics';

const plan = generateWinterArcPlan({
  age: 21,
  careerGoal: 'skillBuilding',
  confidenceGoals: ['discipline'],
  currentBuild: 'average',
  currentWeightKg: 78,
  gymAccess: 'member',
  hoursPerWeek: 4,
  mainGoal: 'Build a stronger and more disciplined daily routine.',
  relationshipGoal: 'selfFocus',
  targetBuild: 'athletic',
  targetWeightKg: 75,
});

describe('progress metrics', () => {
  it.each([
    [1, 0],
    [7, 0],
    [8, 7],
    [14, 7],
    [15, 14],
    [84, 77],
    [85, 84],
    [90, 84],
  ])('maps day %i to the correct week start', (day, expected) => {
    expect(getActiveWeekStartIndex(day)).toBe(expected);
  });

  it('reads the active week rather than always reading week one', () => {
    const completed = plan.days[7]?.missions.map((mission) => mission.scheduledId) ?? [];
    const progress = calculateActiveWeekProgress(plan.days, 8, completed);

    expect(progress[0]).toBe(1);
    expect(progress.slice(1)).toEqual([0, 0, 0, 0, 0, 0]);
  });

  it('derives a true consecutive streak from sealed day history', () => {
    expect(calculateSealedDayStreak([1, 2, 3, 5, 6, 7, 7])).toBe(3);
    expect(calculateSealedDayStreak([1, 2, 4])).toBe(1);
    expect(calculateSealedDayStreak([])).toBe(0);
  });
});
