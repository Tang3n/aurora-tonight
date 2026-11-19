/** Colour class for a 0–100 eye score, shared by badges, chips and map markers. */
export type ScoreTone = 'hi' | 'mid' | 'lo';

export function scoreTone(score: number): ScoreTone {
  return score >= 50 ? 'hi' : score >= 30 ? 'mid' : 'lo';
}

export const TONE_FILL: Record<ScoreTone, string> = { hi: '#5cffb0', mid: '#ffc56b', lo: '#3a4d6b' };
export const TONE_TEXT: Record<ScoreTone, string> = { hi: '#04120b', mid: '#1a1204', lo: '#e8f1ff' };
