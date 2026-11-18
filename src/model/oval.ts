/**
 * Equatorward boundary of the auroral oval from Kp and magnetic local time.
 *
 * Starkov (1994), coefficients as published in Sigernes et al. (2011), Óptica Pura y Aplicada
 * 44(4) 599, Table 1 — the model behind the KHO/UNIS (Svalbard) oval forecast.
 *
 *   AL = 18 − 12.3·Kp + 27.2·Kp² − 2·Kp³
 *   each of A0..A3, α1..α3 = b0 + b1·x + b2·x² + b3·x³,   x = log10|AL|
 *   colatitude = A0 + A1·cos(15(t+α1)) + A2·cos(15(2t+α2)) + A3·cos(15(3t+α3))   [t = MLT h, cos in °]
 *
 * The boundary is in corrected geomagnetic latitude. At magnetic midnight the diffuse boundary
 * follows NOAA's rule of thumb "66° − 2° per Kp" almost exactly.
 */

type Row = [number, number, number, number];
/** Rows: A0, A1, A2, A3, α1, α2, α3; columns: b0..b3. */
const STARKOV: Record<'discrete' | 'diffuse', Row[]> = {
  discrete: [
    [1.61, 23.21, -10.97, 2.03],
    [-9.59, 17.78, -7.2, 0.96],
    [-12.07, 17.49, -7.96, 1.15],
    [-6.56, 11.44, -6.73, 1.31],
    [-2.22, 1.5, -0.58, 0.08],
    [-23.98, 42.79, -26.96, 5.56],
    [-20.07, 36.67, -24.2, 5.11],
  ],
  diffuse: [
    [3.44, 29.77, -16.38, 3.35],
    [-2.41, 7.89, -4.32, 0.87],
    [-0.74, 3.94, -3.09, 0.72],
    [-2.12, 3.24, -1.67, 0.31],
    [-1.68, -2.48, 1.58, -0.28],
    [8.69, -20.73, 13.03, -2.14],
    [8.61, -5.34, -1.36, 0.76],
  ],
};

export type Boundary = keyof typeof STARKOV;

/** Above this the Kp→AL cubic flattens (peaks at Kp ≈ 9.07), so we extrapolate linearly instead. */
const KP_LINEAR_FROM = 7;
const DEG_PER_KP_ABOVE = 2;

const cosDeg = (x: number) => Math.cos((x * Math.PI) / 180);

/** Magnetic latitude (degrees, positive) of the equatorward boundary. */
export function ovalBoundary(kp: number, mlt: number, kind: Boundary): number {
  if (kp > KP_LINEAR_FROM) return ovalBoundary(KP_LINEAR_FROM, mlt, kind) - DEG_PER_KP_ABOVE * (kp - KP_LINEAR_FROM);
  const k = Math.max(0, kp);
  const AL = 18 - 12.3 * k + 27.2 * k * k - 2 * k ** 3;
  const x = Math.log10(Math.abs(AL));
  const c = STARKOV[kind].map(([b0, b1, b2, b3]) => b0 + b1 * x + b2 * x * x + b3 * x ** 3) as [
    number, number, number, number, number, number, number,
  ];
  const colat = c[0] + c[1] * cosDeg(15 * (mlt + c[4])) + c[2] * cosDeg(15 * (2 * mlt + c[5])) + c[3] * cosDeg(15 * (3 * mlt + c[6]));
  return 90 - colat;
}
