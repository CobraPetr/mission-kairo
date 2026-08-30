import { securePrivateStorage } from '@/data/storage/secure-private-storage';

import { buildScopedCacheKey } from './cache-scope';
import { createExecutionRepository } from './execution-repository';
import { createOnboardingRepository } from './onboarding-repository';
import { createPlanRepository } from './plan-repository';
import { supabaseOnboardingGateway } from './supabase-onboarding-gateway';
import { supabaseExecutionGateway } from './supabase-execution-gateway';
import { supabasePlanGateway } from './supabase-plan-gateway';

export const onboardingRepository = createOnboardingRepository({
  cacheKey: (ownerId) => buildScopedCacheKey(ownerId, 'onboarding', 3),
  cloud: supabaseOnboardingGateway,
  legacyGuestKey: 'winterarc.onboarding.v2',
  storage: securePrivateStorage,
});

export const planRepository = createPlanRepository({
  cacheKey: (ownerId) => buildScopedCacheKey(ownerId, 'plan', 2),
  cloud: supabasePlanGateway,
  legacyGuestKey: 'winterarc.plan.v1',
  storage: securePrivateStorage,
});

export const executionRepository = createExecutionRepository({
  cacheKey: (ownerId) => buildScopedCacheKey(ownerId, 'execution', 2),
  cloud: supabaseExecutionGateway,
  legacyGuestKey: 'winterarc.execution.v1',
  queueKey: (ownerId) => `${buildScopedCacheKey(ownerId, 'execution', 2)}:commands:v1`,
  storage: securePrivateStorage,
});
