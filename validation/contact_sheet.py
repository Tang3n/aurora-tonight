"""
Contact sheets for checking the automatic labels by eye: keograms with the per-hour
structure value printed under each hour.

    tools/.venv/bin/python validation/contact_sheet.py KIL 251120 251112 ... → validation/data/sheet_<ST>_<n>.png
"""
import csv
import pathlib
import sys

from PIL import Image, ImageDraw

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from label import LAYOUTS  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parent / "data"


def main(station: str, dates: list[str], out_name: str) -> None:
    L = LAYOUTS[station]
    labels = {(r["station"], r["time"]): r for r in csv.DictReader((ROOT / "labels.csv").open())}
    tiles = []
    for d in dates:
        img = Image.open(ROOT / "keograms" / f"{station}_{d}.jpg").convert("RGB")
        w, h = img.size
        canvas = Image.new("RGB", (w, h + 40), "black")
        canvas.paste(img, (0, 0))
        dr = ImageDraw.Draw(canvas)
        hours = 24 - L["ut0"] + 6
        import datetime as dt

        base = dt.datetime.strptime(d, "%y%m%d")
        for k in range(hours):
            t = (base + dt.timedelta(hours=L["ut0"] + k)).strftime("%Y-%m-%dT%H:00Z")
            r = labels.get((station, t))
            x = int(L["x0"] + (k + 0.5) * L["pxh"])
            val = r["structure"] if r and r["structure"] != "" else "-"
            dr.text((x - 10, h + 4), str(val)[:5], fill="yellow")
            dr.text((x - 6, h + 20), f"{(L['ut0'] + k) % 24:02d}", fill="grey")
        tiles.append(canvas.resize((800, int(800 * canvas.height / canvas.width))))
    sheet = Image.new("RGB", (800, sum(t.height for t in tiles)), "black")
    y = 0
    for t in tiles:
        sheet.paste(t, (0, y))
        y += t.height
    sheet.save(ROOT / out_name)
    print(ROOT / out_name)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[3:], sys.argv[2])
