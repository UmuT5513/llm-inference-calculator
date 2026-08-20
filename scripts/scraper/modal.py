"""Scraper for https://modal.com/pricing.

Modal's SvelteKit page is server-side rendered: each resource is a `.line-item`
div. GPU tasks are the line-items whose label starts with "Nvidia" and whose
price is shown per-second. We convert per-second to per-hour (x3600).
"""

from __future__ import annotations

from typing import Any

from common import insert_prices, log_summary, normalize_gpu_name, parse_price_usd, require_soup

SOURCE_URL = "https://modal.com/pricing"
PROVIDER = "modal"


def scrape() -> list[dict[str, Any]]:
    soup = require_soup(SOURCE_URL)
    rows: list[dict[str, Any]] = []

    for item in soup.select(".line-item"):
        name_el = item.find("p")
        if not name_el:
            continue
        name = name_el.get_text(" ", strip=True)
        if not name.lower().startswith("nvidia"):
            continue

        price_el = item.select_one(".price")
        if not price_el:
            continue
        price_text = price_el.get_text(" ", strip=True)
        per_sec = parse_price_usd(price_text)
        if per_sec is None:
            continue

        rows.append(
            {
                "gpu_slug": normalize_gpu_name(name),
                "gpu_name": name,
                "vram_gb": None,
                "price_per_hr_usd": round(per_sec * 3600, 6),
                "price_model": "Per-Second (Scale-to-Zero) -> per hour",
                "raw_json": {"price_per_sec_usd": per_sec, "url": SOURCE_URL},
            }
        )

    return rows


if __name__ == "__main__":
    result = scrape()
    log_summary(PROVIDER, result)
    print(f"Inserted: {insert_prices(PROVIDER, result)} rows")