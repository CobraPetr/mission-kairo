import { beforeEach, describe, expect, it } from 'vitest';

import {
  createEmptyOnboardingDraft,
  type OnboardingDraft,
} from '../../features/onboarding/onboarding-schema';

import { buildScopedCacheKey, GUEST_WORKSPACE_ID } from './cache-scope';
import {
  createOnboardingRepository,
  type KeyValueStorage,
  type OnboardingCloudGateway,
  OnboardingRevisionConflictError,
} from './onboarding-repository';

function draft(updatedAt: string, mainGoal = ''): OnboardingDraft {
  return {
    ...createEmptyOnboardingDraft(),
    goals: { ...createEmptyOnboardingDraft().goals, mainGoal },
    updatedAt,
  };
}

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

class MemoryCloud implements OnboardingCloudGateway {
  drafts = new Map<string, { revision: number; value: OnboardingDraft }>();
  fail = false;

  async load(userId: string) {
    if (this.fail) throw new Error('offline');
    return this.drafts.get(userId) ?? null;
  }

  async save(userId: string, value: OnboardingDraft, expectedRevision: number) {
    if (this.fail) throw new Error('offline');
    const current = this.drafts.get(userId);
    if ((current?.revision ?? 0) !== expectedRevision) {
      throw new OnboardingRevisionConflictError();
    }

    const saved = { revision: expectedRevision + 1, value };
    this.drafts.set(userId, saved);
    return saved;
  }
}

describe('createOnboardingRepository', () => {
  let cloud: MemoryCloud;
  let storage: MemoryStorage;
  let repository: ReturnType<typeof createOnboardingRepository>;

  beforeEach(() => {
    cloud = new MemoryCloud();
    storage = new MemoryStorage();
    repository = createOnboardingRepository({
      cacheKey: (ownerId) => buildScopedCacheKey(ownerId, 'onboarding', 3),
      cloud,
      legacyGuestKey: 'legacy-onboarding',
      storage,
    });
  });

  it('keeps guest and user drafts in separate cache scopes', async () => {
    const guest = draft('2026-08-21T08:00:00.000Z', 'Guest goal');
    const user = draft('2026-08-21T09:00:00.000Z', 'User goal');

    await repository.save(GUEST_WORKSPACE_ID, guest, 0);
    cloud.drafts.set('user-a', { revision: 4, value: user });

    expect((await repository.load(GUEST_WORKSPACE_ID))?.value.goals.mainGoal).toBe('Guest goal');
    expect((await repository.load('user-a'))?.value.goals.mainGoal).toBe('User goal');
  });

  it('migrates the legacy global draft into the guest scope once', async () => {
    const legacy = draft('2026-08-21T08:00:00.000Z', 'Legacy goal');
    storage.values.set('legacy-onboarding', JSON.stringify(legacy));

    const loaded = await repository.load(GUEST_WORKSPACE_ID);

    expect(loaded).toMatchObject({ revision: 1, value: { goals: { mainGoal: 'Legacy goal' } } });
    expect(storage.values.has('legacy-onboarding')).toBe(false);
    expect(storage.values.has(buildScopedCacheKey('guest', 'onboarding', 3))).toBe(true);
  });

  it('claims a guest draft only when the authenticated account has no remote draft', async () => {
    const guest = draft('2026-08-21T08:00:00.000Z', 'Claim me');
    await repository.save(GUEST_WORKSPACE_ID, guest, 0);

    await repository.claimGuestWorkspace('new-user');

    expect(cloud.drafts.get('new-user')).toMatchObject({
      revision: 1,
      value: { goals: { mainGoal: 'Claim me' } },
    });
    expect(await repository.load(GUEST_WORKSPACE_ID)).toBeNull();
  });

  it('never overwrites an existing account with a device guest draft', async () => {
    const guest = draft('2026-08-21T10:00:00.000Z', 'Device guest');
    const remote = draft('2026-08-21T08:00:00.000Z', 'Existing account');
    await repository.save(GUEST_WORKSPACE_ID, guest, 0);
    cloud.drafts.set('existing-user', { revision: 7, value: remote });

    await repository.claimGuestWorkspace('existing-user');

    expect(cloud.drafts.get('existing-user')?.value.goals.mainGoal).toBe('Existing account');
    expect((await repository.load('existing-user'))?.revision).toBe(7);
  });

  it('keeps an offline authenticated save pending and syncs it when connectivity returns', async () => {
    const pending = draft('2026-08-21T10:00:00.000Z', 'Offline goal');
    cloud.fail = true;

    expect(await repository.save('user-a', pending, 0)).toEqual({ revision: 0, value: pending });

    cloud.fail = false;
    const synced = await repository.load('user-a');

    expect(synced).toEqual({ revision: 1, value: pending });
    expect(cloud.drafts.get('user-a')).toEqual({ revision: 1, value: pending });
  });

  it('reconciles a revision conflict against the latest remote revision', async () => {
    const remote = draft('2026-08-21T08:00:00.000Z', 'Remote');
    const local = draft('2026-08-21T09:00:00.000Z', 'Latest local');
    cloud.drafts.set('user-a', { revision: 3, value: remote });

    const saved = await repository.save('user-a', local, 2);

    expect(saved).toEqual({ revision: 4, value: local });
    expect(cloud.drafts.get('user-a')).toEqual({ revision: 4, value: local });
  });

  it('rejects an out-of-date guest write', async () => {
    await repository.save(GUEST_WORKSPACE_ID, draft('2026-08-21T08:00:00.000Z'), 0);

    await expect(
      repository.save(GUEST_WORKSPACE_ID, draft('2026-08-21T09:00:00.000Z'), 0),
    ).rejects.toBeInstanceOf(OnboardingRevisionConflictError);
  });
});
