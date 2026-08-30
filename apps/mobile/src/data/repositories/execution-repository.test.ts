import { beforeEach, describe, expect, it } from 'vitest';

import { createEmptyExecutionState } from '../../features/execution/execution-state';
import { buildScopedCacheKey, GUEST_WORKSPACE_ID } from './cache-scope';
import {
  createExecutionRepository,
  type ExecutionCloudGateway,
  ExecutionCommandQueuedError,
  ExecutionRevisionConflictError,
  ExecutionTransportError,
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
  failTransport = false;
  loseNextResponse = false;
  receipts = new Map<
    string,
    {
      result: 'active' | 'advanced';
      revision: number;
      value: ReturnType<typeof createEmptyExecutionState>;
    }
  >();
  calls = 0;

  async execute(
    userId: string,
    request: {
      clientOccurredAt: string;
      command: 'begin' | 'pause' | 'resume' | 'advance' | 'skip' | 'close_day';
      expectedRevision: number;
      idempotencyKey: string;
      targetId: string | null;
    },
  ) {
    this.calls += 1;
    if (this.failTransport) throw new ExecutionTransportError('offline');
    if (this.fail) throw new Error('offline');
    const receiptKey = `${userId}:${request.idempotencyKey}`;
    const receipt = this.receipts.get(receiptKey);
    if (receipt) return receipt;
    const current = this.current.get(userId);
    if (!current || current.revision !== request.expectedRevision) {
      throw new ExecutionRevisionConflictError();
    }
    const next = {
      revision: current.revision + 1,
      value: {
        ...current.value,
        currentMissionId: request.targetId,
        missionStatus:
          request.command === 'begin' ? ('active' as const) : current.value.missionStatus,
      },
    };
    this.current.set(userId, next);
    const result = {
      ...next,
      result: request.command === 'begin' ? ('active' as const) : ('advanced' as const),
    };
    this.receipts.set(receiptKey, result);
    if (this.loseNextResponse) {
      this.loseNextResponse = false;
      throw new ExecutionTransportError('response lost');
    }
    return result;
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

    const result = await repository.execute('user-a', {
      clientOccurredAt: '2026-08-27T10:00:00.000Z',
      command: 'begin',
      expectedRevision: 1,
      idempotencyKey: '10000000-0000-4000-8000-000000000001',
      targetId: 'wa.day.mission',
    });

    expect(result).toMatchObject({
      result: 'active',
      revision: 2,
      value: { currentMissionId: 'wa.day.mission', missionStatus: 'active' },
    });
  });

  it('refreshes canonical state instead of replaying a stale command', async () => {
    cloud.current.set('user-a', { revision: 3, value: createEmptyExecutionState() });

    const result = await repository.execute('user-a', {
      clientOccurredAt: '2026-08-27T10:00:00.000Z',
      command: 'advance',
      expectedRevision: 2,
      idempotencyKey: '10000000-0000-4000-8000-000000000002',
      targetId: 'wa.day.mission',
    });

    expect(result.result).toBe('conflict');
    expect(result.revision).toBe(3);
  });

  it('retries a lost response with the same command identity and mutates once', async () => {
    cloud.current.set('user-a', { revision: 1, value: createEmptyExecutionState() });
    cloud.loseNextResponse = true;

    const request = {
      clientOccurredAt: '2026-08-27T10:00:00.000Z',
      command: 'begin' as const,
      expectedRevision: 1,
      idempotencyKey: '10000000-0000-4000-8000-000000000003',
      targetId: 'wa.day.mission',
    };
    const result = await repository.execute('user-a', request);

    expect(cloud.calls).toBe(2);
    expect(cloud.receipts.size).toBe(1);
    expect(result).toMatchObject({ result: 'active', revision: 2 });
    expect(cloud.current.get('user-a')?.revision).toBe(2);
  });

  it('persists a failed transport command and replays the same identity after restart', async () => {
    const cached = { revision: 1, value: createEmptyExecutionState() };
    cloud.current.set('user-a', cached);
    await repository.load('user-a');
    cloud.failTransport = true;

    const request = {
      clientOccurredAt: '2026-08-27T10:00:00.000Z',
      command: 'begin' as const,
      expectedRevision: 1,
      idempotencyKey: '10000000-0000-4000-8000-000000000004',
      targetId: 'wa.day.mission',
    };

    await expect(repository.execute('user-a', request)).rejects.toBeInstanceOf(
      ExecutionCommandQueuedError,
    );

    expect(cloud.calls).toBe(2);
    cloud.failTransport = false;
    const restarted = createExecutionRepository({
      cacheKey: (ownerId) => buildScopedCacheKey(ownerId, 'execution', 2),
      cloud,
      legacyGuestKey: 'legacy-execution',
      storage,
    });

    expect(await restarted.load('user-a')).toMatchObject({
      revision: 2,
      value: { currentMissionId: 'wa.day.mission', missionStatus: 'active' },
    });
    expect(cloud.calls).toBe(3);
    expect(cloud.receipts.size).toBe(1);
    expect(
      storage.values.has(`${buildScopedCacheKey('user-a', 'execution', 2)}:pending-commands:v1`),
    ).toBe(false);
  });

  it('does not stack a second action behind an unsynced command', async () => {
    cloud.current.set('user-a', { revision: 1, value: createEmptyExecutionState() });
    cloud.failTransport = true;
    const first = {
      clientOccurredAt: '2026-08-27T10:00:00.000Z',
      command: 'begin' as const,
      expectedRevision: 1,
      idempotencyKey: '10000000-0000-4000-8000-000000000005',
      targetId: 'wa.day.mission',
    };

    await expect(repository.execute('user-a', first)).rejects.toBeInstanceOf(
      ExecutionCommandQueuedError,
    );
    await expect(
      repository.execute('user-a', {
        ...first,
        command: 'skip',
        idempotencyKey: '10000000-0000-4000-8000-000000000006',
      }),
    ).rejects.toBeInstanceOf(ExecutionCommandQueuedError);

    const queued = JSON.parse(
      storage.values.get(`${buildScopedCacheKey('user-a', 'execution', 2)}:pending-commands:v1`) ??
        '{}',
    ) as { commands?: unknown[] };
    expect(queued.commands).toHaveLength(1);
  });

  it('drops a stale queued command and restores canonical server state', async () => {
    cloud.current.set('user-a', { revision: 1, value: createEmptyExecutionState() });
    cloud.failTransport = true;
    await expect(
      repository.execute('user-a', {
        clientOccurredAt: '2026-08-27T10:00:00.000Z',
        command: 'begin',
        expectedRevision: 1,
        idempotencyKey: '10000000-0000-4000-8000-000000000007',
        targetId: 'wa.day.mission',
      }),
    ).rejects.toBeInstanceOf(ExecutionCommandQueuedError);

    cloud.failTransport = false;
    cloud.current.set('user-a', { revision: 2, value: createEmptyExecutionState() });

    expect((await repository.load('user-a'))?.revision).toBe(2);
    expect(
      storage.values.has(`${buildScopedCacheKey('user-a', 'execution', 2)}:pending-commands:v1`),
    ).toBe(false);
  });

  it('clears preview execution when an account takes ownership', async () => {
    await repository.save(GUEST_WORKSPACE_ID, createEmptyExecutionState(), 0);

    await repository.claimGuestWorkspace('user-a');

    expect(await repository.load(GUEST_WORKSPACE_ID)).toBeNull();
  });
});
