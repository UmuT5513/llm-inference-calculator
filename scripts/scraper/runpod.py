"""Scraper for https://www.runpod.io/pricing.

RunPod publishes its GPU catalog as structured JSON-LD blocks embedded in the
page. Each GPU appears as a `Product` entry whose `offers` is an
`AggregateOffer` with a Community Cloud (low) and Secure Cloud (high) hourly
rate. We store the Secure Cloud (standard on-demand) rate and keep both in
raw_json.
"""

from __future__ import annotations

import json
import re
from typing import Any

from common import insert_prices, log_summary, normalize_gpu_name, require_soup

SOURCE_URL = "https://www.runpod.io/pricing"
PROVIDER = "runpod"

JSONLD_RE = re.compile(r'<script type="application/ld\+json">(.*?)</script>', re.DOTALL)


def extract_jsonld_blocks(html: str) -> list[dict[str, Any]]:
    blocks: list[dict[str, Any]] = []
    for match in JSONLD_RE.finditer(html):
        try:
            data = json.loads(match.group(1))
            blocks.append(data)
        except json.JSONDecodeError:
            continue
    return blocks


def scrape() -> list[dict[str, Any]]:
    soup = require_soup(SOURCE_URL)
    html = str(soup)
    blocks = extract_jsonld_blocks(html)

    products: list[dict[str, Any]] = []
    for block in blocks:
        graph = block.get("@graph") if isinstance(block, dict) else None
        if not isinstance(graph, list):
            continue
        for item in graph:
            if isinstance(item, dict) and item.get("@type") == "Product":
                products.append(item)

    rows: list[dict[str, Any]] = []
    for product in products:
        raw_name = (product.get("name") or "").strip()
        # e.g. "H100 SXM GPU on Runpod"
        gpu_name = re.sub(r"\s+GPU\s+on\s+Runpod\s*$", "", raw_name, flags=re.IGNORECASE).strip()
        if not gpu_name:
            continue

        offers = product.get("offers") or {}
        if offers.get("@type") != "AggregateOffer":
            continue

        try:
            low_price = float(offers.get("lowPrice") or 0)
            high_price = float(offers.get("highPrice") or 0)
        except (TypeError, ValueError):
            continue

        if high_price <= 0:
            continue

        offer_list = offers.get("offers") or []
        price_model = "Secure Cloud (On-Demand)"
        # Secure Cloud is the high-priced, standard on-demand tier.
        price_per_hr = high_price

        rows.append(
            {
                "gpu_slug": normalize_gpu_name(gpu_name),
                "gpu_name": gpu_name,
                "vram_gb": None,
                "price_per_hr_usd": price_per_hr,
                "price_model": price_model,
                "raw_json": {
                    "community_price_per_hr_usd": low_price,
                    "secure_price_per_hr_usd": high_price,
                    "offers": offer_list,
                    "url": SOURCE_URL,
                },
            }
        )

    return rows


if __name__ == "__main__":
    result = scrape()
    log_summary(PROVIDER, result)
    print(f"Inserted: {insert_prices(PROVIDER, result)} rows")