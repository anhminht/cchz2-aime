// Placeholder AI proxy — implemented in Pha 5.
// Accepts POST /api/ai with { mode: 'suggest' | 'fill', hanzi, contextSentence?, target?: 'meaning'|'example'|'related'|'confusion'|'all' }
// Returns structured JSON. Uses env.AI_API_KEY (Cloudflare secret) and calls an OpenAI-compatible endpoint.

export async function onRequestPost(ctx) {
  const body = await ctx.request.json().catch(() => ({}));
  return new Response(
    JSON.stringify({
      ok: false,
      code: 'NOT_IMPLEMENTED',
      message: 'AI endpoint coming in Phase 5. For now v2 skeleton ships with UI only.'
    }),
    { status: 501, headers: { 'content-type': 'application/json' } }
  );
}
