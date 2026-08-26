import { type PlanAssessment } from '@winter-arc/domain';

import { requireSupabase } from '@/data/supabase/client';
import { type Json } from '@/data/supabase/database.types';
import { type OnboardingDraft } from '@/features/onboarding/onboarding-schema';

const TERMS_VERSION = '2026-08-21';

export type ProtocolActivation = {
  executionRevision: number;
  planId: string;
  planKey: string;
};

function asJson(value: OnboardingDraft | PlanAssessment): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

export async function activateProtocol(
  userId: string,
  draft: OnboardingDraft,
  assessment: PlanAssessment,
): Promise<ProtocolActivation> {
  const acceptedAt = draft.consent.confirmedAt;
  if (!acceptedAt) throw new Error('Onboarding consent must be confirmed before activation.');

  const isMinor = (draft.identity.age ?? 18) < 18;
  if (isMinor) {
    throw new Error('Verified guardian approval required before protocol activation.');
  }

  const { data, error } = await requireSupabase().rpc('activate_protocol', {
    p_activation_key: userId,
    p_answers: asJson(draft),
    p_assessment: asJson(assessment),
    p_schema_version: draft.version,
    p_terms_accepted_at: acceptedAt,
    p_terms_version: TERMS_VERSION,
    p_username: draft.identity.username,
  });

  if (error?.code === '23505') {
    throw new Error('That username is unavailable. Return to identity and choose another.');
  }
  if (error) throw error;

  const activated = data?.[0];
  if (!activated) throw new Error('The protocol could not be activated.');

  return {
    executionRevision: activated.execution_revision,
    planId: activated.activated_plan_id,
    planKey: activated.activated_plan_key,
  };
}
