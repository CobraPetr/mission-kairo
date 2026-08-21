import { describe, expect, it } from 'vitest';

import { createEmptyOnboardingDraft } from '../onboarding/onboarding-schema';
import { buildPlanAssessment } from './build-assessment';

describe('build plan assessment', () => {
  it('rejects an incomplete onboarding draft', () => {
    expect(() => buildPlanAssessment(createEmptyOnboardingDraft())).toThrow();
  });

  it('maps a completed draft to the domain assessment', () => {
    const draft = createEmptyOnboardingDraft();
    draft.identity = {
      ...draft.identity,
      age: 18,
      ageInput: '18',
      fullName: 'Alex Stone',
      heightCm: 180,
      heightMajorInput: '180',
      username: 'alex_stone',
      weightInput: '78',
      weightKg: 78,
    };
    draft.activity = {
      gymAccess: 'member',
      hoursPerWeek: 4,
      hoursPerWeekInput: '4',
      sport: '',
    };
    draft.physical.currentBuild = 'average';
    draft.goals = {
      careerGoal: 'education',
      confidenceGoals: ['discipline'],
      mainGoal: 'Become consistent and visibly fitter over ninety days.',
      relationshipGoal: 'selfFocus',
      targetBuild: 'athletic',
      targetWeightInput: '75',
      targetWeightKg: 75,
    };

    expect(buildPlanAssessment(draft)).toMatchObject({
      age: 18,
      currentWeightKg: 78,
      targetWeightKg: 75,
    });
  });
});
