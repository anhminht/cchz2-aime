#!/usr/bin/env python3
"""Build data/hanzi.json from Lark Sheet "Vocabulary".

Phase 1 bootstrap: writes an empty [] so static hosting works out of the box.
Full implementation will:
  1. Read the Vocabulary sheet via lark-cli or Lark Open API (LARK_APP_ID/LARK_APP_SECRET).
  2. Transform each row into v1-compatible card schema:
     {hanzi, pinyin, hanViet, meaning, hsk, components[], kangxi[], story,
      vocab[], pinyinCompounds[], session, date}.
  3. Validate R12 component 4-field contract + R13 kangxi array.
  4. Write JSON to data/hanzi.json (served as static asset).
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "hanzi.json"


def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps([], ensure_ascii=False), encoding="utf-8")
    print("[build_data_json] wrote empty DATA placeholder (bootstrap mode)")


if __name__ == "__main__":
    main()
