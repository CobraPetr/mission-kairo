import { type WinterArcPlan, winterArcPlanSchema } from '@winter-arc/domain';

import { GUEST_WORKSPACE_ID, type WorkspaceOwnerId } from './cache-scope';
import { type KeyValueStorage } from './onboarding-repository';
import { type PlanRepository } from './contracts';

export type PlanCloudGateway = {
  load(userId: string): Promise<WinterArcPlan | null>;
};

type PlanRepositoryDependencies = {
  cacheKey(ownerId: WorkspaceOwnerId): string;
  cloud: PlanCloudGateway;
  legacyGuestKey?: string;
  storage: KeyValueStorage;
};

function parsePlan(value: string | null): WinterArcPlan | null {
  if (!value) return null;
  try {
    const result = winterArcPlanSchema.safeParse(JSON.parse(value));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function createPlanRepository({
  cacheKey,
  cloud,
  legacyGuestKey,
  storage,
}: PlanRepositoryDependencies): PlanRepository {
  async function readLocal(ownerId: WorkspaceOwnerId): Promise<WinterArcPlan | null> {
    const key = cacheKey(ownerId);
    const raw = await storage.getItem(key);
    const parsed = parsePlan(raw);
    if (raw && !parsed) await storage.removeItem(key);

    if (parsed || ownerId !== GUEST_WORKSPACE_ID || !legacyGuestKey) return parsed;

    const legacyRaw = await storage.getItem(legacyGuestKey);
    const legacy = parsePlan(legacyRaw);
    if (!legacy) {
      if (legacyRaw) await storage.removeItem(legacyGuestKey);
      return null;
    }

    await storage.setItem(key, JSON.stringify(legacy));
    await storage.removeItem(legacyGuestKey);
    return legacy;
  }

  return {
    async claimGuestWorkspace(userId) {
      const remote = await cloud.load(userId);
      if (remote) await storage.setItem(cacheKey(userId), JSON.stringify(remote));
      await storage.removeItem(cacheKey(GUEST_WORKSPACE_ID));
      if (legacyGuestKey) await storage.removeItem(legacyGuestKey);
    },

    async clear(ownerId) {
      await storage.removeItem(cacheKey(ownerId));
      if (ownerId === GUEST_WORKSPACE_ID && legacyGuestKey) {
        await storage.removeItem(legacyGuestKey);
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
        await storage.setItem(cacheKey(ownerId), JSON.stringify(remote));
        return remote;
      } catch {
        return local;
      }
    },

    async save(ownerId, plan) {
      const validated = winterArcPlanSchema.parse(plan);
      await storage.setItem(cacheKey(ownerId), JSON.stringify(validated));
    },
  };
}
