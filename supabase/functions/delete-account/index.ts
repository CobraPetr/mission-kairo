import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Origin': '*',
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const authorization = request.headers.get('Authorization');
  if (!authorization) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 401,
    });
  }

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anonKey || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Server configuration unavailable' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }

  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
  });
  const { data, error: userError } = await userClient.auth.getUser();
  if (userError || !data.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 401,
    });
  }

  const adminClient = createClient(url, serviceRoleKey);
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(data.user.id);
  if (deleteError) {
    return new Response(JSON.stringify({ error: 'Deletion failed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }

  return new Response(null, { headers: corsHeaders, status: 204 });
});
