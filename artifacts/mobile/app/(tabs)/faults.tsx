import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Modal, ScrollView } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGetFaults, getGetFaultsQueryKey, useGetFaultSummary, getGetFaultSummaryQueryKey, Fault } from '@workspace/api-client-react';
import { Feather } from '@expo/vector-icons';

export default function FaultsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  
  const [selectedFault, setSelectedFault] = useState<Fault | null>(null);

  const { data: faults, isLoading: loadingFaults, refetch: refetchFaults, isRefetching } = useGetFaults({ active: true }, {
    query: { refetchInterval: 30000, queryKey: getGetFaultsQueryKey({ active: true }) }
  });
  
  const { data: summary } = useGetFaultSummary({
    query: { refetchInterval: 30000, queryKey: getGetFaultSummaryQueryKey() }
  });

  const onRefresh = React.useCallback(() => {
    refetchFaults();
  }, [refetchFaults]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return colors.destructive;
      case 'high':
      case 'major': return colors.warning;
      case 'medium':
      case 'minor': return '#eab308'; // yellow
      case 'info':
      case 'low': return colors.info;
      default: return colors.mutedForeground;
    }
  };

  const renderFaultItem = ({ item }: { item: Fault }) => {
    const sevColor = getSeverityColor(item.severity);
    return (
      <TouchableOpacity 
        style={[styles.faultItem, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}
        onPress={() => setSelectedFault(item)}
      >
        <View style={[styles.severityStrip, { backgroundColor: sevColor }]} />
        <View style={styles.faultContent}>
          <View style={styles.faultHeader}>
            <Text style={[styles.faultCode, { color: colors.foreground }]}>{item.type.replace(/_/g, ' ').toUpperCase()}</Text>
            <Text style={[styles.faultTime, { color: colors.mutedForeground }]}>
              {new Date(item.firstSeen || item.lastSeen || new Date()).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          <Text style={[styles.faultMessage, { color: colors.mutedForeground }]} numberOfLines={2}>
            {item.cause || item.description || 'No description available'}
          </Text>
          <View style={styles.faultFooter}>
            <View style={[styles.badge, { backgroundColor: sevColor + '20' }]}>
              <Text style={[styles.badgeText, { color: sevColor }]}>{item.severity.toUpperCase()}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: item.isActive ? colors.destructive + '20' : colors.primary + '20' }]}>
              <Text style={[styles.badgeText, { color: item.isActive ? colors.destructive : colors.primary }]}>
                {item.isActive ? 'ACTIVE' : 'RESOLVED'}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const ListHeader = () => (
    <View style={styles.headerContainer}>
      <Text style={[styles.title, { color: colors.foreground }]}>Faults</Text>
      
      {summary && (
        <View style={[styles.summaryGrid, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: colors.destructive }]}>{summary.bySeverity?.critical || 0}</Text>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Critical</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: colors.warning }]}>{summary.bySeverity?.high || 0}</Text>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>High</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: '#eab308' }]}>{summary.bySeverity?.medium || 0}</Text>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Medium</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: colors.info }]}>{summary.bySeverity?.low || 0}</Text>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Low</Text>
          </View>
        </View>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {loadingFaults && !faults ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={faults}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderFaultItem}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="check-circle" size={48} color={colors.primary} style={{ marginBottom: 16 }} />
              <Text style={[styles.emptyText, { color: colors.foreground }]}>System clear</Text>
              <Text style={[styles.emptySubText, { color: colors.mutedForeground }]}>No active faults detected</Text>
            </View>
          }
        />
      )}

      {/* Fault Detail Modal */}
      <Modal
        visible={!!selectedFault}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setSelectedFault(null)}
      >
        {selectedFault && (
          <View style={[styles.modalContainer, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Fault Details</Text>
              <TouchableOpacity onPress={() => setSelectedFault(null)} style={styles.closeBtn}>
                <Feather name="x" size={24} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              <View style={[styles.modalSection, { borderBottomColor: colors.border }]}>
                <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>TYPE</Text>
                <Text style={[styles.modalValue, { color: colors.foreground }]}>{selectedFault.type.replace(/_/g, ' ').toUpperCase()}</Text>
              </View>
              <View style={[styles.modalSection, { borderBottomColor: colors.border }]}>
                <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>SEVERITY</Text>
                <Text style={[styles.modalValue, { color: getSeverityColor(selectedFault.severity) }]}>{selectedFault.severity.toUpperCase()}</Text>
              </View>
              <View style={[styles.modalSection, { borderBottomColor: colors.border }]}>
                <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>CAUSE</Text>
                <Text style={[styles.modalValue, { color: colors.foreground }]}>{selectedFault.cause}</Text>
              </View>
              <View style={[styles.modalSection, { borderBottomColor: colors.border }]}>
                <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>RECOMMENDED ACTION</Text>
                <Text style={[styles.modalValue, { color: colors.foreground }]}>{selectedFault.recommendedAction}</Text>
              </View>
              <View style={[styles.modalSection, { borderBottomColor: colors.border }]}>
                <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>FIRST SEEN</Text>
                <Text style={[styles.modalValue, { color: colors.foreground }]}>{new Date(selectedFault.firstSeen).toLocaleString()}</Text>
              </View>
              <View style={[styles.modalSection, { borderBottomColor: colors.border, borderBottomWidth: 0 }]}>
                <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>OCCURRENCES</Text>
                <Text style={[styles.modalValue, { color: colors.foreground }]}>{selectedFault.occurrences}</Text>
              </View>
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerContainer: { marginBottom: 24 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 28, marginBottom: 16 },
  summaryGrid: { flexDirection: 'row', borderWidth: 1, padding: 16, justifyContent: 'space-between' },
  summaryItem: { alignItems: 'center' },
  summaryValue: { fontFamily: 'Inter_700Bold', fontSize: 24, marginBottom: 4 },
  summaryLabel: { fontFamily: 'Inter_500Medium', fontSize: 12 },
  faultItem: { flexDirection: 'row', borderWidth: 1, overflow: 'hidden' },
  severityStrip: { width: 6 },
  faultContent: { flex: 1, padding: 16 },
  faultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  faultCode: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  faultTime: { fontFamily: 'Inter_500Medium', fontSize: 12 },
  faultMessage: { fontFamily: 'Inter_400Regular', fontSize: 14, marginBottom: 12, lineHeight: 20 },
  faultFooter: { flexDirection: 'row', gap: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontFamily: 'Inter_600SemiBold', fontSize: 10, letterSpacing: 0.5 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 64 },
  emptyText: { fontFamily: 'Inter_700Bold', fontSize: 20, marginBottom: 8 },
  emptySubText: { fontFamily: 'Inter_500Medium', fontSize: 14 },
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#28343f' },
  modalTitle: { fontFamily: 'Inter_700Bold', fontSize: 20 },
  closeBtn: { padding: 4 },
  modalContent: { padding: 20 },
  modalSection: { paddingVertical: 16, borderBottomWidth: 1 },
  modalLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 12, marginBottom: 8, letterSpacing: 1 },
  modalValue: { fontFamily: 'Inter_500Medium', fontSize: 16, lineHeight: 24 },
});
