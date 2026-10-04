-- Migration 0001: bootstrap cchz2 database
-- Progress & learning state
CREATE TABLE IF NOT EXISTS progress (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Vault (word storage)
CREATE TABLE IF NOT EXISTS vault (
  id TEXT PRIMARY KEY,           -- UUID
  added_at TEXT NOT NULL,        -- YYYY-MM-DD
  updated_at TEXT NOT NULL,
  hanzi TEXT NOT NULL,
  pinyin TEXT,
  meaning TEXT,                  -- VN meaning
  example_han TEXT,              -- example sentence CN
  example_py TEXT,
  example_vn TEXT,
  related TEXT,                  -- JSON array: [{hanzi,pinyin,meaning}]
  confusion TEXT,                -- JSON array: [{hanzi,pinyin,meaning,explain,example_han,example_vn}]
  note TEXT,
  image_id TEXT,                 -- R2 object key
  learned INTEGER NOT NULL DEFAULT 0,  -- 0/1
  ai_fields TEXT,                -- comma-separated fields that AI generated
  session_tag TEXT,
  tags TEXT                      -- comma-separated
);

CREATE INDEX IF NOT EXISTS idx_vault_added_at ON vault(added_at);
CREATE INDEX IF NOT EXISTS idx_vault_session ON vault(session_tag);
CREATE INDEX IF NOT EXISTS idx_vault_learned ON vault(learned);
CREATE INDEX IF NOT EXISTS idx_vault_hanzi ON vault(hanzi);
