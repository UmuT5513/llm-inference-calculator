"""Scraper for https://lambda.ai/pricing.

Lambda's HubSpot site is server-side rendered. Pricing appears in HTML tables
whose header contains "PRICE/GPU/HR". Each row names the GPU plan (e.g.
"NVIDIA HGX B200") and a per-GPU hourly price. When a plan appears in several
rows (16 / 64 / 256 GPU clusters), we keep the lowest per-GPU rate.
"""

from __future__ import annotations

from typing import Any

from common import insert_prices, log_summary, normalize_gpu_name, parse_price_usd, require_soup

SOURCE_URL = "https://lambda.ai/pricing"
PROVIDER = "lambda"


def scrape() -> list[dict[str, Any]]:
    soup = require_soup(SOURCE_URL)
    best_price: dict[str, tuple[str, float]] = {}

    for table in soup.find_all("table"):
        headers = [th.get_text(" ", strip=True).lower() for th in table.find_all("th")]
        price_col_idx = next((i for i, h in enumerate(headers) if "price/gpu/hr" in h), None)
        if price_col_idx is None:
            continue

        rows = table.find_all("tr")
        for tr in rows:
            cells = tr.find_all(["th", "td"])
            if len(cells) <= price_col_idx:
                continue

            plan = tr.get("data-plan") or cells[0].get_text(" ", strip=True)
            plan = (plan or "").strip()
            if not plan:
                continue

            price_text = cells[price_col_idx].get_text(" ", strip=True)
            price = parse_price_usd(price_text)
            if price is None or price <= 0:
                continue

            slug = normalize_gpu_name(plan)
            if slug not in best_price or price < best_price[slug][1]:
                best_price[slug] = (plan, price)

    rows: list[dict[str, Any]] = [
        {
            "gpu_slug": slug,
            "gpu_name": plan,
            "vram_gb": None,
            "price_per_hr_usd": price,
            "price_model": "On-Demand / Cluster (PRICE/GPU/HR)",
            "raw_json": {"url": SOURCE_URL},
        }
        for slug, (plan, price) in best_price.items()
    ]
    return rows


if __name__ == "__main__":
    result = scrape()
    log_summary(PROVIDER, result)
    print(f"Inserted: {insert_prices(PROVIDER, result)} rows")