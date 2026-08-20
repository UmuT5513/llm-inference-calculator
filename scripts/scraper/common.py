"""Shared helpers for the GPU price scrapers.

Each scraper fetches a provider pricing page and produces a list of
dicts: {gpu_slug, gpu_name, vram_gb, price_per_hr_usd, price_model, raw_json}.
Rows are written to the PostgreSQL `gpu_prices` table via psycopg.
"""

from __future__ import annotations

import json
import os
import re
import sys
import time
from typing import Any

import requests
from bs4 import BeautifulSoup

USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0 Safari/537.36"
)

# Maps scraped GPU names to the ids used in src/data/gpuPresets.ts.
# Patterns are matched (case-insensitive) against the lowercased GPU name;
# the FIRST matching pattern wins, so order from most specific to least.
GPU_SLUG_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"\bh100\s+nvl\b"), "nvidia-h100-nvl"),
    (re.compile(r"\bh100\s+pcie\b"), "nvidia-h100-pcie"),
    (re.compile(r"\bh100\s+sxm5?\b"), "nvidia-h100-sxm"),
    (re.compile(r"\bh100\b"), "nvidia-h100-sxm"),
    (re.compile(r"\bh200\s+sxm\b"), "nvidia-h200"),
    (re.compile(r"\bh200\b"), "nvidia-h200"),
    (re.compile(r"\bb200\b"), "nvidia-b200"),
    (re.compile(r"\bb300\b"), "nvidia-b300"),
    (re.compile(r"\bgb200\b"), "nvidia-gb200-nvl"),
    (re.compile(r"\bgh200\b"), "nvidia-gh200"),
    (re.compile(r"\ba100\b.*\bpcie\b"), "nvidia-a100-40g"),
    (re.compile(r"\ba100\b.*\b40\s*gb\b"), "nvidia-a100-40g"),
    (re.compile(r"\ba100\b"), "nvidia-a100-80g"),
    (re.compile(r"\ba10g?\b"), "nvidia-a10g"),
    (re.compile(r"\ba40\b"), "nvidia-a40"),
    (re.compile(r"\bl40s\b"), "nvidia-l40s"),
    (re.compile(r"\bl40\b"), "nvidia-l40"),
    (re.compile(r"\bl4\b"), "nvidia-l4"),
    (re.compile(r"\bt4\b"), "nvidia-tesla-t4"),
    (re.compile(r"\bmi300x\b"), "amd-mi300x"),
    (re.compile(r"\brtx\s+pro\s+6000\b"), "nvidia-rtx-6000-ada"),
    (re.compile(r"\brtx\s+6000\s+ada\b"), "nvidia-rtx-6000-ada"),
    (re.compile(r"\brtx\s+a6000\b"), "nvidia-rtx-a6000"),
    (re.compile(r"\ba6000\b"), "nvidia-rtx-a6000"),
    (re.compile(r"\brtx\s+5000\s+ada\b"), "nvidia-rtx-5000-ada"),
    (re.compile(r"\brtx\s+a5000\b"), "nvidia-rtx-a5000"),
    (re.compile(r"\ba5000\b"), "nvidia-rtx-a5000"),
    (re.compile(r"\brtx\s+a4500\b"), "nvidia-rtx-a4500"),
    (re.compile(r"\brtx\s+a4000\b"), "nvidia-rtx-a4000"),
    (re.compile(r"\brtx\s+5090\b"), "nvidia-rtx-5090"),
    (re.compile(r"\brtx\s+5080\b"), "nvidia-rtx-5080"),
    (re.compile(r"\brtx\s+4090\b"), "nvidia-rtx-4090"),
    (re.compile(r"\brtx\s+4080\b"), "nvidia-rtx-4080-super"),
    (re.compile(r"\brtx\s+4070\b"), "nvidia-rtx-4070ti-super"),
    (re.compile(r"\brtx\s+3090\b"), "nvidia-rtx-3090"),
]


def slugify_gpu(name: str) -> str:
    """Fallback slug generator for GPUs without a preset mapping."""
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return f"gpu-{slug}" if slug else "gpu-unknown"


def normalize_gpu_name(name: str) -> str:
    """Best-effort mapping of a provider GPU name to a known preset slug."""
    lowered = (name or "").lower()
    for pattern, slug in GPU_SLUG_PATTERNS:
        if pattern.search(lowered):
            return slug
    return slugify_gpu(name or "")


def fetch_html(url: str, *, timeout: int = 30, retries: int = 3) -> str:
    """Fetch a page with a browser-ish User-Agent and simple retry/backoff."""
    last_err: Exception | None = None
    for attempt in range(retries):
        try:
            resp = requests.get(
                url,
                headers={"User-Agent": USER_AGENT, "Accept-Language": "en-US,en;q=0.9"},
                timeout=timeout,
            )
            resp.raise_for_status()
            resp.encoding = resp.apparent_encoding or "utf-8"
            return resp.text
        except Exception as err:  # noqa: BLE001
            last_err = err
            time.sleep(2 * (attempt + 1))
    raise RuntimeError(f"Failed to fetch {url}: {last_err}")


def parse_price_usd(text: str) -> float | None:
    """Extract a USD price like '$3.29' / '$0.001097' from arbitrary text."""
    if not text:
        return None
    match = re.search(r"\$\s?([0-9]+(?:\.[0-9]+)?)", text)
    if not match:
        return None
    try:
        return float(match.group(1))
    except ValueError:
        return None


def get_database_url() -> str:
    return os.environ.get(
        "DATABASE_URL",
        "postgres://llmcalc:llmcalc@localhost:5432/llmcalc",
    )


def ensure_schema(conn) -> None:
    """Create the gpu_prices table if it does not exist yet."""
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS gpu_prices (
          id BIGSERIAL PRIMARY KEY,
          provider TEXT NOT NULL,
          gpu_slug TEXT NOT NULL,
          gpu_name TEXT NOT NULL,
          vram_gb NUMERIC,
          price_per_hr_usd NUMERIC NOT NULL,
          price_model TEXT,
          raw_json JSONB,
          scraped_at TIMESTAMPTZ NOT NULL
        )
        """
    )
    conn.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_gpu_prices_provider
          ON gpu_prices(provider, gpu_slug, scraped_at DESC)
        """
    )


def insert_prices(provider: str, rows: list[dict[str, Any]]) -> int:
    """Insert scraped rows into gpu_prices. Returns number of rows written."""
    if not rows:
        return 0

    import psycopg

    with psycopg.connect(get_database_url()) as conn:
        with conn.cursor() as cur:
            ensure_schema(cur)
            for row in rows:
                cur.execute(
                    """
                    INSERT INTO gpu_prices
                      (provider, gpu_slug, gpu_name, vram_gb, price_per_hr_usd, price_model, raw_json, scraped_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, now())
                    """,
                    (
                        provider,
                        row["gpu_slug"],
                        row["gpu_name"],
                        row.get("vram_gb"),
                        row["price_per_hr_usd"],
                        row.get("price_model"),
                        json.dumps(row.get("raw_json", {}), ensure_ascii=False),
                    ),
                )
    return len(rows)


def insert_rows(table: str, rows: list[dict[str, Any]]) -> int:
    """Insert arbitrary rows into a table using its column names as keys.

    The `id` column (if present) is omitted so it is auto-generated; scalar
    columns are inserted directly and any key ending in `_json` is JSON-encoded.
    Returns the number of rows written.
    """
    if not rows:
        return 0

    import psycopg

    columns = [k for k in rows[0] if k != "id"]
    placeholders = ", ".join(["%s"] * len(columns))
    col_sql = ", ".join(columns)
    sql = f"INSERT INTO {table} ({col_sql}) VALUES ({placeholders})"

    with psycopg.connect(get_database_url()) as conn:
        with conn.cursor() as cur:
            for row in rows:
                values = []
                for col in columns:
                    val = row[col]
                    if col == "raw_json" or col.endswith("_json"):
                        val = json.dumps(val, ensure_ascii=False) if val is not None else None
                    values.append(val)
                cur.execute(sql, tuple(values))
    return len(rows)


def log_summary(provider: str, rows: list[dict[str, Any]]) -> None:
    print(f"[{provider}] {len(rows)} GPU prices scraped:")
    for row in rows:
        print(f"  {row['gpu_slug']:24s} {row['gpu_name']:32s} ${row['price_per_hr_usd']:.4f}/hr")


def require_soup(url: str) -> BeautifulSoup:
    html = fetch_html(url)
    return BeautifulSoup(html, "html.parser")