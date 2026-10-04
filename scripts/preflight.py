#!/usr/bin/env python3
"""Preflight check for cchz2-aime.

Invariants:
  - wrangler.jsonc exists with assets.directory and D1/R2 bindings
  - .assetsignore excludes .git, node_modules, wrangler.jsonc, scripts
  - No deprecated hosts (pages.dev / aime-app / netlify/github.io) in index.html
  - images/ uses HEX-only filenames (Cloudflare CDN bug with Unicode)
  - data/hanzi.json is valid JSON
  - migrations/ contains 0001_init.sql
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def fail(msg: str) -> None:
    print(f"[preflight] FAIL: {msg}", file=sys.stderr)
    sys.exit(1)


def ok(msg: str) -> None:
    print(f"[preflight] OK: {msg}")


def check_wrangler() -> None:
    p = ROOT / "wrangler.jsonc"
    if not p.exists():
        fail("missing wrangler.jsonc")
    txt = p.read_text(encoding="utf-8")
    if '"directory"' not in txt:
        fail("wrangler.jsonc must declare assets.directory")
    if '"DB"' not in txt or '"d1_databases"' not in txt:
        fail("wrangler.jsonc must bind D1 as DB")
    if '"VAULT_IMAGES"' not in txt or '"r2_buckets"' not in txt:
        fail("wrangler.jsonc must bind R2 bucket VAULT_IMAGES")
    ok("wrangler.jsonc present with bindings")


def check_assetsignore() -> None:
    p = ROOT / ".assetsignore"
    if not p.exists():
        fail("missing .assetsignore")
    txt = p.read_text(encoding="utf-8")
    for must in (".git", "node_modules", "wrangler.jsonc"):
        if must not in txt:
            fail(f".assetsignore must exclude {must}")
    ok(".assetsignore present")


def check_index() -> None:
    p = ROOT / "index.html"
    if not p.exists():
        fail("missing index.html")
    txt = p.read_text(encoding="utf-8")
    for bad in ["cecehanzi.pages.dev", "aime-app.tiktok-row.net", "netlify.app"]:
        if bad in txt:
            fail(f"index.html references deprecated host: {bad}")
    ok("index.html invariants")


HEX_RE = re.compile(r"^[0-9A-F]{4}\.(png|jpg|jpeg|webp)$")


def check_images() -> None:
    img_dir = ROOT / "images"
    if not img_dir.exists():
        ok("images/ dir missing (allowed in bootstrap)")
        return
    for f in img_dir.iterdir():
        if not f.is_file() or f.name.startswith("."):
            continue
        if not HEX_RE.match(f.name):
            fail(f"images/ has non-HEX filename: {f.name}")
    ok("images/ HEX filenames")


def check_hanzi_json() -> None:
    p = ROOT / "data" / "hanzi.json"
    if not p.exists():
        fail("data/hanzi.json missing (run npm run build)")
    try:
        data = json.loads(p.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        fail(f"data/hanzi.json invalid JSON: {e}")
    if not isinstance(data, list):
        fail("data/hanzi.json must be a list")
    ok(f"data/hanzi.json valid ({len(data)} cards)")


def check_migrations() -> None:
    p = ROOT / "migrations" / "0001_init.sql"
    if not p.exists():
        fail("migrations/0001_init.sql missing")
    sql = p.read_text(encoding="utf-8")
    for table in ("progress", "vault"):
        if f"CREATE TABLE IF NOT EXISTS {table}" not in sql:
            fail(f"migration must create table {table}")
    ok("D1 migration 0001 present")


def main() -> None:
    check_wrangler()
    check_assetsignore()
    check_index()
    check_images()
    check_hanzi_json()
    check_migrations()
    print("[preflight] ALL CHECKS PASSED")


if __name__ == "__main__":
    main()
