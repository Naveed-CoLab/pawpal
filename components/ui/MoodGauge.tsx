import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, G, Line, Circle, Text as SvgText } from 'react-native-svg';
import { Colors } from '@/constants/Colors';

interface MoodGaugeProps {
  score: number; // 0-100
}

export const MoodGauge: React.FC<MoodGaugeProps> = ({ score }) => {
  const clamped = Math.max(0, Math.min(100, score));
  const angle = (clamped / 100) * 180 - 90; // -90 to 90
  const pointerRotate = angle; // rotate around 100,95

  const valueColor = clamped < 40 ? '#ef4444' : clamped < 70 ? '#f97316' : '#22c55e';

  return (
    <View style={styles.container}>
      <Svg viewBox="0 0 200 115" width="100%" height={115}>
        {/* Background arc */}
        <Path d="M 20 95 A 80 80 0 0 1 180 95" fill="none" stroke="#e5e7eb" strokeWidth={20} strokeLinecap="round" />
        {/* Poor (red) */}
        <Path d="M 20 95 A 80 80 0 0 1 73.33 35" fill="none" stroke="#ef4444" strokeWidth={20} strokeLinecap="round" />
        {/* Fair (orange) */}
        <Path d="M 73.33 35 A 80 80 0 0 1 126.67 35" fill="none" stroke="#f97316" strokeWidth={20} strokeLinecap="round" />
        {/* Good (green) */}
        <Path d="M 126.67 35 A 80 80 0 0 1 180 95" fill="none" stroke="#22c55e" strokeWidth={20} strokeLinecap="round" />

        {/* Pointer */}
        <G transform={`rotate(${pointerRotate} 100 95)`}>
          <Line x1={100} y1={95} x2={100} y2={25} stroke={valueColor} strokeWidth={4} strokeLinecap="round" />
          <Circle cx={100} cy={95} r={8} fill={valueColor} />
        </G>

        {/* Center bubble */}
        <G>
          <Circle cx={100} cy={80} r={32} fill="white" opacity={0.9} />
          <Circle cx={100} cy={80} r={32} fill="black" opacity={0.05} />
          <SvgText x={100} y={83} textAnchor="middle" fontSize={32} fontWeight="700" fill={valueColor}>{clamped}</SvgText>
          <SvgText x={100} y={98} textAnchor="middle" fontSize={12} opacity={0.6} fill="#6b7280">/100</SvgText>
        </G>
      </Svg>

      <View style={styles.labelsRow}>
        <Text style={styles.poor} numberOfLines={1} adjustsFontSizeToFit>
          Poor
        </Text>
        <Text style={styles.fair} numberOfLines={1} adjustsFontSizeToFit>
          Fair
        </Text>
        <Text style={styles.good} numberOfLines={1} adjustsFontSizeToFit>
          Good
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingHorizontal: 12,
    minHeight: 24,
  },
  poor: {
    color: '#ef4444',
    fontSize: 12,
    minWidth: 36,
    textAlign: 'left',
  },
  fair: {
    color: '#f97316',
    fontSize: 12,
    minWidth: 36,
    textAlign: 'center',
  },
  good: {
    color: '#16a34a',
    fontSize: 14,
    fontWeight: '700',
    minWidth: 42,
    textAlign: 'right',
  },
});


