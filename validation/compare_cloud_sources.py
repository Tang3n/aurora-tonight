"""
Are MET Norway (home point) and Open-Meteo metno_seamless (spots, ADR 6) interchangeable for the
model? The model uses only total cloud cover, so compare that, hour by hour, for the same places.

    python3 validation/compare_cloud_sources.py

Prints mean absolute difference and bias (Open-Meteo minus MET) in percentage points, and how
often the two disagree on the cloud class the empirical curve cares about (<50 / 50-95 / >95 %).
A forecast-vs-forecast check, not a truth check: it only says whether mixing the sources is safe.
"""
from __future__ import annotations

import json
import urllib.request
from datetime import datetime, timezone

UA = "aurora-tonight-validation/0.1 (+https://github.com/Tang3n/aurora-tonight)"
PLACES = {
    "Stavanger": (58.970, 5.733),
    "Dalsnuten": (58.896, 5.974),
    "Egersund": (58.451, 5.998),
    "Haugesund": (59.413, 5.268),
    "Trondheim": (63.430, 10.395),
    "Steinkjer": (64.015, 11.495),
}


def get(url: str) -> object:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def met(lat: float, lon: float) -> dict[int, float]:
    d = get(f"https://api.met.no/weatherapi/locationforecast/2.0/compact?lat={lat:.4f}&lon={lon:.4f}")
    out = {}
    for t in d["properties"]["timeseries"]:
        ts = int(datetime.fromisoformat(t["time"].replace("Z", "+00:00")).timestamp())
        v = t["data"]["instant"]["details"].get("cloud_area_fraction")
        if v is not None:
            out[ts] = v
    return out


def open_meteo(places: dict[str, tuple[float, float]]) -> list[dict[int, float]]:
    lats = ",".join(f"{p[0]:.3f}" for p in places.values())
    lons = ",".join(f"{p[1]:.3f}" for p in places.values())
    d = get(
        "https://api.open-meteo.com/v1/forecast?latitude=" + lats + "&longitude=" + lons
        + "&hourly=cloud_cover&models=metno_seamless&timeformat=unixtime&timezone=GMT&forecast_days=2"
    )
    d = d if isinstance(d, list) else [d]
    return [
        {t: c for t, c in zip(x["hourly"]["time"], x["hourly"]["cloud_cover"]) if c is not None}
        for x in d
    ]


def cls(c: float) -> int:
    return 0 if c < 50 else 1 if c <= 95 else 2


def main() -> None:
    om = open_meteo(PLACES)
    now = datetime.now(timezone.utc).timestamp()
    horizon = now + 36 * 3600  # the next night and a bit
    total_n = total_abs = total_bias = total_cls = 0
    print(f"{'place':<10} {'hours':>5} {'MAE pp':>7} {'bias pp':>8} {'class differs':>14}")
    for (name, (lat, lon)), o in zip(PLACES.items(), om):
        m = met(lat, lon)
        common = [t for t in sorted(m) if t in o and now - 3600 <= t <= horizon]
        if not common:
            print(f"{name:<10} no common hours")
            continue
        diffs = [o[t] - m[t] for t in common]
        cdiff = sum(cls(o[t]) != cls(m[t]) for t in common)
        n = len(common)
        print(f"{name:<10} {n:>5} {sum(abs(x) for x in diffs)/n:>7.1f} {sum(diffs)/n:>+8.1f} {cdiff/n:>13.0%}")
        total_n += n
        total_abs += sum(abs(x) for x in diffs)
        total_bias += sum(diffs)
        total_cls += cdiff
    if total_n:
        print(f"{'all':<10} {total_n:>5} {total_abs/total_n:>7.1f} {total_bias/total_n:>+8.1f} {total_cls/total_n:>13.0%}")
    print(f"run at {datetime.now(timezone.utc):%Y-%m-%d %H:%M} UTC")


if __name__ == "__main__":
    main()
