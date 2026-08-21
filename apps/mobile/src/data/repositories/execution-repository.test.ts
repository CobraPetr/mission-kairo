import { beforeEach, describe, expect, it } from 'vitest';

import { createEmptyExecutionState } from '../../features/execution/execution-state';
import { buildScopedCacheKey, GUEST_WORKSPACE_ID } from './cache-scope';
import {
  createExecutionRepository,
  type ExecutionCloudGateway,
  ExecutionRevisionConflictError,
} from './execution-repository';
import { type KeyValueStorage } from './onboarding-repository';

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

class MemoryCloud implements ExecutionCloudGateway {
  current = new Map<
    string,
    { revision: number; value: ReturnType<typeof createEmptyExecutionState> }
  >();
  fail = false;

  async execute(
    userId: string,
    command: 'begin' | 'pause' | 'resume' | 'advance' | 'skip' | 'close_day',
    scheduledKey: string | null,
    expectedRevision: number,
  ) {
    if (this.fail) throw new Error('offline');
    const current = this.current.get(userId);
    if (!current || current.revision !== expectedRevision) {
      throw new ExecutionRevisionConflictError();
    }
    const next = {
      revision: current.revision + 1,
      value: {
        ...current.value,
        currentMissionId: scheduledKey,
        missionStatus: command === 'begin' ? ('active' as const) : current.value.missionStatus,
      },
    };
    this.current.set(userId, next);
    return { ...next, result: command === 'begin' ? ('active' as const) : ('advanced' as const) };
  }

  async load(userId: string) {
    if (this.fail) throw new Error('offline');
    return this.current.get(userId) ?? null;
  }
}

describe('createExecutionRepository', () => {
  let cloud: MemoryCloud;
  let storage: MemoryStorage;
  let repository: ReturnType<typeof createExecutionRepository>;

  beforeEach(() => {
    cloud = new MemoryCloud();
    storage = new MemoryStorage();
    repository = createExecutionRepository({
      cacheKey: (ownerId) => buildScopedCacheKey(ownerId, 'execution', 2),
      cloud,
      legacyGuestKey: 'legacy-execution',
      storage,
    });
  });

  it('keeps local preview execution isolated to the guest workspace', async () => {
    const saved = await repository.save(GUEST_WORKSPACE_ID, createEmptyExecutionState(), 0);

    expect(saved.revision).toBe(1);
    expect(await repository.load(GUEST_WORKSPACE_ID)).toEqual(saved);
    expect(await repository.load('user-a')).toBeNull();
  });

  it('loads and caches canonical authenticated execution', async () => {
    cloud.current.set('user-a', { revision: 4, value: createEmptyExecutionState() });
    expect((await repository.load('user-a'))?.revision).toBe(4);

    cloud.fail = true;
    expect((await repository.load('user-a'))?.revision).toBe(4);
  });

  it('executes an authenticated command and caches the server response', async () => {
    cloud.current.set('user-a', { revision: 1, value: createEmptyExecutionState() });

    const result = await repository.execute('user-a', 'begin', 'wa.day.mission', 1);

    expect(result).toMatchObject({
      result: 'active',
      revision: 2,
      value: { currentMissionId: 'wa.day.mission', missionStatus: 'active' },
    });
  });

  it('refreshes canonical state instead of replaying a stale command', async () => {
    cloud.current.set('user-a', { revision: 3, value: createEmptyExecutionState() });

    const result = await repository.execute('user-a', 'advance', 'wa.day.mission', 2);

    expect(result.result).toBe('conflict');
    expect(result.revision).toBe(3);
  });

  it('clears preview execution when an account takes ownership', async () => {
    await repository.save(GUEST_WORKSPACE_ID, createEmptyExecutionState(), 0);

    await repository.claimGuestWorkspace('user-a');

    expect(await repository.load(GUEST_WORKSPACE_ID)).toBeNull();
  });
});
