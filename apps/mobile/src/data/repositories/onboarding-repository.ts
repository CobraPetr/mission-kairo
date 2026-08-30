import {
  type OnboardingDraft,
  onboardingDraftSchema,
} from '../../features/onboarding/onboarding-schema';

import { GUEST_WORKSPACE_ID, type WorkspaceOwnerId } from './cache-scope';
import { type OnboardingRepository, type Revisioned } from './contracts';

export type KeyValueStorage = {
  getItem(key: string): Promise<string | null>;
  removeItem(key: string): Promise<void>;
  setItem(key: string, value: string): Promise<void>;
};

export type OnboardingCloudGateway = {
  load(userId: string): Promise<Revisioned<OnboardingDraft> | null>;
  save(
    userId: string,
    draft: OnboardingDraft,
    expectedRevision: number,
  ): Promise<Revisioned<OnboardingDraft>>;
};

type StoredDraft = Revisioned<OnboardingDraft> & {
  pendingSync: boolean;
};

type OnboardingRepositoryDependencies = {
  cacheKey(ownerId: WorkspaceOwnerId): string;
  cloud: OnboardingCloudGateway;
  legacyGuestKey?: string;
  storage: KeyValueStorage;
};

export class OnboardingRevisionConflictError extends Error {
  constructor() {
    super('The onboarding draft changed on another device.');
    this.name = 'OnboardingRevisionConflictError';
  }
}

function parseStoredDraft(value: string | null): StoredDraft | null {
  if (!value) return null;

  try {
    const candidate: unknown = JSON.parse(value);
    if (!candidate || typeof candidate !== 'object') return null;

    const record = candidate as Record<string, unknown>;
    const draft = onboardingDraftSchema.safeParse(record.value);
    if (
      !draft.success ||
      !Number.isSafeInteger(record.revision) ||
      (record.revision as number) < 0 ||
      typeof record.pendingSync !== 'boolean'
    ) {
      return null;
    }

    return {
      pendingSync: record.pendingSync,
      revision: record.revision as number,
      value: draft.data,
    };
  } catch {
    return null;
  }
}

function toRevisioned(stored: StoredDraft): Revisioned<OnboardingDraft> {
  return { revision: stored.revision, value: stored.value };
}

function isNewer(left: OnboardingDraft, right: OnboardingDraft): boolean {
  return Date.parse(left.updatedAt) > Date.parse(right.updatedAt);
}

export function createOnboardingRepository({
  cacheKey,
  cloud,
  legacyGuestKey,
  storage,
}: OnboardingRepositoryDependencies): OnboardingRepository {
  async function readLocal(ownerId: WorkspaceOwnerId): Promise<StoredDraft | null> {
    const key = cacheKey(ownerId);
    const stored = await storage.getItem(key);
    const parsed = parseStoredDraft(stored);

    if (stored && !parsed) {
      await storage.removeItem(key);
    }

    if (parsed || ownerId !== GUEST_WORKSPACE_ID || !legacyGuestKey) {
      return parsed;
    }

    const legacy = await storage.getItem(legacyGuestKey);
    if (!legacy) return null;

    try {
      const draft = onboardingDraftSchema.safeParse(JSON.parse(legacy));
      if (!draft.success) {
        await storage.removeItem(legacyGuestKey);
        return null;
      }

      const migrated: StoredDraft = {
        pendingSync: false,
        revision: 1,
        value: draft.data,
      };
      await writeLocal(ownerId, migrated);
      await storage.removeItem(legacyGuestKey);
      return migrated;
    } catch {
      await storage.removeItem(legacyGuestKey);
      return null;
    }
  }

  async function writeLocal(ownerId: WorkspaceOwnerId, draft: StoredDraft): Promise<void> {
    await storage.setItem(cacheKey(ownerId), JSON.stringify(draft));
  }

  async function writeCloud(
    userId: string,
    draft: OnboardingDraft,
    expectedRevision: number,
  ): Promise<Revisioned<OnboardingDraft>> {
    try {
      return await cloud.save(userId, draft, expectedRevision);
    } catch (error) {
      if (!(error instanceof OnboardingRevisionConflictError)) throw error;

      const current = await cloud.load(userId);
      if (current?.value.updatedAt === draft.updatedAt) return current;

      return cloud.save(userId, draft, current?.revision ?? 0);
    }
  }

  return {
    async claimGuestWorkspace(userId) {
      const guest = await readLocal(GUEST_WORKSPACE_ID);
      if (!guest) return;

      const remote = await cloud.load(userId);
      if (remote) {
        await writeLocal(userId, { ...remote, pendingSync: false });
        await storage.removeItem(cacheKey(GUEST_WORKSPACE_ID));
        return;
      }

      const claimed = await writeCloud(userId, guest.value, 0);
      await writeLocal(userId, { ...claimed, pendingSync: false });
      await storage.removeItem(cacheKey(GUEST_WORKSPACE_ID));
    },

    async clear(ownerId) {
      await storage.removeItem(cacheKey(ownerId));
      if (ownerId === GUEST_WORKSPACE_ID && legacyGuestKey) {
        await storage.removeItem(legacyGuestKey);
      }
    },

    async load(ownerId) {
      const local = await readLocal(ownerId);
      if (ownerId === GUEST_WORKSPACE_ID) {
        return local ? toRevisioned(local) : null;
      }

      try {
        const remote = await cloud.load(ownerId);
        if (!local?.pendingSync) {
          if (!remote) {
            await storage.removeItem(cacheKey(ownerId));
            return null;
          }

          await writeLocal(ownerId, { ...remote, pendingSync: false });
          return remote;
        }

        if (remote && !isNewer(local.value, remote.value)) {
          await writeLocal(ownerId, { ...remote, pendingSync: false });
          return remote;
        }

        const synced = await writeCloud(ownerId, local.value, remote?.revision ?? 0);
        await writeLocal(ownerId, { ...synced, pendingSync: false });
        return synced;
      } catch (error) {
        if (local) return toRevisioned(local);
        throw error;
      }
    },

    async save(ownerId, draft, expectedRevision) {
      const validated = onboardingDraftSchema.parse(draft);

      if (ownerId === GUEST_WORKSPACE_ID) {
        const current = await readLocal(ownerId);
        if ((current?.revision ?? 0) !== expectedRevision) {
          throw new OnboardingRevisionConflictError();
        }

        const saved = { revision: expectedRevision + 1, value: validated };
        await writeLocal(ownerId, { ...saved, pendingSync: false });
        return saved;
      }

      try {
        const saved = await writeCloud(ownerId, validated, expectedRevision);
        await writeLocal(ownerId, { ...saved, pendingSync: false });
        return saved;
      } catch (error) {
        if (error instanceof OnboardingRevisionConflictError) throw error;

        const pending = { revision: expectedRevision, value: validated };
        await writeLocal(ownerId, { ...pending, pendingSync: true });
        return pending;
      }
    },
  };
}
