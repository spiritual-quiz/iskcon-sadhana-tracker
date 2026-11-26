import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import Svg, { Path, Circle, Line, Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';
import { SadhanaEntry } from '../types/sadhana';
import { Ionicons } from '@expo/vector-icons';

interface ProgressTrendsChartProps {
  entries: SadhanaEntry[];
}

type MetricType = 'wakeup' | 'japa' | 'reading';

export const ProgressTrendsChart: React.FC<ProgressTrendsChartProps> = ({ entries }) => {
  const { theme } = useTheme();
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('japa');
  const [activePointIndex, setActivePointIndex] = useState<number | null>(null);

  // Take up to 30 past entries sorted ascending
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date)).slice(-30);

  const screenWidth = Dimensions.get('window').width;
  const chartWidth = Math.min(screenWidth - 48, 380);
  const chartHeight = 160;
  const paddingX = 24;
  const paddingY = 24;

  if (sorted.length < 2) {
    return (
      <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <Text style={[styles.title, { color: theme.thickColor }]}>30-Day Sadhana Trends</Text>
        <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
          Submit at least 2 daily entries to visualize your 30-day spiritual growth curve.
        </Text>
      </View>
    );
  }

  // Extract numeric points based on selected metric
  const points = sorted.map((e) => {
    if (selectedMetric === 'wakeup') {
      const time = e.wakeUpTimeStr || '06:00';
      const [h, m] = time.split(':').map((v: string) => parseInt(v, 10) || 0);
      return {
        date: e.date,
        val: h + m / 60, // e.g. 4.5 for 4:30 AM
        display: time,
      };
    } else if (selectedMetric === 'japa') {
      const rounds = e.completedRounds || 0;
      return {
        date: e.date,
        val: rounds,
        display: `${rounds} rounds`,
      };
    } else {
      const mins = e.readingMinutes || 0;
      return {
        date: e.date,
        val: mins,
        display: `${mins} mins`,
      };
    }
  });

  const values = points.map((p) => p.val);
  const minVal = selectedMetric === 'wakeup' ? 3.5 : 0;
  const maxVal = Math.max(...values, selectedMetric === 'japa' ? 16 : selectedMetric === 'wakeup' ? 8 : 45);

  const effectiveWidth = chartWidth - paddingX * 2;
  const effectiveHeight = chartHeight - paddingY * 2;

  // Coordinate mapping
  const getCoords = (idx: number, val: number) => {
    const x = paddingX + (idx / (points.length - 1)) * effectiveWidth;
    let norm = (val - minVal) / (maxVal - minVal || 1);
    norm = Math.max(0, Math.min(1, norm));
    // For wake-up: earlier wake-up (lower value like 4am) should be higher up on chart
    const y =
      selectedMetric === 'wakeup'
        ? paddingY + norm * effectiveHeight
        : paddingY + (1 - norm) * effectiveHeight;
    return { x, y };
  };

  const coords = points.map((p, idx) => getCoords(idx, p.val));

  // Build SVG path
  let pathD = `M ${coords[0].x} ${coords[0].y}`;
  for (let i = 1; i < coords.length; i++) {
    pathD += ` L ${coords[i].x} ${coords[i].y}`;
  }

  // Gradient fill area
  const fillD = `${pathD} L ${coords[coords.length - 1].x} ${chartHeight - paddingY} L ${coords[0].x} ${
    chartHeight - paddingY
  } Z`;

  const metricColor =
    selectedMetric === 'japa'
      ? '#D97706'
      : selectedMetric === 'wakeup'
      ? '#059669'
      : '#7C3AED';

  const averageVal = Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
  const avgDisplay =
    selectedMetric === 'wakeup'
      ? `${Math.floor(averageVal)}:${String(Math.round((averageVal % 1) * 60)).padStart(2, '0')} AM`
      : selectedMetric === 'japa'
      ? `${averageVal} rounds/day`
      : `${Math.round(averageVal)} mins/day`;

  const activePoint = activePointIndex !== null ? points[activePointIndex] : null;

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      {/* Title & Tabs */}
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.title, { color: theme.thickColor }]}>30-Day Progress Trends</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
            Average: <Text style={{ fontWeight: '700', color: metricColor }}>{avgDisplay}</Text>
          </Text>
        </View>

        {activePoint && (
          <View style={[styles.tooltipPill, { backgroundColor: `${metricColor}20` }]}>
            <Text style={[styles.tooltipText, { color: metricColor }]}>
              {activePoint.date.slice(5)}: {activePoint.display}
            </Text>
          </View>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[
            styles.tabBtn,
            selectedMetric === 'japa' && { backgroundColor: '#FEF3C7', borderColor: '#D97706' },
          ]}
          onPress={() => {
            setSelectedMetric('japa');
            setActivePointIndex(null);
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="sparkles" size={12} color={selectedMetric === 'japa' ? '#D97706' : '#64748B'} />
          <Text style={[styles.tabBtnText, { color: selectedMetric === 'japa' ? '#92400E' : '#64748B' }]}>
            Japa
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabBtn,
            selectedMetric === 'wakeup' && { backgroundColor: '#DCFCE7', borderColor: '#059669' },
          ]}
          onPress={() => {
            setSelectedMetric('wakeup');
            setActivePointIndex(null);
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="sunny" size={12} color={selectedMetric === 'wakeup' ? '#059669' : '#64748B'} />
          <Text style={[styles.tabBtnText, { color: selectedMetric === 'wakeup' ? '#065F46' : '#64748B' }]}>
            Wake-up
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabBtn,
            selectedMetric === 'reading' && { backgroundColor: '#EDE9FE', borderColor: '#7C3AED' },
          ]}
          onPress={() => {
            setSelectedMetric('reading');
            setActivePointIndex(null);
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="book" size={12} color={selectedMetric === 'reading' ? '#7C3AED' : '#64748B'} />
          <Text style={[styles.tabBtnText, { color: selectedMetric === 'reading' ? '#5B21B6' : '#64748B' }]}>
            Reading
          </Text>
        </TouchableOpacity>
      </View>

      {/* SVG Chart */}
      <View style={styles.chartWrapper}>
        <Svg width={chartWidth} height={chartHeight}>
          <Defs>
            <LinearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={metricColor} stopOpacity="0.35" />
              <Stop offset="100%" stopColor={metricColor} stopOpacity="0.0" />
            </LinearGradient>
          </Defs>

          {/* Baseline */}
          <Line
            x1={paddingX}
            y1={chartHeight - paddingY}
            x2={chartWidth - paddingX}
            y2={chartHeight - paddingY}
            stroke="#CBD5E1"
            strokeWidth="1"
            strokeDasharray="4,4"
          />

          {/* Area under curve */}
          <Path d={fillD} fill="url(#curveGradient)" />

          {/* Line curve */}
          <Path d={pathD} stroke={metricColor} strokeWidth="2.5" fill="none" strokeLinecap="round" />

          {/* Data Circles */}
          {coords.map((c, i) => (
            <Circle
              key={i}
              cx={c.x}
              cy={c.y}
              r={activePointIndex === i ? 6 : 3.5}
              fill={activePointIndex === i ? '#FFFFFF' : metricColor}
              stroke={metricColor}
              strokeWidth={activePointIndex === i ? 2.5 : 1.5}
              onPress={() => setActivePointIndex(i)}
            />
          ))}

          {/* First & Last Date Labels */}
          <SvgText
            x={paddingX}
            y={chartHeight - 6}
            fontSize="9"
            fill="#94A3B8"
            fontWeight="bold"
            textAnchor="start"
          >
            {sorted[0].date.slice(5)}
          </SvgText>

          <SvgText
            x={chartWidth - paddingX}
            y={chartHeight - 6}
            fontSize="9"
            fill="#94A3B8"
            fontWeight="bold"
            textAnchor="end"
          >
            {sorted[sorted.length - 1].date.slice(5)}
          </SvgText>
        </Svg>
      </View>

      <Text style={[styles.hintText, { color: theme.colors.textMuted }]}>
        Tap any point on the curve to inspect date and daily achievement.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  tooltipPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tooltipText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  chartWrapper: {
    alignItems: 'center',
    marginVertical: 4,
  },
  hintText: {
    fontSize: 9.5,
    textAlign: 'center',
    marginTop: 2,
  },
  emptyText: {
    fontSize: 11,
    fontStyle: 'italic',
    paddingVertical: 12,
  },
});
