"""
Score the hindcast against the camera labels.

Label: aurora = structure ≥ 30, none = structure < 15 (15–30 is a grey zone and skipped),
hours with the Moon inside the camera's meridian slice are skipped (it shows up as a blob).
The keogram camera is far more sensitive than the eye, so it is compared with the
model's *camera* probability. The old v1 model is a ranking baseline (its scale is not
camera-calibrated, so compare it on ROC-AUC, not on Brier).

    tools/.venv/bin/python validation/evaluate.py
"""
import csv
import pathlib

import numpy as np

ROOT = pathlib.Path(__file__).resolve().parent / "data"
rows = list(csv.DictReader((ROOT / "hindcast.csv").open()))


def arr(key, rs):
    return np.array([float(r[key]) for r in rs])


def auc(p, y):
    """Probability that a random positive hour scores higher than a random negative one."""
    order = np.argsort(p)
    ranks = np.empty(len(p))
    ranks[order] = np.arange(1, len(p) + 1)
    # average ranks for ties
    for v in np.unique(p):
        m = p == v
        ranks[m] = ranks[m].mean()
    pos = y == 1
    n1, n0 = pos.sum(), (~pos).sum()
    return (ranks[pos].sum() - n1 * (n1 + 1) / 2) / (n1 * n0)


def brier(p, y):
    return float(np.mean((p - y) ** 2))


def report(name, rs, keys):
    y = np.array([1.0 if float(r["structure"]) >= 30 else 0.0 for r in rs])
    base = y.mean()
    print(f"\n## {name}: {len(rs)} hours, aurora in {base:.0%}")
    bs_clim = brier(np.full_like(y, base), y)
    for k in keys:
        p = arr(k, rs)
        bs = brier(p, y)
        print(f"  {k:6s}  ROC-AUC {auc(p, y):.3f}   Brier {bs:.3f}   skill vs climatology {1 - bs / bs_clim:+.2f}   mean p {p.mean():.2f}")
    return y


def reliability(key, rs, bins=(0, 0.1, 0.2, 0.4, 0.6, 0.8, 1.01)):
    y = np.array([1.0 if float(r["structure"]) >= 30 else 0.0 for r in rs])
    p = arr(key, rs)
    print(f"  reliability of {key}:  predicted → observed (n)")
    for a, b in zip(bins[:-1], bins[1:]):
        m = (p >= a) & (p < b)
        if m.sum():
            print(f"    {a:.1f}–{min(b, 1):.1f}:  mean p {p[m].mean():.2f} → seen {y[m].mean():.2f}  ({m.sum()})")


usable = [r for r in rows if r["moon_in_slice"] == "0" and not (15 <= float(r["structure"]) < 30)]
print(f"{len(rows)} hours in hindcast, {len(usable)} after removing grey zone and Moon-in-slice hours")

report("All usable hours (model with ERA5 clouds)", usable, ["p_cam", "v1_p"])
reliability("p_cam", usable)

clear = [r for r in usable if float(r["cloud_total"]) < 0.2]
report("Clear hours only (ERA5 total cloud < 20 %) — tests the aurora physics", clear, ["v_cam", "v_eye", "v1_p"])
reliability("v_cam", clear)

cloudy = [r for r in usable if float(r["cloud_total"]) > 0.9]
yc = np.array([1.0 if float(r["structure"]) >= 30 else 0.0 for r in cloudy])
print(f"\n## Overcast hours (ERA5 > 90 %): {len(cloudy)}, camera still saw structured aurora in {yc.mean():.0%}")

# Where does the physics miss? Clear hours by Kp
print("\n## Clear hours by Kp: mean v_cam vs observed")
for a, b in [(0, 1), (1, 2), (2, 3), (3, 4), (4, 9)]:
    m = [r for r in clear if a <= float(r["kp"]) < b]
    if m:
        y = np.mean([float(r["structure"]) >= 30 for r in m])
        print(f"  Kp {a}–{b}: n={len(m):4d}  model {np.mean(arr('v_cam', m)):.2f}  seen {y:.2f}")
print("\n## Clear hours by MLT")
for a, b in [(16, 19), (19, 22), (22, 25), (25, 28), (28, 31)]:
    m = [r for r in clear if a <= (float(r["mlt"]) + (24 if float(r["mlt"]) < 12 else 0)) < b]
    if m:
        y = np.mean([float(r["structure"]) >= 30 for r in m])
        print(f"  MLT {a % 24:02d}–{b % 24:02d}: n={len(m):4d}  model {np.mean(arr('v_cam', m)):.2f}  seen {y:.2f}")
