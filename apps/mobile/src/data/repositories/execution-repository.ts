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

type ExecutionRepositoryDependencies = {
  cacheKey(ownerId: WorkspaceOwnerId): string;
  cloud: ExecutionCloudGateway;
  legacyGuestKey?: string;
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

export function createExecutionRepository({
  cacheKey,
  cloud,
  legacyGuestKey,
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

  return {
    async claimGuestWorkspace() {
      await storage.removeItem(cacheKey(GUEST_WORKSPACE_ID));
      if (legacyGuestKey) await storage.removeItem(legacyGuestKey);
    },

    async clear(ownerId) {
      await storage.removeItem(cacheKey(ownerId));
      if (ownerId === GUEST_WORKSPACE_ID && legacyGuestKey) {
        await storage.removeItem(legacyGuestKey);
      }
    },

    async execute(userId, request) {
      try {
        const result = await executeCloudCommand(userId, request);
        await writeLocal(userId, result);
        return result;
      } catch (error) {
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
