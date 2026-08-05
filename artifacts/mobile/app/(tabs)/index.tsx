import React from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGetDashboardSummary, getGetDashboardSummaryQueryKey, useGetHealthScore, getGetHealthScoreQueryKey } from '@workspace/api-client-react';
import { Feather } from '@expo/vector-icons';
import { Svg, Circle } from 'react-native-svg';

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  
  const { data: summary, isLoading: loadingSummary, refetch: refetchSummary, isRefetching: refetchingSummary } = useGetDashboardSummary({
    query: { refetchInterval: 10000, queryKey: getGetDashboardSummaryQueryKey() }
  });
  
  const { data: health, isLoading: loadingHealth, refetch: refetchHealth, isRefetching: refetchingHealth } = useGetHealthScore({
    query: { refetchInterval: 10000, queryKey: getGetHealthScoreQueryKey() }
  });

  const onRefresh = React.useCallback(() => {
    refetchSummary();
    refetchHealth();
  }, [refetchSummary, refetchHealth]);

  const isLoading = loadingSummary || loadingHealth;
  const isRefreshing = refetchingSummary || refetchingHealth;

  if (isLoading && !summary) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Health Score Circular Progress
  const score = health?.overall ?? 0;
  const radius = 60;
  const strokeWidth = 12;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const getHealthColor = (s: number) => {
    if (s >= 80) return colors.primary;
    if (s >= 60) return colors.warning;
    return colors.destructive;
  };

  const getPumpStateColor = (state: string) => {
    switch (state) {
      case 'running': return colors.primary;
      case 'stopped': return colors.mutedForeground;
      case 'fault': return colors.destructive;
      case 'starting':
      case 'stopping': return colors.warning;
      default: return colors.mutedForeground;
    }
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: insets.top + 24, paddingBottom: 100, paddingHorizontal: 16 }}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>Dashboard</Text>
        <View style={[styles.statusBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.statusDot, { backgroundColor: getPumpStateColor(summary?.pumpState || '') }]} />
          <Text style={[styles.statusText, { color: colors.foreground }]}>
            {(summary?.pumpState || 'Unknown').toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.mainGrid}>
        <View style={[styles.healthCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <Text style={[styles.cardTitle, { color: colors.mutedForeground }]}>Health Score</Text>
          <View style={styles.healthScoreContainer}>
            <Svg height="160" width="160" viewBox="0 0 160 160">
              <Circle
                cx="80"
                cy="80"
                r={radius}
                stroke={colors.muted}
                strokeWidth={strokeWidth}
                fill="none"
              />
              <Circle
                cx="80"
                cy="80"
                r={radius}
                stroke={getHealthColor(score)}
                strokeWidth={strokeWidth}
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                transform="rotate(-90 80 80)"
              />
            </Svg>
            <View style={styles.scoreTextContainer}>
              <Text style={[styles.scoreText, { color: colors.foreground }]}>{score}</Text>
            </View>
          </View>
          <Text style={[styles.trendText, { color: colors.mutedForeground }]}>
            Trend: {health?.trend.toUpperCase()}
          </Text>
        </View>

        <View style={styles.statsColumn}>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <Feather name="clock" size={20} color={colors.primary} />
            <View>
              <Text style={[styles.statValue, { color: colors.foreground }]}>{summary?.todayRuntime.toFixed(1)}h</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Runtime Today</Text>
            </View>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <Feather name="zap" size={20} color={colors.warning} />
            <View>
              <Text style={[styles.statValue, { color: colors.foreground }]}>{summary?.todayEnergy.toFixed(1)} kWh</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Energy Today</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.row}>
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, flex: 1 }]}>
          <View style={[styles.iconBox, { backgroundColor: colors.destructive + '20' }]}>
            <Feather name="alert-triangle" size={24} color={colors.destructive} />
          </View>
          <Text style={[styles.infoValue, { color: colors.foreground }]}>{summary?.activeNotifications || 0}</Text>
          <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Active Alerts</Text>
        </View>

        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, flex: 1 }]}>
          <View style={[styles.iconBox, { backgroundColor: colors.info + '20' }]}>
            <Feather name="activity" size={24} color={colors.info} />
          </View>
          <Text style={[styles.infoValue, { color: colors.foreground }]}>{summary?.learningConfidence ?? 0}%</Text>
          <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Learning Conf.</Text>
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>System Status</Text>
        <View style={styles.statusRow}>
          <Text style={[styles.statusLabel, { color: colors.mutedForeground }]}>Controller</Text>
          <Text style={[styles.statusValue, { color: summary?.controllerOnline ? colors.primary : colors.destructive }]}>
            {summary?.controllerOnline ? 'ONLINE' : 'OFFLINE'}
          </Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={[styles.statusLabel, { color: colors.mutedForeground }]}>Power Available</Text>
          <Text style={[styles.statusValue, { color: summary?.powerAvailable ? colors.primary : colors.destructive }]}>
            {summary?.powerAvailable ? 'YES' : 'NO'}
          </Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={[styles.statusLabel, { color: colors.mutedForeground }]}>Internet</Text>
          <Text style={[styles.statusValue, { color: summary?.internetStatus ? colors.primary : colors.destructive }]}>
            {summary?.internetStatus ? 'CONNECTED' : 'DISCONNECTED'}
          </Text>
        </View>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderRadius: 20,
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  mainGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  healthCard: {
    flex: 1,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
  },
  cardTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    marginBottom: 16,
  },
  healthScoreContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreTextContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 36,
  },
  trendText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    marginTop: 16,
  },
  statsColumn: {
    flex: 1,
    gap: 16,
  },
  statCard: {
    flex: 1,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    justifyContent: 'center',
  },
  statValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    marginBottom: 4,
  },
  statLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  infoCard: {
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  infoValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
  },
  infoLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  section: {
    borderWidth: 1,
    padding: 16,
    gap: 16,
  },
  sectionTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
  },
  statusValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
  },
});
