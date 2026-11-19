/**
 * Static "living sky" behind the Tonight screen, from the mock: green and violet glow at the top and a
 * mountain ridge. The glow gets stronger with the score, so a bad night looks darker. (The animated
 * WebGL curtains of the website would need Skia; this is the lightweight version.)
 */
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

export function SkyBackground({ score, height = 420 }: { score: number; height?: number }) {
  const k = 0.6 + 0.4 * Math.min(1, Math.max(0, score) / 60);
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { height }]}>
      <Svg width="100%" height={height} viewBox="0 0 390 420" preserveAspectRatio="xMidYMin slice">
        <Defs>
          <RadialGradient id="green" cx="30%" cy="0%" rx="80%" ry="70%">
            <Stop offset="0" stopColor="#5cffb0" stopOpacity={0.42 * k} />
            <Stop offset="1" stopColor="#5cffb0" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="violet" cx="85%" cy="8%" rx="55%" ry="50%">
            <Stop offset="0" stopColor="#b48cff" stopOpacity={0.3 * k} />
            <Stop offset="1" stopColor="#b48cff" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="390" height="420" fill="url(#green)" />
        <Rect width="390" height="420" fill="url(#violet)" />
        <Path d="M0 420 L0 222 L40 204 L80 218 L120 190 L160 212 L205 182 L250 210 L300 196 L340 214 L390 202 L390 420 Z" fill="#070c18" opacity={0.9} />
      </Svg>
    </View>
  );
}
