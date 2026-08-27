import {
  type PlanAssessment,
  protocolActivationRequestSchema,
  protocolActivationResponseSchema,
} from '@winter-arc/domain';

import { requireSupabase } from '@/data/supabase/client';
import { type Json } from '@/data/supabase/database.types';
import { type OnboardingDraft } from '@/features/onboarding/onboarding-schema';

import { resolveDeviceTimeZone } from './device-time-zone';

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
  draft: OnboardingDraft,
  assessment: PlanAssessment,
): Promise<ProtocolActivation> {
  const acceptedAt = draft.consent.confirmedAt;
  if (!acceptedAt) throw new Error('Onboarding consent must be confirmed before activation.');

  const isMinor = (draft.identity.age ?? 18) < 18;
  if (isMinor) {
    throw new Error('Verified guardian approval required before protocol activation.');
  }

  const request = protocolActivationRequestSchema.parse({
    answers: asJson(draft),
    assessment: asJson(assessment),
    schemaVersion: draft.version,
    termsAcceptedAt: acceptedAt,
    termsVersion: TERMS_VERSION,
    timeZone: resolveDeviceTimeZone(),
    username: draft.identity.username,
  });
  const { data, error } = await requireSupabase().functions.invoke('activate-protocol', {
    body: request,
  });

  if (error) throw error;

  return protocolActivationResponseSchema.parse(data);
}
