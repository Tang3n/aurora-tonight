"""
Turn FMI/SGO keograms into per-hour labels: did the all-sky camera see aurora?

A keogram is one north–south slice of the sky per minute, stacked over the night.
Discrete aurora shows up as bright structure localised in latitude; clouds, moonlight and
twilight brighten a whole column fairly evenly. So for every column we measure
    structure = p99 − p50 of brightness along the meridian
(for colour keograms using green excess G − (R+B)/2, since aurora at 557.7 nm is green and
moonlit cloud is white). An hour is labelled by the 75th percentile of its columns.

Layouts were read off the axis ticks of each station's images (see README in this folder).

    tools/.venv/bin/python validation/label.py      → validation/data/labels.csv
"""
import csv
import datetime as dt
import pathlib
import re

import numpy as np
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent / "data"

# x of the first labelled tick, its UT hour, pixels per hour, data rows (y0, y1), night length in hours
LAYOUTS = {
    # Kilpisjärvi: 800×500, 557 nm grey, ticks UT14 at x=115 … UT06 at x=685, N up
    "KIL": dict(size=(800, 500), x0=115, ut0=14, pxh=(685 - 115) / 16, y=(72, 420), colour=False),
}
# Not used: Sodankylä (SOD) keograms have a time axis that changes from night to night, so a fixed
# pixel→time mapping mislabels hours; Kevo (KEV) is per calendar day with moonlit cloud looking like
# aurora in RGB; Muonio (MUO) file names do not match the dates printed in the images.
STATIONS = {"KIL": (69.05, 20.79)}


def column_metrics(img: Image.Image, colour: bool, y0: int, y1: int) -> tuple[np.ndarray, np.ndarray]:
    a = np.asarray(img.convert("RGB"), dtype=np.float32)[y0:y1]
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    lum = (r + g + b) / 3
    sig = np.clip(g - (r + b) / 2, 0, None) if colour else lum
    structure = np.percentile(sig, 99, axis=0) - np.percentile(sig, 50, axis=0)
    return structure, lum.mean(axis=0)


def label_file(path: pathlib.Path, station: str):
    L = LAYOUTS[station]
    try:
        img = Image.open(path)
        img.load()
    except Exception:
        return []
    if img.size != L["size"]:
        return []
    date = dt.datetime.strptime(re.search(r"_(\d{6})", path.name).group(1), "%y%m%d").replace(tzinfo=dt.timezone.utc)
    structure, mean = column_metrics(img, L["colour"], *L["y"])
    rows = []
    hours = 24 - L["ut0"] + 6
    for k in range(hours):
        xa = int(round(L["x0"] + k * L["pxh"]))
        xb = int(round(L["x0"] + (k + 1) * L["pxh"]))
        seg_s, seg_m = structure[xa:xb], mean[xa:xb]
        # columns with real data (outside imaging the plot is flat black / flat fill)
        valid = seg_m > 8
        coverage = float(valid.mean()) if len(valid) else 0.0
        t = date + dt.timedelta(hours=L["ut0"] + k)
        rows.append(
            dict(
                station=station,
                time=t.strftime("%Y-%m-%dT%H:00Z"),
                coverage=round(coverage, 2),
                structure=round(float(np.percentile(seg_s[valid], 75)), 2) if coverage > 0.5 else "",
                brightness=round(float(seg_m[valid].mean()), 1) if coverage > 0.5 else "",
            )
        )
    return rows


def main() -> None:
    out = ROOT / "labels.csv"
    rows = []
    for st in LAYOUTS:
        for p in sorted((ROOT / "keograms").glob(f"{st}_*.jpg")):
            rows += label_file(p, st)
    with out.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["station", "time", "coverage", "structure", "brightness"])
        w.writeheader()
        w.writerows(rows)
    have = [r for r in rows if r["structure"] != ""]
    print(f"{len(rows)} station-hours, {len(have)} with camera data → {out}")
    for st in LAYOUTS:
        s = np.array([r["structure"] for r in have if r["station"] == st], dtype=float)
        print(st, "structure percentiles 10/50/90/99:", np.percentile(s, [10, 50, 90, 99]).round(1))


if __name__ == "__main__":
    main()
