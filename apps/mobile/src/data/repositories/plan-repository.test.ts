import { generateWinterArcPlan, type WinterArcPlan } from '@winter-arc/domain';
import { beforeEach, describe, expect, it } from 'vitest';

import { buildScopedCacheKey, GUEST_WORKSPACE_ID } from './cache-scope';
import { type KeyValueStorage } from './onboarding-repository';
import { createPlanRepository, type PlanCloudGateway } from './plan-repository';

const assessment = {
  age: 19,
  careerGoal: 'Build a useful professional skill',
  confidenceGoals: ['conversation'],
  currentBuild: 'average' as const,
  currentWeightKg: 80,
  gymAccess: 'member' as const,
  hoursPerWeek: 4,
  mainGoal: 'Become stronger and more consistent over the full season.',
  relationshipGoal: 'approach' as const,
  targetBuild: 'defined' as const,
  targetWeightKg: 76,
};

class MemoryStorage implements KeyValueStorage {
  values = new Map<string, string>();
  async getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  async removeItem(key: string) {
    this.values.delete(key);
  }
  async setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

class MemoryCloud implements PlanCloudGateway {
  fail = false;
  plans = new Map<string, WinterArcPlan>();
  async load(userId: string) {
    if (this.fail) throw new Error('offline');
    return this.plans.get(userId) ?? null;
  }
}

describe('createPlanRepository', () => {
  let cloud: MemoryCloud;
  let storage: MemoryStorage;
  let repository: ReturnType<typeof createPlanRepository>;
  let plan: WinterArcPlan;

  beforeEach(() => {
    cloud = new MemoryCloud();
    storage = new MemoryStorage();
    plan = generateWinterArcPlan(assessment);
    repository = createPlanRepository({
      cacheKey: (ownerId) => buildScopedCacheKey(ownerId, 'plan', 2),
      cloud,
      legacyGuestKey: 'legacy-plan',
      storage,
    });
  });

  it('saves a generated guest preview only in the guest scope', async () => {
    await repository.save(GUEST_WORKSPACE_ID, plan);

    expect(await repository.load(GUEST_WORKSPACE_ID)).toEqual({ canonical: false, plan });
    expect(await repository.load('user-a')).toBeNull();
  });

  it('uses the active server plan for an authenticated account', async () => {
    const serverPlan = { ...plan, planId: 'wa_1234abcd' };
    await repository.save('user-a', plan);
    cloud.plans.set('user-a', serverPlan);

    expect(await repository.load('user-a')).toEqual({ canonical: true, plan: serverPlan });
  });

  it('allows an already-activated plan to load from cache while offline', async () => {
    cloud.plans.set('user-a', plan);
    await repository.load('user-a');
    cloud.fail = true;

    expect(await repository.load('user-a')).toEqual({ canonical: true, plan });
  });

  it('fails closed on an offline authenticated preview that was never activated', async () => {
    await repository.save('user-a', plan);
    cloud.fail = true;

    await expect(repository.load('user-a')).rejects.toThrow('offline');
  });

  it('does not treat a guest preview as an activated account plan', async () => {
    await repository.save(GUEST_WORKSPACE_ID, plan);

    await repository.claimGuestWorkspace('user-a');

    expect(await repository.load('user-a')).toBeNull();
    expect(await repository.load(GUEST_WORKSPACE_ID)).toBeNull();
  });

  it('migrates the previous global plan cache into the guest scope', async () => {
    storage.values.set('legacy-plan', JSON.stringify(plan));

    expect(await repository.load(GUEST_WORKSPACE_ID)).toEqual({ canonical: false, plan });
    expect(storage.values.has('legacy-plan')).toBe(false);
  });
});
