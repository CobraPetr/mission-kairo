import { type WinterArcPlan } from '@winter-arc/domain';

import { type ExecutionState } from '@/features/execution/execution-state';
import { type OnboardingDraft } from '@/features/onboarding/onboarding-schema';

import { type WorkspaceOwnerId } from './cache-scope';

export type Revisioned<Value> = {
  revision: number;
  value: Value;
};

export type PublicProfile = {
  displayName: string;
  username: string;
};

export type SubscriptionEntitlement = {
  expiresAt: string | null;
  isActive: boolean;
  productId: string | null;
  state: 'inactive' | 'trial' | 'active' | 'grace' | 'billingIssue' | 'expired';
};

export interface OnboardingRepository {
  claimGuestWorkspace(userId: string): Promise<void>;
  clear(ownerId: WorkspaceOwnerId): Promise<void>;
  load(ownerId: WorkspaceOwnerId): Promise<Revisioned<OnboardingDraft> | null>;
  save(
    ownerId: WorkspaceOwnerId,
    draft: OnboardingDraft,
    expectedRevision: number,
  ): Promise<Revisioned<OnboardingDraft>>;
}

export interface ProfileRepository {
  load(userId: string): Promise<PublicProfile | null>;
  save(userId: string, profile: PublicProfile): Promise<PublicProfile>;
}

export interface PlanRepository {
  claimGuestWorkspace(userId: string): Promise<void>;
  clear(ownerId: WorkspaceOwnerId): Promise<void>;
  load(ownerId: WorkspaceOwnerId): Promise<WinterArcPlan | null>;
  save(ownerId: WorkspaceOwnerId, plan: WinterArcPlan): Promise<void>;
}

export interface ExecutionRepository {
  claimGuestWorkspace(userId: string): Promise<void>;
  clear(ownerId: WorkspaceOwnerId): Promise<void>;
  execute(
    userId: string,
    command: 'begin' | 'pause' | 'resume' | 'advance' | 'skip' | 'close_day',
    scheduledKey: string | null,
    expectedRevision: number,
  ): Promise<{
    result: 'active' | 'paused' | 'advanced' | 'completed' | 'skipped' | 'day_closed' | 'conflict';
    revision: number;
    value: ExecutionState;
  }>;
  load(ownerId: WorkspaceOwnerId): Promise<Revisioned<ExecutionState> | null>;
  save(
    ownerId: WorkspaceOwnerId,
    state: ExecutionState,
    expectedRevision: number,
  ): Promise<Revisioned<ExecutionState>>;
}

export interface SubscriptionRepository {
  load(userId: string): Promise<SubscriptionEntitlement>;
  restore(userId: string): Promise<SubscriptionEntitlement>;
}
