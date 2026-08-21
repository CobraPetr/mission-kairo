import { type Json } from '@/data/supabase/database.types';
import { requireSupabase } from '@/data/supabase/client';
import {
  type OnboardingDraft,
  onboardingDraftSchema,
} from '@/features/onboarding/onboarding-schema';

import {
  type OnboardingCloudGateway,
  OnboardingRevisionConflictError,
} from './onboarding-repository';

function asJson(draft: OnboardingDraft): Json {
  return JSON.parse(JSON.stringify(draft)) as Json;
}

function parseRow(row: { payload: Json; revision: number; user_id: string }): {
  revision: number;
  value: OnboardingDraft;
} {
  return {
    revision: row.revision,
    value: onboardingDraftSchema.parse(row.payload),
  };
}

export const supabaseOnboardingGateway: OnboardingCloudGateway = {
  async load(userId) {
    const { data, error } = await requireSupabase()
      .from('onboarding_drafts')
      .select('user_id, revision, payload')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;
    if (data.user_id !== userId) throw new Error('Received an onboarding draft for another user.');
    return parseRow(data);
  },

  async save(userId, draft, expectedRevision) {
    const { data, error } = await requireSupabase().rpc('save_onboarding_draft', {
      p_client_updated_at: draft.updatedAt,
      p_expected_revision: expectedRevision,
      p_payload: asJson(draft),
      p_schema_version: draft.version,
      p_section: draft.section,
    });

    if (error?.code === '40001') throw new OnboardingRevisionConflictError();
    if (error) throw error;
    if (!data) throw new Error('The onboarding draft was not saved.');
    if (data.user_id !== userId) throw new Error('Saved an onboarding draft for another user.');
    return parseRow(data);
  },
};
