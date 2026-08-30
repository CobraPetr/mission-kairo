import {
  type ExecutionState,
  executionStateSchema,
} from '../../features/execution/execution-state';

import { GUEST_WORKSPACE_ID, type WorkspaceOwnerId } from './cache-scope';
import {
  type ExecutionCommandRequest,
  type ExecutionRepository,
  type Revisioned,
} from './contracts';
import { type KeyValueStorage } from './onboarding-repository';

export type ExecutionCommandResult = Awaited<ReturnType<ExecutionRepository['execute']>>;

export type ExecutionCloudGateway = {
  execute(
    userId: string,
    request: ExecutionCommandRequest,
  ): Promise<Exclude<ExecutionCommandResult, { result: 'conflict' }>>;
  load(userId: string): Promise<Revisioned<ExecutionState> | null>;
};

type StoredExecution = Revisioned<ExecutionState>;

type StoredExecutionQueue = {
  commands: ExecutionCommandRequest[];
  version: 1;
};

type ExecutionRepositoryDependencies = {
  cacheKey(ownerId: WorkspaceOwnerId): string;
  cloud: ExecutionCloudGateway;
  legacyGuestKey?: string;
  queueKey?(ownerId: WorkspaceOwnerId): string;
  storage: KeyValueStorage;
};

export class ExecutionRevisionConflictError extends Error {
  constructor() {
    super('The execution changed on another device.');
    this.name = 'ExecutionRevisionConflictError';
  }
}

export class ExecutionTransportError extends Error {
  constructor(message = 'The mission command could not reach the server.') {
    super(message);
    this.name = 'ExecutionTransportError';
  }
}

export class ExecutionCommandQueuedError extends Error {
  constructor() {
    super('The command is secured on this device and will sync when the connection returns.');
    this.name = 'ExecutionCommandQueuedError';
  }
}

function parseStored(value: string | null): StoredExecution | null {
  if (!value) return null;
  try {
    const candidate: unknown = JSON.parse(value);
    if (!candidate || typeof candidate !== 'object') return null;
    const record = candidate as Record<string, unknown>;
    const state = executionStateSchema.safeParse(record.value);
    if (
      !state.success ||
      !Number.isSafeInteger(record.revision) ||
      (record.revision as number) < 0
    ) {
      return null;
    }
    return { revision: record.revision as number, value: state.data };
  } catch {
    return null;
  }
}

function isExecutionCommandRequest(value: unknown): value is ExecutionCommandRequest {
  if (!value || typeof value !== 'object') return false;
  const request = value as Record<string, unknown>;
  return (
    typeof request.clientOccurredAt === 'string' &&
    Number.isFinite(Date.parse(request.clientOccurredAt)) &&
    (request.command === 'begin' ||
      request.command === 'pause' ||
      request.command === 'resume' ||
      request.command === 'advance' ||
      request.command === 'skip' ||
      request.command === 'close_day') &&
    Number.isSafeInteger(request.expectedRevision) &&
    (request.expectedRevision as number) >= 0 &&
    typeof request.idempotencyKey === 'string' &&
    request.idempotencyKey.length >= 16 &&
    (request.targetId === null || typeof request.targetId === 'string')
  );
}

function parseQueue(value: string | null): StoredExecutionQueue {
  if (!value) return { commands: [], version: 1 };
  try {
    const candidate: unknown = JSON.parse(value);
    if (!candidate || typeof candidate !== 'object') return { commands: [], version: 1 };
    const record = candidate as Record<string, unknown>;
    if (
      record.version !== 1 ||
      !Array.isArray(record.commands) ||
      !record.commands.every(isExecutionCommandRequest)
    ) {
      return { commands: [], version: 1 };
    }
    return { commands: record.commands, version: 1 };
  } catch {
    return { commands: [], version: 1 };
  }
}

export function createExecutionRepository({
  cacheKey,
  cloud,
  legacyGuestKey,
  queueKey = (ownerId) => `${cacheKey(ownerId)}:pending-commands:v1`,
  storage,
}: ExecutionRepositoryDependencies): ExecutionRepository {
  async function executeCloudCommand(userId: string, request: ExecutionCommandRequest) {
    try {
      return await cloud.execute(userId, request);
    } catch (error) {
      if (!(error instanceof ExecutionTransportError)) throw error;
      return cloud.execute(userId, request);
    }
  }

  async function writeLocal(ownerId: WorkspaceOwnerId, state: StoredExecution): Promise<void> {
    await storage.setItem(cacheKey(ownerId), JSON.stringify(state));
  }

  async function readLocal(ownerId: WorkspaceOwnerId): Promise<StoredExecution | null> {
    const key = cacheKey(ownerId);
    const raw = await storage.getItem(key);
    const parsed = parseStored(raw);
    if (raw && !parsed) await storage.removeItem(key);
    if (parsed || ownerId !== GUEST_WORKSPACE_ID || !legacyGuestKey) return parsed;

    const legacyRaw = await storage.getItem(legacyGuestKey);
    if (!legacyRaw) return null;
    try {
      const state = executionStateSchema.safeParse(JSON.parse(legacyRaw));
      if (!state.success) {
        await storage.removeItem(legacyGuestKey);
        return null;
      }
      const migrated = { revision: 1, value: state.data };
      await writeLocal(ownerId, migrated);
      await storage.removeItem(legacyGuestKey);
      return migrated;
    } catch {
      await storage.removeItem(legacyGuestKey);
      return null;
    }
  }

  async function readQueue(ownerId: WorkspaceOwnerId): Promise<StoredExecutionQueue> {
    const key = queueKey(ownerId);
    const raw = await storage.getItem(key);
    const queue = parseQueue(raw);
    if (raw && queue.commands.length === 0) await storage.removeItem(key);
    return queue;
  }

  async function writeQueue(
    ownerId: WorkspaceOwnerId,
    commands: ExecutionCommandRequest[],
  ): Promise<void> {
    if (commands.length === 0) {
      await storage.removeItem(queueKey(ownerId));
      return;
    }
    await storage.setItem(queueKey(ownerId), JSON.stringify({ commands, version: 1 }));
  }

  async function enqueue(userId: string, request: ExecutionCommandRequest): Promise<void> {
    const queue = await readQueue(userId);
    if (queue.commands.some((command) => command.idempotencyKey === request.idempotencyKey)) return;
    await writeQueue(userId, [...queue.commands, request]);
  }

  async function flushQueue(userId: string): Promise<ExecutionCommandResult | null> {
    let queue = await readQueue(userId);
    let lastResult: ExecutionCommandResult | null = null;
    while (queue.commands.length > 0) {
      const [request, ...remaining] = queue.commands;
      try {
        const result = await executeCloudCommand(userId, request);
        await writeLocal(userId, result);
        lastResult = result;
        await writeQueue(userId, remaining);
        queue = { commands: remaining, version: 1 };
      } catch (error) {
        if (!(error instanceof ExecutionRevisionConflictError)) throw error;
        const current = await cloud.load(userId);
        if (current) await writeLocal(userId, current);
        await writeQueue(userId, []);
        return current ? { ...current, result: 'conflict' } : null;
      }
    }
    return lastResult;
  }

  return {
    async claimGuestWorkspace() {
      await Promise.all([
        storage.removeItem(cacheKey(GUEST_WORKSPACE_ID)),
        storage.removeItem(queueKey(GUEST_WORKSPACE_ID)),
      ]);
      if (legacyGuestKey) await storage.removeItem(legacyGuestKey);
    },

    async clear(ownerId) {
      await Promise.all([
        storage.removeItem(cacheKey(ownerId)),
        storage.removeItem(queueKey(ownerId)),
      ]);
      if (ownerId === GUEST_WORKSPACE_ID && legacyGuestKey) {
        await storage.removeItem(legacyGuestKey);
      }
    },

    async execute(userId, request) {
      const pending = await readQueue(userId);
      if (pending.commands.length > 0) {
        try {
          const replayed = await flushQueue(userId);
          if (replayed) return replayed;
        } catch (error) {
          if (error instanceof ExecutionTransportError) {
            throw new ExecutionCommandQueuedError();
          }
          throw error;
        }
      }
      try {
        const result = await executeCloudCommand(userId, request);
        await writeLocal(userId, result);
        return result;
      } catch (error) {
        if (error instanceof ExecutionTransportError) {
          await enqueue(userId, request);
          throw new ExecutionCommandQueuedError();
        }
        if (!(error instanceof ExecutionRevisionConflictError)) throw error;
        const current = await cloud.load(userId);
        if (!current) throw error;
        await writeLocal(userId, current);
        return { ...current, result: 'conflict' };
      }
    },

    async load(ownerId) {
      const local = await readLocal(ownerId);
      if (ownerId === GUEST_WORKSPACE_ID) return local;
      try {
        await flushQueue(ownerId);
        const remote = await cloud.load(ownerId);
        if (!remote) {
          await storage.removeItem(cacheKey(ownerId));
          return null;
        }
        await writeLocal(ownerId, remote);
        return remote;
      } catch (error) {
        if (local) return local;
        throw error;
      }
    },

    async save(ownerId, state, expectedRevision) {
      const validated = executionStateSchema.parse(state);
      const current = await readLocal(ownerId);
      if ((current?.revision ?? 0) !== expectedRevision) {
        throw new ExecutionRevisionConflictError();
      }
      const saved = { revision: expectedRevision + 1, value: validated };
      await writeLocal(ownerId, saved);
      return saved;
    },
  };
}
