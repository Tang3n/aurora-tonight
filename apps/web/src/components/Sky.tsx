import { useEffect, useRef } from 'react';
import { createSky, type Sky as SkyHandle } from '../ui/sky';

/** Full-screen WebGL "living sky"; brightness follows the score (ui/sky.ts eases towards it). */
export function Sky({ score }: { score: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const sky = useRef<SkyHandle | null>(null);
  useEffect(() => {
    if (canvas.current && !sky.current) sky.current = createSky(canvas.current);
  }, []);
  useEffect(() => {
    sky.current?.setScore(score);
  }, [score]);
  return <canvas id="sky" ref={canvas} aria-hidden="true" />;
}

export function Ridge() {
  return (
    <svg className="ridge" viewBox="0 0 1440 220" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#050912" />
          <stop offset="1" stopColor="#02040a" />
        </linearGradient>
      </defs>
      <path fill="#071020" opacity=".9" d="M0 150 L80 120 L170 138 L260 96 L330 112 L420 70 L470 86 L540 60 L610 98 L700 84 L790 118 L880 92 L960 110 L1040 74 L1120 96 L1200 64 L1290 100 L1370 88 L1440 110 L1440 220 L0 220Z" />
      <path fill="url(#rg)" d="M0 180 L120 150 L210 166 L300 128 L380 150 L460 120 L560 158 L650 140 L740 166 L860 136 L960 160 L1060 128 L1160 156 L1260 134 L1360 160 L1440 146 L1440 220 L0 220Z" />
    </svg>
  );
}
