# CeceHanzi v2 — cchz2-aime

PWA học Hán tự cá nhân, deploy trên Cloudflare Workers (static + D1 + R2 + Functions).
Online-first, không localStorage/cookie, D1 là database runtime duy nhất.

- **Repo**: https://github.com/anhminht/cchz2-aime
- **Production (v1, giữ nguyên)**: https://cecehanzi.anhminht-aten.workers.dev (repo `anhminht/cecehanzi`)
- **V2 beta** (sau deploy đầu tiên): `https://cchz2-aime.<account>.workers.dev`

## Kiến trúc (đã chốt)

- **Client**: static `index.html` + `app.js` + Tailwind CDN + Be Vietnam Pro / Noto Sans SC. Bottom nav mẫu A (mờ nhẹ + vạch trắng trên active).
- **Static assets (R2/Workers Assets)**:
  - `data/hanzi.json` — danh sách thẻ Hán, build từ Sheet Vocabulary bằng Aime lúc `update app`.
  - `images/<HEX>.png` — ảnh thẻ Hán, tên theo codepoint HEX để tránh lỗi CF với Unicode.
  - `vault-images/<UUID>.<ext>` — ảnh nguồn Kho từ trên R2.
  - `icons/`, `manifest.webmanifest`, font fallback.
- **D1 (SQLite)**:
  - `progress(key, value_text, updated_at)` — last-open timestamp, cardIndex, currentSession, learnedMap (từng thẻ).
  - `vault(id, added_at, updated_at, hanzi, pinyin, meaning, example_*, related, confusion, note, image_id, learned, ai_fields, session_tag, tags)`.
- **Workers Functions** (`functions/api/*`):
  - `GET/POST /api/progress` — đọc/ghi tiến độ.
  - `GET/POST /api/vault` — list + upsert từ kho.
  - `POST /api/ai` — proxy AI (key trong Cloudflare Secret).
- **Bảo mật**: Cloudflare Access khoá toàn bộ worker theo email `am.tran@bytedance.com` (bắt buộc — tránh burn tiền AI).
- **Không dùng**: localStorage, cookie, Sheet runtime, Sheet Vault. Sheet Vocabulary chỉ dùng build-time.

## Local dev

```bash
npm install
# Một lần đầu: tạo D1 database
npx wrangler d1 create cchz2-db
# Copy database_id vào wrangler.jsonc, rồi apply migration
npx wrangler d1 execute cchz2-db --local --file migrations/0001_init.sql
# Chạy local
npm run dev
```

## Build & deploy

```bash
npm run build           # build data/hanzi.json (bootstrap: [])
npm run preflight       # invariants check
npm run deploy          # hoặc: push main → GitHub Actions tự deploy
```

## Secrets cần trên Cloudflare / GitHub Actions

- `CLOUDFLARE_API_TOKEN` (GitHub Actions)
- `CLOUDFLARE_ACCOUNT_ID` (GitHub Actions)
- `AI_API_KEY` (Cloudflare Secret, dùng cho /api/ai)

## Pha phát triển

0. ✅ Scaffold + design tokens + bottom nav mẫu A + Home
1. ⏳ Đẩy lên GitHub, bật Cloudflare Access, init D1/R2, API health
2. Thẻ học (Card/Grid/Pinyin, filter, nhớ-rồi/chưa-nhớ)
3. Bộ thủ restyle
4. Kho từ CRUD + ảnh R2
5. AI thật (/api/ai)
6. Polish + beta test iPhone, trỏ production URL khi ổn định
