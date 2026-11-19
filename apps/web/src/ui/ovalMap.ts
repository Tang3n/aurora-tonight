/**
 * OVATION grid on an orthographic globe seen from above the user's hemisphere pole,
 * tilted towards the user so their position is visible.
 */
import { geoGraticule10, geoOrthographic, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import landTopo from 'world-atlas/land-110m.json';
import type { OvationGrid } from '@aurora/model/ovation';

const topo = landTopo as unknown as Topology<{ land: GeometryCollection }>;
const land = feature(topo, topo.objects.land);

export function drawOval(canvas: HTMLCanvasElement, grid: OvationGrid | null, here: { lat: number; lon: number }, youLabel: string) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const W = canvas.width;
  const north = here.lat >= 0;
  const proj = geoOrthographic()
    .rotate([-here.lon, north ? -72 : 72])
    .scale(W * 0.62)
    .translate([W / 2, W / 2 + (north ? 40 : -40)])
    .clipAngle(90);
  const path = geoPath(proj, ctx);

  ctx.clearRect(0, 0, W, W);
  ctx.save();
  ctx.beginPath();
  path({ type: 'Sphere' });
  ctx.clip();
  ctx.fillStyle = 'rgba(8,16,32,.9)';
  ctx.fill();
  ctx.beginPath();
  path(geoGraticule10());
  ctx.strokeStyle = 'rgba(160,200,255,.06)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.beginPath();
  path(land);
  ctx.fillStyle = 'rgba(70,95,130,.35)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(160,200,255,.18)';
  ctx.stroke();

  if (grid) {
    ctx.globalCompositeOperation = 'lighter';
    const r = W * 0.0175;
    for (let lon = 0; lon < 360; lon++) {
      for (let lat = north ? 35 : -90; lat <= (north ? 90 : -35); lat++) {
        const v = grid.values[lon * 181 + lat + 90] ?? 0;
        if (v < 3) continue;
        const p = proj([lon > 180 ? lon - 360 : lon, lat]);
        if (!p) continue;
        const a = Math.min(1, v / 50);
        const c = v > 50 ? '255,122,138' : v > 25 ? '255,242,122' : '92,255,176';
        const g = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], r);
        g.addColorStop(0, `rgba(${c},${a * 0.55})`);
        g.addColorStop(1, `rgba(${c},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(p[0] - r, p[1] - r, 2 * r, 2 * r);
      }
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();

  ctx.beginPath();
  path({ type: 'Sphere' });
  ctx.strokeStyle = 'rgba(160,220,255,.18)';
  ctx.lineWidth = 2;
  ctx.stroke();

  const p = proj([here.lon, here.lat]);
  if (p) {
    ctx.beginPath();
    ctx.arc(p[0], p[1], 16, 0, 7);
    ctx.fillStyle = 'rgba(255,255,255,.12)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(p[0], p[1], 6, 0, 7);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.font = '600 24px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#e8f1ff';
    ctx.fillText(youLabel, p[0] + 16, p[1] + 8);
  }
}
