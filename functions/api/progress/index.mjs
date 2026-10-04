// GET  /api/progress   → { currentSession, cardIndex, lastOpen }
// POST /api/progress   → upsert arbitrary key/value pairs (e.g. { lastOpen, cardIndex, currentSession })

function toMap(rows) {
  const map = {};
  for (const r of rows) {
    try { map[r.key] = JSON.parse(r.value_text); } catch (_) { map[r.key] = r.value_text; }
  }
  return map;
}

export async function onRequestGet(ctx) {
  const { DB } = ctx.env;
  const { results } = await DB.prepare('SELECT key, value_text FROM progress').all();
  const map = toMap(results);
  return Response.json({
    currentSession: map.currentSession || '',
    cardIndex: +(map.cardIndex || 0),
    lastOpen: +(map.lastOpen || 0) || null
  });
}

export async function onRequestPost(ctx) {
  const body = await ctx.request.json().catch(() => ({}));
  const { DB } = ctx.env;
  const now = Date.now();
  const stmt = DB.prepare(
    'INSERT INTO progress (key, value_text, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value_text = excluded.value_text, updated_at = excluded.updated_at'
  );
  const batches = [];
  for (const [k, v] of Object.entries(body)) {
    batches.push(stmt.bind(k, JSON.stringify(v), now));
  }
  if (!batches.length) return Response.json({ ok: false, error: 'no fields' }, { status: 400 });
  await DB.batch(batches);
  return Response.json({ ok: true });
}
