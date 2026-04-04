/**
 * AI Chat Proxy — forwards requests to Groq API.
 * Auto-retries on rate limit with delay, falls back to smaller model.
 */

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function callGroq(body: Record<string, unknown>, model: string, maxTokens: number): Promise<Response> {
  // Trim messages to reduce token usage — keep system + last 8 messages
  let messages = body.messages as any[];
  if (messages.length > 10) {
    const system = messages.find((m: any) => m.role === 'system');
    const recent = messages.filter((m: any) => m.role !== 'system').slice(-8);
    messages = system ? [system, ...recent] : recent;
  }

  return fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      tools: body.tools || undefined,
      tool_choice: body.tool_choice || undefined,
      temperature: body.temperature ?? 0.7,
      max_tokens: maxTokens,
    }),
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (!GROQ_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'GROQ_API_KEY not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await req.json();

    // Try primary model
    let response = await callGroq(body, 'llama-3.3-70b-versatile', body.max_tokens ?? 512);

    // Rate limited on 70b — wait briefly, try 8b
    if (response.status === 429) {
      console.log('Rate limited on 70b, waiting 2s then trying 8b...');
      await sleep(2000);
      response = await callGroq(body, 'llama-3.1-8b-instant', 400);
    }

    // Rate limited on 8b too — wait and retry once more
    if (response.status === 429) {
      const retryAfter = response.headers.get('retry-after');
      const waitMs = retryAfter ? Math.min(parseInt(retryAfter) * 1000, 10000) : 3000;
      console.log(`Rate limited on 8b too, waiting ${waitMs}ms...`);
      await sleep(waitMs);
      response = await callGroq(body, 'llama-3.1-8b-instant', 300);
    }

    if (!response.ok) {
      const errText = await response.text();
      console.error('Groq error:', errText);
      return new Response(
        JSON.stringify({ error: `Groq API error: ${response.status}`, detail: errText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Proxy error:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
