import { createClient } from '@supabase/supabase-js';

import {
  generateWinterArcPlan,
  protocolActivationRequestSchema,
} from '../../../packages/domain/src/index.ts';
import { corsHeaders } from '../_shared/cors.ts';

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });
}

function publicDatabaseError(message: string): string {
  const allowed = [
    'Invalid plan manifest',
    'Minimum activation age is 14',
    'That username is unavailable',
    'Verified email required',
    'Verified guardian approval required',
  ];
  return (
    allowed.find((candidate) => message.toLowerCase().includes(candidate.toLowerCase())) ??
    'Protocol activation failed'
  );
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const authorization = request.headers.get('Authorization');
  if (!authorization) return jsonResponse({ error: 'Unauthorized' }, 401);

  const url = Deno.env.get('SUPABASE_URL');
  const publishableKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !publishableKey || !serviceRoleKey) {
    return jsonResponse({ error: 'Server configuration unavailable' }, 500);
  }

  let requestBody: unknown;
  try {
    requestBody = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid request body' }, 400);
  }

  const parsed = protocolActivationRequestSchema.safeParse(requestBody);
  if (!parsed.success) return jsonResponse({ error: 'Invalid activation request' }, 400);

  const userClient = createClient(url, publishableKey, {
    global: { headers: { Authorization: authorization } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return jsonResponse({ error: 'Unauthorized' }, 401);
  if (!userData.user.email_confirmed_at) {
    return jsonResponse({ error: 'Verified email required' }, 403);
  }

  if (parsed.data.assessment.age < 18) {
    return jsonResponse({ error: 'Verified guardian approval required' }, 403);
  }

  const plan = generateWinterArcPlan(parsed.data.assessment);
  const adminClient = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await adminClient.rpc('activate_generated_protocol', {
    p_activation_key: userData.user.id,
    p_answers: parsed.data.answers,
    p_assessment: parsed.data.assessment,
    p_plan: plan,
    p_schema_version: parsed.data.schemaVersion,
    p_terms_accepted_at: parsed.data.termsAcceptedAt,
    p_terms_version: parsed.data.termsVersion,
    p_user_id: userData.user.id,
    p_username: parsed.data.username,
  });

  if (error) {
    const message = publicDatabaseError(error.message);
    return jsonResponse({ error: message }, error.code === '23505' ? 409 : 400);
  }

  const activated = data?.[0];
  if (!activated) return jsonResponse({ error: 'Protocol activation failed' }, 500);

  return jsonResponse(
    {
      executionRevision: activated.execution_revision,
      planId: activated.activated_plan_id,
      planKey: activated.activated_plan_key,
    },
    200,
  );
});
