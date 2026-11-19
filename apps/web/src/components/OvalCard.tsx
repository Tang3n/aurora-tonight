import type { Strings } from '@aurora/core/i18n';
import type { Location } from '@aurora/data/sources';
import type { OvationGrid } from '@aurora/model/ovation';
import { useEffect, useRef } from 'react';
import { drawOval } from '../ui/ovalMap';

export function OvalCard({ S, grid, loc, now }: { S: Strings; grid: OvationGrid | null; loc: Location; now: Date }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (canvas.current) drawOval(canvas.current, grid, loc, S.you);
  }, [grid, loc, S]);

  const minutes = grid ? Math.max(0, Math.round((grid.forecast.getTime() - now.getTime()) / 60_000)) : 60;
  return (
    <div className="card map">
      <div className="map-head">
        <div className="eyebrow">{S.oval(minutes)}</div>
        <div className="legend" style={{ width: 120 }}>
          <span>{S.low}</span>
          <span className="bar" />
          <span>{S.high}</span>
        </div>
      </div>
      <canvas ref={canvas} width={800} height={800} role="img" aria-label={S.oval(minutes)} />
    </div>
  );
}
