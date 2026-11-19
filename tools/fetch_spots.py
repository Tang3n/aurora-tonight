"""
Seed spots from OpenStreetMap viewpoints (ADR 7). Run by hand (or monthly), commit the output:

    python3 tools/fetch_spots.py            # all regions
    python3 tools/fetch_spots.py rogaland   # one region

Output: apps/web/public/spots/<region>.json, served as static files to the web and the app.
Data © OpenStreetMap contributors, ODbL 1.0 — the derived files stay under ODbL and every map
that shows them must carry the attribution in the file.

Only the Python standard library; one Overpass request per region, with a pause between them
(Overpass is a shared public service).
"""
from __future__ import annotations

import json
import math
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

# Main instance first, a public mirror as fallback; both are shared services, so retries back off.
OVERPASS = ["https://overpass-api.de/api/interpreter", "https://overpass.private.coffee/api/interpreter"]
USER_AGENT = "aurora-tonight-spots/0.1 (+https://github.com/Tang3n/aurora-tonight)"
OUT_DIR = Path(__file__).resolve().parent.parent / "apps" / "web" / "public" / "spots"

# ISO 3166-2 codes of Norwegian counties.
REGIONS = {
    "rogaland": {"name": "Rogaland", "iso": "NO-11"},
    "trondelag": {"name": "Trøndelag", "iso": "NO-50"},
}

# 16-point compass → degrees, for the OSM `direction` tag.
COMPASS = {
    name: i * 22.5
    for i, name in enumerate(
        "N NNE NE ENE E ESE SE SSE S SSW SW WSW W WNW NW NNW".split()
    )
}

NOT_PUBLIC = {"private", "no", "customers"}


def query(iso: str) -> str:
    return f"""
[out:json][timeout:180];
area["ISO3166-2"="{iso}"]["boundary"="administrative"]->.r;
(
  node["tourism"="viewpoint"](area.r);
  way["tourism"="viewpoint"](area.r);
);
out center tags;
"""


def fetch(iso: str) -> list[dict]:
    body = urllib.parse.urlencode({"data": query(iso)}).encode()
    last: Exception | None = None
    for attempt in range(4):
        url = OVERPASS[attempt % len(OVERPASS)]
        try:
            req = urllib.request.Request(url, data=body, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(req, timeout=240) as res:
                return json.load(res)["elements"]
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError) as e:
            last = e
            wait = 10 * (attempt + 1)
            print(f"  {url}: {e}; retry in {wait} s", file=sys.stderr)
            time.sleep(wait)
    raise RuntimeError(f"Overpass failed for {iso}") from last


def parse_direction(value: str | None) -> list[float] | None:
    """`direction` may be degrees, a compass point, a range "300-60" or a list "N;NE". Returns centre
    bearings in degrees, or None if absent/unreadable."""
    if not value:
        return None
    out: list[float] = []
    for part in value.replace(",", ";").split(";"):
        part = part.strip().upper()
        if not part:
            continue
        if "-" in part[1:]:  # range like 300-60 or NW-NE
            a, b = part.split("-", 1)
            da, db = parse_direction(a), parse_direction(b)
            if da and db:
                span = (db[0] - da[0]) % 360
                out.append((da[0] + span / 2) % 360)
            continue
        if part in COMPASS:
            out.append(COMPASS[part])
            continue
        try:
            out.append(float(part) % 360)
        except ValueError:
            pass
    return out or None


def faces_north(bearings: list[float] | None) -> bool | None:
    """True if any recorded view direction is within 67.5° of north (NW..NE)."""
    if bearings is None:
        return None
    return any(min(b, 360 - b) <= 67.5 for b in bearings)


def to_spot(el: dict) -> dict | None:
    tags = el.get("tags", {})
    name = tags.get("name") or tags.get("name:no") or tags.get("name:nb")
    if not name:
        return None  # unnamed points are hard to recognise in a list
    if tags.get("access") in NOT_PUBLIC:
        return None
    lat = el.get("lat", el.get("center", {}).get("lat"))
    lon = el.get("lon", el.get("center", {}).get("lon"))
    if lat is None or lon is None:
        return None
    ele = None
    try:
        ele = round(float(tags["ele"].split()[0].replace(",", ".")))
    except (KeyError, ValueError, IndexError):
        pass
    bearings = parse_direction(tags.get("direction"))
    return {
        "id": f"osm-{el['type'][0]}{el['id']}",
        "name": name,
        "lat": round(lat, 5),
        "lon": round(lon, 5),
        "ele": ele,
        "direction": [round(b) for b in bearings] if bearings else None,
        "facesNorth": faces_north(bearings),
    }


def dedupe(spots: list[dict]) -> list[dict]:
    """Drop exact name duplicates closer than 300 m (a node and a way for the same place)."""
    kept: list[dict] = []
    for s in spots:
        dup = False
        for k in kept:
            if k["name"] == s["name"]:
                dlat = (k["lat"] - s["lat"]) * 111_000
                dlon = (k["lon"] - s["lon"]) * 111_000 * math.cos(math.radians(s["lat"]))
                if math.hypot(dlat, dlon) < 300:
                    dup = True
                    break
        if not dup:
            kept.append(s)
    return kept


def build(region: str) -> dict:
    meta = REGIONS[region]
    elements = fetch(meta["iso"])
    spots = dedupe([s for s in (to_spot(e) for e in elements) if s])
    spots.sort(key=lambda s: (s["lat"], s["lon"]))
    return {
        "region": region,
        "name": meta["name"],
        "generated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source": "OpenStreetMap, tourism=viewpoint, via Overpass API",
        "license": "ODbL-1.0",
        "attribution": "© OpenStreetMap contributors",
        "stats": {
            "osmElements": len(elements),
            "spots": len(spots),
            "withDirection": sum(1 for s in spots if s["direction"]),
            "facingNorth": sum(1 for s in spots if s["facesNorth"]),
        },
        "spots": spots,
    }


def main(argv: list[str]) -> None:
    regions = argv or list(REGIONS)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for i, region in enumerate(regions):
        if i:
            time.sleep(5)
        data = build(region)
        path = OUT_DIR / f"{region}.json"
        path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n")
        print(f"{region}: {data['stats']} → {path.relative_to(OUT_DIR.parents[3])} ({path.stat().st_size} B)")


if __name__ == "__main__":
    main(sys.argv[1:])
