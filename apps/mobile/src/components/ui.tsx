import { richText } from '@aurora/core/view';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type ColorValue, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { C, F, scoreColors } from '../theme';

export function Card({ children, style, accent }: { children: ReactNode; style?: StyleProp<ViewStyle>; accent?: boolean }) {
  return <View style={[s.card, accent && s.cardAccent, style]}>{children}</View>;
}

export function Eyebrow({ children, color }: { children: ReactNode; color?: string }) {
  return <Text style={[s.eyebrow, color ? { color } : null]}>{children}</Text>;
}

/** Text from our translations with <b> emphasis (see richText in packages/core). */
export function RichText({ text, style, boldColor = C.aurora }: { text: string; style?: StyleProp<TextStyle>; boldColor?: string }) {
  return (
    <Text style={style}>
      {richText(text).map((p, i) =>
        p.bold ? (
          <Text key={i} style={{ fontFamily: F.bodySemi, color: boldColor }}>
            {p.text}
          </Text>
        ) : (
          p.text
        ),
      )}
    </Text>
  );
}

export function ScoreBadge({ score, size = 44 }: { score: number; size?: number }) {
  const c = scoreColors(score);
  return (
    <View style={[s.badge, { width: size, height: size, backgroundColor: c.bg }]}>
      <Text style={{ color: c.fg, fontSize: size * 0.42, fontFamily: F.num }}>{score}</Text>
    </View>
  );
}

export function Chip({ label, on, onPress }: { label: string; on: boolean; onPress(): void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      style={[s.chip, on && { backgroundColor: C.aurora, borderColor: C.aurora }]}
    >
      <Text style={{ color: on ? '#04120b' : '#c9d6ea', fontFamily: F.bodyMed, fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
}

export function SectionTitle({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <View style={s.sectionHead}>
      <Text style={s.sectionTitle}>{children}</Text>
      {hint ? <Text style={s.hint}>{hint}</Text> : null}
    </View>
  );
}

type IconName = 'moon' | 'compass' | 'bell' | 'pin' | 'chevron';

export function Icon({ name, color = C.text, size = 22 }: { name: IconName; color?: ColorValue; size?: number }) {
  const common = { fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'moon' ? <Path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z" {...common} /> : null}
      {name === 'compass' ? <Path d="M3 11l18-8-8 18-2-8z" {...common} /> : null}
      {name === 'bell' ? (
        <>
          <Path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8" {...common} />
          <Path d="M10 21a2 2 0 0 0 4 0" {...common} />
        </>
      ) : null}
      {name === 'pin' ? (
        <>
          <Path d="M12 21s-7-6.3-7-11.5A7 7 0 0 1 19 9.5C19 14.7 12 21 12 21z" {...common} />
          <Circle cx="12" cy="9.5" r="2.5" {...common} />
        </>
      ) : null}
      {name === 'chevron' ? <Path d="M9 6l6 6-6 6" {...common} /> : null}
    </Svg>
  );
}

export const s = StyleSheet.create({
  card: { backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 20, padding: 16 },
  cardAccent: { borderColor: 'rgba(92,255,176,0.35)', backgroundColor: 'rgba(16,40,34,0.85)' },
  eyebrow: { color: C.muted, fontSize: 11, fontFamily: F.bodyMed, letterSpacing: 1.3, textTransform: 'uppercase' },
  badge: { borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  chip: { minHeight: 40, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(160,220,255,0.16)', backgroundColor: 'rgba(14,22,40,0.92)', justifyContent: 'center' },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginBottom: 12, flexWrap: 'wrap' },
  sectionTitle: { color: C.text, fontSize: 17, fontFamily: F.numSemi },
  hint: { color: C.muted, fontSize: 12, fontFamily: F.body },
  body: { color: C.text, fontSize: 15, lineHeight: 22, fontFamily: F.body },
  muted: { color: C.muted, fontSize: 13, lineHeight: 19, fontFamily: F.body },
});
