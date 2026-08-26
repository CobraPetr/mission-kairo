import { type WinterArcPlan, winterArcPlanSchema } from '@winter-arc/domain';

import { GUEST_WORKSPACE_ID, type WorkspaceOwnerId } from './cache-scope';
import { type PlanRecord, type PlanRepository } from './contracts';
import { type KeyValueStorage } from './onboarding-repository';

export type PlanCloudGateway = {
  load(userId: string): Promise<WinterArcPlan | null>;
};

type PlanRepositoryDependencies = {
  cacheKey(ownerId: WorkspaceOwnerId): string;
  cloud: PlanCloudGateway;
  legacyGuestKey?: string;
  storage: KeyValueStorage;
};

function serializePlan(record: PlanRecord): string {
  return JSON.stringify(record);
}

function parsePlan(value: string | null): PlanRecord | null {
  if (!value) return null;
  try {
    const candidate: unknown = JSON.parse(value);
    if (candidate && typeof candidate === 'object' && 'plan' in candidate) {
      const record = candidate as Record<string, unknown>;
      const plan = winterArcPlanSchema.safeParse(record.plan);
      if (plan.success && typeof record.canonical === 'boolean') {
        return { canonical: record.canonical, plan: plan.data };
      }
      return null;
    }

    const legacy = winterArcPlanSchema.safeParse(candidate);
    return legacy.success ? { canonical: false, plan: legacy.data } : null;
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
  async function writeLocal(ownerId: WorkspaceOwnerId, record: PlanRecord): Promise<void> {
    await storage.setItem(cacheKey(ownerId), serializePlan(record));
  }

  async function readLocal(ownerId: WorkspaceOwnerId): Promise<PlanRecord | null> {
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

    const migrated = { canonical: false, plan: legacy.plan };
    await writeLocal(ownerId, migrated);
    await storage.removeItem(legacyGuestKey);
    return migrated;
  }

  return {
    async claimGuestWorkspace(userId) {
      const remote = await cloud.load(userId);
      if (remote) await writeLocal(userId, { canonical: true, plan: remote });
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
        const canonical = { canonical: true, plan: remote };
        await writeLocal(ownerId, canonical);
        return canonical;
      } catch (error) {
        if (local?.canonical) return local;
        throw error;
      }
    },

    async save(ownerId, plan) {
      const validated = winterArcPlanSchema.parse(plan);
      await writeLocal(ownerId, { canonical: false, plan: validated });
    },
  };
}
