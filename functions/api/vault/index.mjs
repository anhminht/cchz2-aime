// GET  /api/vault            → list vault items (optionally ?since=YYYY-MM-DD&learned=0|1&session=&q=)
// POST /api/vault            → upsert a vault row
// POST /api/vault/:id/image  → presign R2 upload URL (Phase 4)

function rowToVault(r) {
  return {
    id: r.id,
    addedAt: r.added_at,
    updatedAt: r.updated_at,
    hanzi: r.hanzi,
    pinyin: r.pinyin,
    meaning: r.meaning,
    exampleHan: r.example_han,
    examplePy: r.example_py,
    exampleVn: r.example_vn,
    related: safeJSON(r.related) || [],
    confusion: safeJSON(r.confusion) || [],
    note: r.note,
    imageId: r.image_id,
    learned: !!r.learned,
    aiFields: (r.ai_fields || '').split(',').filter(Boolean),
    session: r.session_tag,
    tags: (r.tags || '').split(',').filter(Boolean)
  };
}

function safeJSON(s) {
  if (!s) return null;
  try { return JSON.parse(s); } catch (_) { return null; }
}

export async function onRequestGet(ctx) {
  const { DB } = ctx.env;
  const url = new URL(ctx.request.url);
  let sql = 'SELECT * FROM vault';
  const where = [];
  const args = [];
  const since = url.searchParams.get('since');
  if (since) { where.push('updated_at >= ?'); args.push(since); }
  const learned = url.searchParams.get('learned');
  if (learned === '0' || learned === '1') { where.push('learned = ?'); args.push(+learned); }
  const session = url.searchParams.get('session');
  if (session) { where.push('session_tag = ?'); args.push(session); }
  const q = url.searchParams.get('q');
  if (q) { where.push('(hanzi LIKE ? OR meaning LIKE ? OR pinyin LIKE ?)'); args.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY added_at ASC, rowid ASC';
  const { results } = await DB.prepare(sql).bind(...args).all();
  return Response.json({ items: results.map(rowToVault) });
}

export async function onRequestPost(ctx) {
  const body = await ctx.request.json().catch(() => null);
  if (!body || !body.hanzi) return Response.json({ ok: false, error: 'hanzi required' }, { status: 400 });
  const { DB } = ctx.env;
  const id = body.id || crypto.randomUUID();
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date().toISOString().slice(0, 10);
  await DB.prepare(`
    INSERT INTO vault (id, added_at, updated_at, hanzi, pinyin, meaning, example_han, example_py, example_vn,
                       related, confusion, note, image_id, learned, ai_fields, session_tag, tags)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      updated_at=excluded.updated_at,
      hanzi=excluded.hanzi, pinyin=excluded.pinyin, meaning=excluded.meaning,
      example_han=excluded.example_han, example_py=excluded.example_py, example_vn=excluded.example_vn,
      related=excluded.related, confusion=excluded.confusion, note=excluded.note,
      image_id=excluded.image_id, learned=excluded.learned, ai_fields=excluded.ai_fields,
      session_tag=excluded.session_tag, tags=excluded.tags
  `).bind(
    id,
    body.addedAt || today,
    now,
    body.hanzi,
    body.pinyin || '',
    body.meaning || '',
    body.exampleHan || '',
    body.examplePy || '',
    body.exampleVn || '',
    JSON.stringify(body.related || []),
    JSON.stringify(body.confusion || []),
    body.note || '',
    body.imageId || '',
    body.learned ? 1 : 0,
    (body.aiFields || []).join(','),
    body.session || '',
    (body.tags || []).join(',')
  ).run();
  const row = await DB.prepare('SELECT * FROM vault WHERE id = ?').bind(id).first();
  return Response.json({ ok: true, item: rowToVault(row) });
}
