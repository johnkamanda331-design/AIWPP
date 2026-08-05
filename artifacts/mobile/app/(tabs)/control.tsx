import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGetCurrentUser, useSendControlCommand, ControlCommandInputAction } from '@workspace/api-client-react';
import { Feather } from '@expo/vector-icons';

export default function ControlScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  
  const { data: user } = useGetCurrentUser();
  const sendCommand = useSendControlCommand();
  const [activeCommand, setActiveCommand] = useState<string | null>(null);

  const isViewer = user?.role === 'viewer';

  const handleCommand = (command: ControlCommandInputAction, title: string, isDestructive: boolean = false) => {
    if (isViewer) return;

    Alert.alert(
      `Confirm ${title}`,
      `Are you sure you want to execute ${title.toLowerCase()}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Execute', 
          style: isDestructive ? 'destructive' : 'default',
          onPress: async () => {
            setActiveCommand(command);
            try {
              await sendCommand.mutateAsync({ data: { action: command } });
              Alert.alert('Success', `Command ${title.toLowerCase()} sent successfully.`);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to send command.');
            } finally {
              setActiveCommand(null);
            }
          }
        }
      ]
    );
  };

  const ControlButton = ({ action, title, icon, destructive = false }: { action: ControlCommandInputAction, title: string, icon: any, destructive?: boolean }) => {
    const isWorking = activeCommand === action;
    const baseColor = destructive ? colors.destructive : colors.primary;
    
    return (
      <TouchableOpacity
        style={[
          styles.button, 
          { backgroundColor: isViewer ? colors.muted : baseColor, borderRadius: colors.radius },
          isWorking && { opacity: 0.7 }
        ]}
        disabled={isViewer || activeCommand !== null}
        onPress={() => handleCommand(action, title, destructive)}
      >
        {isWorking ? (
          <ActivityIndicator color={colors.primaryForeground} />
        ) : (
          <>
            <Feather name={icon} size={24} color={isViewer ? colors.mutedForeground : colors.primaryForeground} />
            <Text style={[styles.buttonText, { color: isViewer ? colors.mutedForeground : colors.primaryForeground }]}>{title}</Text>
          </>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 24 }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>Control Panel</Text>
      </View>

      {isViewer && (
        <View style={[styles.warningBox, { backgroundColor: colors.warning + '20', borderColor: colors.warning, borderRadius: colors.radius }]}>
          <Feather name="shield" size={24} color={colors.warning} />
          <View style={styles.warningContent}>
            <Text style={[styles.warningTitle, { color: colors.warning }]}>Read-Only Access</Text>
            <Text style={[styles.warningText, { color: colors.warning }]}>Your current role ({user?.role}) does not have permission to execute commands.</Text>
          </View>
        </View>
      )}

      <View style={styles.controlsGrid}>
        <View style={styles.row}>
          <ControlButton action="start" title="Start Pump" icon="play" />
          <ControlButton action="stop" title="Stop Pump" icon="square" />
        </View>
        <View style={styles.row}>
          <ControlButton action="restart" title="Restart" icon="refresh-cw" />
          <ControlButton action="reset_fault" title="Reset Faults" icon="shield" />
        </View>
        <View style={styles.fullRow}>
          <ControlButton action="emergency_stop" title="EMERGENCY STOP" icon="alert-octagon" destructive />
        </View>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
  },
  warningBox: {
    flexDirection: 'row',
    padding: 16,
    borderWidth: 1,
    marginBottom: 24,
    gap: 16,
    alignItems: 'flex-start',
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    marginBottom: 4,
  },
  warningText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    lineHeight: 20,
  },
  controlsGrid: {
    gap: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 16,
  },
  fullRow: {
    marginTop: 16,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 12,
    height: 72,
  },
  buttonText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
  },
});
