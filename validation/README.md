# Validation against an all-sky camera

Hindcast of the scoring model (v2) against the FMI all-sky camera at **Kilpisjärvi** (69.05°N 20.79°E,
AACGM 66.6°), Nov 2025 – Mar 2026.

```sh
tools/.venv/bin/python validation/fetch.py      # keograms, GFZ Kp, ERA5 clouds → validation/data/
tools/.venv/bin/python validation/label.py      # per-hour "structure" from the keograms
npx vite build --ssr validation/hindcast.ts --outDir validation/dist && node validation/dist/hindcast.js
tools/.venv/bin/python validation/evaluate.py
```

## Method

- **Truth:** a keogram is a north–south slice of the sky per minute. An hour counts as *aurora* when the
  brightness along the meridian is structured (p99 − p50 ≥ 30), *none* when < 15; 15–30 is skipped.
  Thresholds were set by eye on 8 random nights. Hours with the Moon in the camera's slice are dropped.
- **Inputs:** observed Kp (GFZ) and ERA5 reanalysis cloud — so this tests the physics given the true
  inputs, **not** forecast skill.
- The camera is far more sensitive than the eye → compared with the model's *camera* probability.
- Other FMI stations were not usable (variable time axis, mislabelled files, RGB moonlight).

## Results (2026-11-18, 1 343 usable hours, aurora in 40 %)

| Subset | Model | ROC-AUC | Brier skill vs climatology |
|---|---|---|---|
| Clear hours (ERA5 < 20 %, n = 81) | v2 camera | **0.97** | +0.60 |
| | v1 (old) | 0.99 | +0.65 |
| All hours, with ERA5 clouds | v2 camera | 0.67 | −0.23 |
| | v1 (old) | 0.64 | −0.19 |

**1. The aurora physics works at this latitude, but cannot separate v1 from v2 here.** On clear hours both
rank hours almost perfectly. Kilpisjärvi sits under the oval, where any sensible model says "yes" at Kp ≥ 3;
the models differ mainly at mid-latitudes (southern Norway), which no camera in the archive covers.

**2. At low Kp the physics is too optimistic.** Clear hours, model vs seen: Kp 0–1 0.27 vs 0.00,
Kp 1–2 0.72 vs 0.25 (n = 19 — small). Suggests the arc is too bright or the oval too far south at Kp < 2.

**3. Clouds are the real problem.** When the physics says aurora is likely (v_cam > 0.8):

| ERA5 cloud | model clear-sky chance | camera saw aurora |
|---|---|---|
| 0–20 % | 0.95 | 0.97 |
| 20–50 % | 0.67 | 0.82 |
| 50–80 % | 0.33 | 0.71 |
| 80–95 % | 0.14 | 0.71 |
| 95–100 % | 0.02 | 0.42 |

Treating cloud fraction as "probability the view is blocked" is far too harsh: even at 95–100 % the camera
saw aurora in 42 % of hours (gaps, thin cloud, a coarse 25 km grid). This alone makes the all-hours score
worse than climatology. A human eye is less sensitive than this camera, so the right mapping for the eye
lies between the two columns — to be decided.
