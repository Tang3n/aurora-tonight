"""
Download everything the hindcast needs into validation/data/ (git-ignored):

  keograms/   FMI MIRACLE all-sky camera keograms (557.7 nm), one JPG per station and night
  kp.txt      GFZ definitive/nowcast Kp since 1932
  clouds_<ST>.json   ERA5 hourly cloud cover for each station (Open-Meteo archive API)

    tools/.venv/bin/python validation/fetch.py
"""
import json
import pathlib
import re
import time
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent / "data"
KEO = ROOT / "keograms"
UA = {"User-Agent": "aurora-tonight-validation/0.1 (github.com/Tang3n/aurora-tonight)"}

# FMI MIRACLE stations (coordinates from the keogram headers / FMI station list)
STATIONS = {
    "KIL": (69.05, 20.79),   # Kilpisjärvi
    "SOD": (67.42, 26.39),   # Sodankylä
    "MUO": (68.02, 23.53),   # Muonio
    "KEV": (69.76, 27.01),   # Kevo
}
MONTHS = ["2511", "2512", "2601", "2602", "2603"]
START, END = "2025-10-31", "2026-04-01"


def get(url: str) -> bytes:
    for attempt in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
                return r.read()
        except Exception:
            if attempt == 2:
                raise
            time.sleep(2)
    raise RuntimeError


def main() -> None:
    KEO.mkdir(parents=True, exist_ok=True)

    n = 0
    for st in STATIONS:
        for m in MONTHS:
            base = f"https://space.fmi.fi/MIRACLE/ASC/ASC_keograms/{st}.{m}/"
            names = sorted(set(re.findall(rf'href="({st}_\d{{6}}\.jpg)"', get(base).decode("latin-1"))))
            for name in names:
                dest = KEO / name
                if not dest.exists():
                    dest.write_bytes(get(base + name))
                    time.sleep(0.2)  # be polite
                n += 1
    print(f"keograms: {n}")

    (ROOT / "kp.txt").write_bytes(get("https://kp.gfz.de/app/files/Kp_ap_since_1932.txt"))
    print("kp: ok")

    for st, (lat, lon) in STATIONS.items():
        url = (
            "https://archive-api.open-meteo.com/v1/archive"
            f"?latitude={lat}&longitude={lon}&start_date={START}&end_date={END}"
            "&hourly=cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high&timezone=GMT"
        )
        data = json.loads(get(url))
        (ROOT / f"clouds_{st}.json").write_text(json.dumps(data["hourly"]))
        print(f"clouds {st}: {len(data['hourly']['time'])} h")


if __name__ == "__main__":
    main()
