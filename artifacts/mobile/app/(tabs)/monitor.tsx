import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGetLiveData, getGetLiveDataQueryKey, useGetMonitoringHistory, getGetMonitoringHistoryQueryKey } from '@workspace/api-client-react';
import { Feather } from '@expo-vector-icons';

export default function MonitorScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  
  const { data: live, isLoading } = useGetLiveData({
    query: { refetchInterval: 2000, queryKey: getGetLiveDataQueryKey() }
  });
  
  const { data: history } = useGetMonitoringHistory({ limit: 50, hours: 24 }, {
    query: { refetchInterval: 10000, queryKey: getGetMonitoringHistoryQueryKey({ limit: 50, hours: 24 }) }
  });

  if (isLoading && !live) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const getStateColor = (state: string) => {
    switch (state) {
      case 'running': case 'normal': case 'closed': return colors.primary;
      case 'stopped': case 'open': return colors.mutedForeground;
      case 'starting': return colors.warning;
      case 'fault': case 'absent': case 'undervoltage': case 'overvoltage': return colors.destructive;
      default: return colors.mutedForeground;
    }
  };

  const MetricCard = ({ label, value, unit, icon, color }: { label: string, value: string | number, unit: string, icon: any, color: string }) => (
    <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
      <View style={styles.metricHeader}>
        <Feather name={icon} size={16} color={color} />
        <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>{label}</Text>
      </View>
      <View style={styles.metricValueContainer}>
        <Text style={[styles.metricValue, { color: colors.foreground, fontFamily: 'monospace' }]}>{value}</Text>
        <Text style={[styles.metricUnit, { color: colors.mutedForeground }]}>{unit}</Text>
      </View>
    </View>
  );

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: insets.top + 24, paddingBottom: 100, paddingHorizontal: 16 }}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>Live Telemetry</Text>
        <View style={styles.liveIndicator}>
          <View style={[styles.dot, { backgroundColor: colors.primary }]} />
          <Text style={[styles.liveText, { color: colors.primary }]}>LIVE</Text>
        </View>
      </View>

      <View style={[styles.stateRow, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
        <View style={styles.stateItem}>
          <Text style={[styles.stateLabel, { color: colors.mutedForeground }]}>MOTOR</Text>
          <Text style={[styles.stateValue, { color: getStateColor(live?.motorState || '') }]}>
            {(live?.motorState || 'N/A').toUpperCase()}
          </Text>
        </View>
        <View style={[styles.stateDivider, { backgroundColor: colors.border }]} />
        <View style={styles.stateItem}>
          <Text style={[styles.stateLabel, { color: colors.mutedForeground }]}>SUPPLY</Text>
          <Text style={[styles.stateValue, { color: getStateColor(live?.supplyState || '') }]}>
            {(live?.supplyState || 'N/A').toUpperCase()}
          </Text>
        </View>
        <View style={[styles.stateDivider, { backgroundColor: colors.border }]} />
        <View style={styles.stateItem}>
          <Text style={[styles.stateLabel, { color: colors.mutedForeground }]}>RELAY</Text>
          <Text style={[styles.stateValue, { color: getStateColor(live?.relayState || '') }]}>
            {(live?.relayState || 'N/A').toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.grid}>
        <MetricCard label="Voltage" value={live?.voltage.toFixed(1) || '--'} unit="V" icon="zap" color={colors.warning} />
        <MetricCard label="Current" value={live?.current.toFixed(1) || '--'} unit="A" icon="activity" color={colors.info} />
        <MetricCard label="Real Power" value={live?.realPower.toFixed(0) || '--'} unit="W" icon="cpu" color={colors.primary} />
        <MetricCard label="Power Factor" value={live?.powerFactor.toFixed(2) || '--'} unit="" icon="pie-chart" color={colors.mutedForeground} />
        <MetricCard label="Frequency" value={live?.frequency.toFixed(1) || '--'} unit="Hz" icon="radio" color={colors.mutedForeground} />
        <MetricCard label="Temperature" value={live?.internalTemp.toFixed(1) || '--'} unit="°C" icon="thermometer" color={colors.destructive} />
      </View>

      <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 24 }]}>Recent History</Text>
      <View style={[styles.historyContainer, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
        {history && history.length > 0 ? (
          history.slice(0, 10).map((point, index) => (
            <View key={index} style={[styles.historyRow, index > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
              <Text style={[styles.historyTime, { color: colors.mutedForeground, fontFamily: 'monospace' }]}>
                {new Date(point.timestamp).toLocaleTimeString([], { hour12: false })}
              </Text>
              <Text style={[styles.historyMetric, { color: colors.foreground }]}>{point.metric}</Text>
              <Text style={[styles.historyValue, { color: colors.foreground, fontFamily: 'monospace' }]}>{point.value.toFixed(2)}</Text>
            </View>
          ))
        ) : (
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No recent history available</Text>
        )}
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
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(32, 168, 104, 0.1)',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  liveText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    letterSpacing: 1,
  },
  stateRow: {
    flexDirection: 'row',
    borderWidth: 1,
    marginBottom: 24,
  },
  stateItem: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },
  stateDivider: {
    width: 1,
    height: '100%',
  },
  stateLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    letterSpacing: 1,
  },
  stateValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  metricCard: {
    width: '47%',
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metricLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
  },
  metricValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  metricUnit: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
  },
  sectionTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
    marginBottom: 16,
  },
  historyContainer: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  historyRow: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
  },
  historyTime: {
    flex: 1,
    fontSize: 12,
  },
  historyMetric: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
  },
  historyValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: 14,
  },
  emptyText: {
    padding: 16,
    textAlign: 'center',
    fontFamily: 'Inter_500Medium',
  },
});
