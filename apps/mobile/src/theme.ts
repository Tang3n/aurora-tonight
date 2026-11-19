/** "Living sky" tokens, the same values as the web (apps/web/src/styles.css). */
export const C = {
  bg: '#04070f',
  card: 'rgba(14,22,40,0.85)',
  cardStrong: '#0e1628',
  border: 'rgba(160,220,255,0.12)',
  text: '#e8f1ff',
  muted: '#93a3bc',
  faint: '#6b7a93',
  aurora: '#5cffb0',
  cyan: '#39d0ff',
  violet: '#b48cff',
  warn: '#ffc56b',
  bad: '#ff7a8a',
  slate: '#3a4d6b',
} as const;

/** Badge colours for a 0–100 eye score, as on the web. */
export function scoreColors(score: number): { bg: string; fg: string } {
  if (score >= 50) return { bg: C.aurora, fg: '#04120b' };
  if (score >= 30) return { bg: C.warn, fg: '#1a1204' };
  return { bg: C.slate, fg: C.text };
}

/** Where the website serves the spots JSON (ADR 7); the app reads the same files. */
export const SPOTS_BASE_URL = 'https://tang3n.github.io/aurora-tonight/';
