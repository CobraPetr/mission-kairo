import { describe, expect, it } from 'vitest';

import { generateWinterArcPlan } from './generator';
import type { PlanAssessment, PlanGenerationState } from './models';
import { reducePlanGeneration } from './state-machine';

const assessment: PlanAssessment = {
  age: 18,
  careerGoal: 'education',
  confidenceGoals: ['discipline'],
  currentBuild: 'average',
  currentWeightKg: 78,
  gymAccess: 'home',
  hoursPerWeek: 3,
  mainGoal: 'Become consistent enough to trust my own word.',
  relationshipGoal: 'selfFocus',
  targetBuild: 'athletic',
  targetWeightKg: 75,
};

describe('plan generation state machine', () => {
  it('moves through generating, ready, and reset states', () => {
    let state: PlanGenerationState = { status: 'idle' };
    state = reducePlanGeneration(state, { type: 'START' });
    expect(state.status).toBe('generating');
    state = reducePlanGeneration(state, {
      plan: generateWinterArcPlan(assessment),
      type: 'SUCCEED',
    });
    expect(state.status).toBe('ready');
    state = reducePlanGeneration(state, { type: 'RESET' });
    expect(state.status).toBe('idle');
  });
});
