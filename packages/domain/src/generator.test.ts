import { describe, expect, it } from 'vitest';

import {
  calculatePlanXpRange,
  deriveCapabilityProfile,
  generateWinterArcPlan,
  selectBaseTrack,
  validatePlanSafety,
} from './generator';
import type { PlanAssessment } from './models';

const assessment: PlanAssessment = {
  age: 18,
  careerGoal: 'education',
  confidenceGoals: ['discipline', 'socialConfidence'],
  currentBuild: 'average',
  currentWeightKg: 78,
  gymAccess: 'member',
  hoursPerWeek: 4,
  mainGoal: 'Build a disciplined routine and become visibly fitter.',
  relationshipGoal: 'selfFocus',
  targetBuild: 'athletic',
  targetWeightKg: 75,
};

describe('Winter Arc plan generation', () => {
  it('is deterministic and produces a valid 90-day calendar', () => {
    const first = generateWinterArcPlan(assessment);
    const second = generateWinterArcPlan(assessment);

    expect(first).toEqual(second);
    expect(first.days).toHaveLength(90);
    expect(first.days[0]?.day).toBe(1);
    expect(first.days[89]?.day).toBe(90);
    expect(validatePlanSafety(first, assessment.age)).toEqual([]);
  });

  it('maintains an exact 80/20 core-to-personalized mission split', () => {
    const missions = generateWinterArcPlan(assessment).days.flatMap((day) => day.missions);
    const personalized = missions.filter((mission) => mission.source === 'personalized');
    const core = missions.filter((mission) => mission.source === 'core');

    expect(core).toHaveLength(180);
    expect(personalized).toHaveLength(45);
    expect(core.length / missions.length).toBe(0.8);
  });

  it('inserts recovery days and the three checkpoints', () => {
    const plan = generateWinterArcPlan(assessment);
    expect(plan.days.filter((day) => day.kind === 'recovery')).toHaveLength(12);
    expect(plan.days.filter((day) => day.kind === 'checkpoint').map((day) => day.day)).toEqual([
      30, 60, 90,
    ]);
  });

  it('derives capability, track, and a bounded XP range', () => {
    expect(deriveCapabilityProfile(assessment)).toEqual({
      equipment: 'fullGym',
      level: 'consistent',
      weeklyMinutes: 240,
    });
    expect(selectBaseTrack(assessment)).toBe('athletic');
    const xp = calculatePlanXpRange(generateWinterArcPlan(assessment));
    expect(xp.minimum).toBeGreaterThan(0);
    expect(xp.maximum).toBeGreaterThan(xp.minimum);
  });

  it('rejects goals that become empty after normalization', () => {
    expect(() => generateWinterArcPlan({ ...assessment, mainGoal: '            ' })).toThrow();
  });
});
