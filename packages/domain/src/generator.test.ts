import { describe, expect, it } from 'vitest';

import {
  calculatePlanXpRange,
  deriveCapabilityProfile,
  fingerprintCanonicalPlan,
  generateWinterArcPlan,
  selectBaseTrack,
  validatePlanSafety,
} from './generator.ts';
import type { PlanAssessment } from './models.ts';

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

  it('matches the reviewed golden manifests for all four base tracks', () => {
    const fixtures = {
      athletic: { targetBuild: 'athletic' as const },
      bodyRecomp: { targetBuild: 'muscular' as const },
      definition: { targetBuild: 'defined' as const },
      foundation: { currentBuild: 'starting' as const, targetBuild: 'lean' as const },
    };
    const actual = Object.fromEntries(
      Object.entries(fixtures).map(([name, patch]) => {
        const plan = generateWinterArcPlan({ ...assessment, ...patch });
        return [
          name,
          {
            fingerprint: fingerprintCanonicalPlan(plan),
            planId: plan.planId,
            track: plan.baseTrack,
            xp: calculatePlanXpRange(plan).maximum,
          },
        ];
      }),
    );

    expect(actual).toEqual({
      athletic: {
        fingerprint: '011442u4',
        planId: 'wa_00qsv7lt',
        track: 'athletic',
        xp: 16_480,
      },
      bodyRecomp: {
        fingerprint: '01kt1vlm',
        planId: 'wa_00igfw27',
        track: 'bodyRecomp',
        xp: 16_480,
      },
      definition: {
        fingerprint: '006ebr6l',
        planId: 'wa_00uc604e',
        track: 'definition',
        xp: 16_480,
      },
      foundation: {
        fingerprint: '00g1ki87',
        planId: 'wa_01j1ior8',
        track: 'foundation',
        xp: 12_630,
      },
    });
  });

  it.each([
    { age: 14, currentWeightKg: 35, targetWeightKg: 35 },
    { age: 17, currentWeightKg: 250, targetWeightKg: 250 },
    { age: 18, currentWeightKg: 35, targetWeightKg: 250 },
    { age: 100, currentWeightKg: 250, targetWeightKg: 35 },
  ])('is deterministic and safe at assessment boundary %#', (boundary) => {
    const input = { ...assessment, ...boundary };
    const first = generateWinterArcPlan(input);
    const second = generateWinterArcPlan(input);

    expect(first).toEqual(second);
    expect(first.version).toBe(2);
    expect(first.seedVersion).toBe('mission-kairo.core.2026-08-26');
    expect(validatePlanSafety(first, boundary.age)).toEqual([]);
  });

  it('preserves deterministic workload and safety properties across the assessment space', () => {
    const ages = [14, 17, 18, 40, 100] as const;
    const builds = ['starting', 'average', 'athletic', 'defined'] as const;
    const targets = ['lean', 'athletic', 'muscular', 'defined'] as const;
    const gyms = ['member', 'home', 'outdoor', 'none'] as const;
    const relationships = ['selfFocus', 'approach', 'date', 'relationship', 'strengthen'] as const;

    for (let index = 0; index < 128; index += 1) {
      const input: PlanAssessment = {
        ...assessment,
        age: ages[index % ages.length]!,
        currentBuild: builds[(index * 3) % builds.length]!,
        currentWeightKg: index % 2 === 0 ? 35 : 250,
        gymAccess: gyms[(index * 5) % gyms.length]!,
        hoursPerWeek: [0, 1.5, 6, 40][(index * 7) % 4]!,
        relationshipGoal: relationships[(index * 11) % relationships.length]!,
        targetBuild: targets[(index * 13) % targets.length]!,
        targetWeightKg: index % 3 === 0 ? 250 : 35,
      };
      const first = generateWinterArcPlan(input);
      const second = generateWinterArcPlan(input);
      const scheduledIds = first.days.flatMap((day) =>
        day.missions.map((mission) => mission.scheduledId),
      );

      expect(fingerprintCanonicalPlan(first)).toBe(fingerprintCanonicalPlan(second));
      expect(validatePlanSafety(first, input.age)).toEqual([]);
      expect(new Set(scheduledIds).size).toBe(scheduledIds.length);
      expect(
        first.days.every(
          (day) =>
            day.missions.reduce((minutes, mission) => minutes + mission.durationMinutes, 0) <= 90,
        ),
      ).toBe(true);
    }
  });
});
