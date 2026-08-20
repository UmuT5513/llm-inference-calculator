"""Run all GPU price scrapers and store the results in PostgreSQL.

Usage:
    uv run --python .venv/bin/python scripts/scraper/sync_gpu_prices.py
"""

from __future__ import annotations

import sys
import time

import common
import lambda_scraper as lambda_src
import modal
import runpod


def main() -> int:
    total = 0
    for provider, module in (
        ("runpod", runpod),
        ("modal", modal),
        ("lambda", lambda_src),
    ):
        try:
            rows = module.scrape()
            common.log_summary(provider, rows)
            inserted = common.insert_prices(provider, rows)
            total += inserted
        except Exception as err:  # noqa: BLE001
            print(f"[{provider}] ERROR: {err}", file=sys.stderr)
        time.sleep(1)

    print(f"\nDone. {total} GPU price rows written to gpu_prices.")
    return 0


if __name__ == "__main__":
    sys.exit(main())