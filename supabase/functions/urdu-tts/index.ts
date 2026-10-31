const UPLIFT_URL = 'https://api.upliftai.org/v1/synthesis/text-to-speech';

Deno.serve(async (request) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  const apiKey = Deno.env.get('UPLIFT_API_KEY');
  if (!apiKey) {
    return new Response('UPLIFT_API_KEY is not configured', { status: 500, headers: corsHeaders });
  }

  let input: { text?: unknown; voiceId?: unknown; outputFormat?: unknown };
  try {
    input = await request.json();
  } catch {
    return new Response('Invalid JSON', { status: 400, headers: corsHeaders });
  }

  const text = typeof input.text === 'string' ? input.text.trim() : '';
  if (!text || text.length > 5000) {
    return new Response('Text must be between 1 and 5000 characters', { status: 400, headers: corsHeaders });
  }

  const upstream = await fetch(UPLIFT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      voiceId: 'street-vendor',
      text,
      outputFormat: 'MP3_22050_128'
    })
  });

  if (!upstream.ok) {
    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: { ...corsHeaders, 'Content-Type': upstream.headers.get('content-type') || 'text/plain' }
    });
  }

  return new Response(upstream.body, {
    headers: {
      ...corsHeaders,
      'Content-Type': upstream.headers.get('content-type') || 'audio/mpeg',
      'Cache-Control': 'no-store'
    }
  });
});
