import { createClient } from '@supabase/supabase-js';

const MISSION_ENTITLEMENT = 'mission_kairo_pro';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SIGNATURE_TOLERANCE_SECONDS = 300;

type RevenueCatEvent = {
  aliases?: unknown;
  app_user_id?: unknown;
  entitlement_id?: unknown;
  entitlement_ids?: unknown;
  environment?: unknown;
  event_timestamp_ms?: unknown;
  expiration_at_ms?: unknown;
  grace_period_expiration_at_ms?: unknown;
  id?: unknown;
  original_app_user_id?: unknown;
  period_type?: unknown;
  product_id?: unknown;
  type?: unknown;
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    status,
  });
}

function hexBytes(value: string): Uint8Array | null {
  if (!/^[0-9a-f]+$/i.test(value) || value.length % 2 !== 0) return null;
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < value.length; index += 2) {
    bytes[index / 2] = Number.parseInt(value.slice(index, index + 2), 16);
  }
  return bytes;
}

async function validSignature(rawBody: string, header: string | null, secret: string) {
  const match = /^t=(\d+),v1=([0-9a-f]+)$/i.exec(header ?? '');
  if (!match) return false;
  const timestamp = Number(match[1]);
  const signature = hexBytes(match[2]);
  if (!Number.isSafeInteger(timestamp) || !signature) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - timestamp) > SIGNATURE_TOLERANCE_SECONDS) {
    return false;
  }

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { hash: 'SHA-256', name: 'HMAC' },
    false,
    ['verify'],
  );
  return crypto.subtle.verify(
    'HMAC',
    key,
    signature,
    new TextEncoder().encode(`${timestamp}.${rawBody}`),
  );
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function asMillis(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : null;
}

function isoFromMillis(value: unknown): string | null {
  const milliseconds = asMillis(value);
  return milliseconds ? new Date(milliseconds).toISOString() : null;
}

function resolveUserId(event: RevenueCatEvent): string | null {
  const aliases = Array.isArray(event.aliases) ? event.aliases : [];
  const candidates = [event.app_user_id, event.original_app_user_id, ...aliases];
  return (
    candidates.map(asString).find((candidate) => candidate && UUID_PATTERN.test(candidate)) ?? null
  );
}

function includesMissionEntitlement(event: RevenueCatEvent): boolean {
  const entitlementIds = Array.isArray(event.entitlement_ids)
    ? event.entitlement_ids.filter((value): value is string => typeof value === 'string')
    : [];
  const legacyEntitlement = asString(event.entitlement_id);
  return entitlementIds.includes(MISSION_ENTITLEMENT) || legacyEntitlement === MISSION_ENTITLEMENT;
}

function accessState(event: RevenueCatEvent): {
  expiresAt: string | null;
  status: 'trial' | 'active' | 'grace' | 'billing_issue' | 'expired';
  willRenew: boolean;
} | null {
  const type = asString(event.type);
  const standardExpiry = isoFromMillis(event.expiration_at_ms);
  const trial = event.period_type === 'TRIAL';

  if (type === 'EXPIRATION') {
    return { expiresAt: standardExpiry, status: 'expired', willRenew: false };
  }
  if (type === 'BILLING_ISSUE') {
    const graceExpiry = isoFromMillis(event.grace_period_expiration_at_ms);
    return {
      expiresAt: graceExpiry ?? standardExpiry,
      status: graceExpiry ? 'grace' : 'billing_issue',
      willRenew: true,
    };
  }
  if (type === 'CANCELLATION' || type === 'SUBSCRIPTION_PAUSED') {
    return { expiresAt: standardExpiry, status: trial ? 'trial' : 'active', willRenew: false };
  }
  if (
    type === 'INITIAL_PURCHASE' ||
    type === 'RENEWAL' ||
    type === 'UNCANCELLATION' ||
    type === 'PRODUCT_CHANGE' ||
    type === 'SUBSCRIPTION_EXTENDED' ||
    type === 'REFUND_REVERSED'
  ) {
    return { expiresAt: standardExpiry, status: trial ? 'trial' : 'active', willRenew: true };
  }
  return null;
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const authorizationSecret = Deno.env.get('REVENUECAT_WEBHOOK_AUTHORIZATION');
  const signingSecret = Deno.env.get('REVENUECAT_WEBHOOK_SIGNING_SECRET');
  const url = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!authorizationSecret || !signingSecret || !url || !serviceRoleKey) {
    return jsonResponse({ error: 'Server configuration unavailable' }, 500);
  }

  const rawBody = await request.text();
  const authorized = request.headers.get('Authorization') === authorizationSecret;
  const signatureValid = await validSignature(
    rawBody,
    request.headers.get('X-RevenueCat-Webhook-Signature'),
    signingSecret,
  );
  if (!authorized || !signatureValid) return jsonResponse({ error: 'Unauthorized' }, 401);

  let payload: { api_version?: unknown; event?: unknown };
  try {
    payload = JSON.parse(rawBody) as { api_version?: unknown; event?: unknown };
  } catch {
    return jsonResponse({ error: 'Invalid request body' }, 400);
  }
  if (payload.api_version !== '1.0' || !payload.event || typeof payload.event !== 'object') {
    return jsonResponse({ error: 'Unsupported webhook payload' }, 400);
  }

  const event = payload.event as RevenueCatEvent;
  if (event.type === 'TEST') return jsonResponse({ processed: false, reason: 'test event' });
  if (!includesMissionEntitlement(event)) {
    return jsonResponse({ processed: false, reason: 'unrelated entitlement' });
  }

  const eventId = asString(event.id);
  const eventType = asString(event.type);
  const eventAt = isoFromMillis(event.event_timestamp_ms);
  const userId = resolveUserId(event);
  const environment = asString(event.environment);
  const productId = asString(event.product_id);
  const access = accessState(event);
  if (
    !eventId ||
    !eventType ||
    !eventAt ||
    !userId ||
    !productId ||
    (environment !== 'SANDBOX' && environment !== 'PRODUCTION') ||
    !access
  ) {
    return jsonResponse({ error: 'Incomplete subscription event' }, 400);
  }

  const adminClient = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await adminClient.rpc('apply_revenuecat_entitlement_event', {
    p_entitlement_id: MISSION_ENTITLEMENT,
    p_environment: environment,
    p_event_at: eventAt,
    p_event_id: eventId,
    p_event_type: eventType,
    p_expires_at: access.expiresAt,
    p_product_id: productId,
    p_status: access.status,
    p_user_id: userId,
    p_will_renew: access.willRenew,
  });
  if (error) {
    console.error('apply_revenuecat_entitlement_event failed', {
      code: error.code,
      message: error.message,
    });
    return jsonResponse({ error: 'Subscription update failed' }, 500);
  }

  return jsonResponse({ processed: data === true });
});
