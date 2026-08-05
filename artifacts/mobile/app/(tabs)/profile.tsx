import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/auth';
import { useGetNotifications, getGetNotificationsQueryKey, useMarkNotificationRead, useMarkAllNotificationsRead } from '@workspace/api-client-react';
import { Feather } from '@expo-vector-icons';

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  
  const { data: notifications, isLoading, refetch, isRefetching } = useGetNotifications({ unreadOnly: true, limit: 20 }, {
    query: { refetchInterval: 30000, queryKey: getGetNotificationsQueryKey({ unreadOnly: true, limit: 20 }) }
  });

  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const handleMarkRead = async (id: number) => {
    try {
      await markRead.mutateAsync({ id });
      refetch();
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllRead.mutateAsync();
      refetch();
    } catch (e) {
      console.error(e);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: insets.top + 24, paddingBottom: 100, paddingHorizontal: 16 }}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
      }
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>Profile</Text>
      </View>

      <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={[styles.avatarText, { color: colors.primaryForeground }]}>
            {getInitials(user?.username)}
          </Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={[styles.name, { color: colors.foreground }]}>{user?.username}</Text>
          <Text style={[styles.email, { color: colors.mutedForeground }]}>{user?.email}</Text>
          <View style={[styles.roleBadge, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.roleText, { color: colors.secondaryForeground }]}>{(user?.role || 'UNKNOWN').toUpperCase()}</Text>
          </View>
        </View>
      </View>

      <View style={styles.notificationsHeader}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Unread Notifications {notifications ? `(${notifications.length})` : ''}
        </Text>
        {notifications && notifications.length > 0 && (
          <TouchableOpacity onPress={handleMarkAllRead}>
            <Text style={[styles.markAllText, { color: colors.primary }]}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 24 }} />
      ) : notifications && notifications.length > 0 ? (
        <View style={[styles.notificationsList, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          {notifications.map((notif, index) => (
            <TouchableOpacity 
              key={notif.id} 
              style={[
                styles.notificationItem, 
                index > 0 && { borderTopWidth: 1, borderTopColor: colors.border }
              ]}
              onPress={() => handleMarkRead(notif.id)}
            >
              <View style={[styles.notifDot, { backgroundColor: colors.primary }]} />
              <View style={styles.notifContent}>
                <Text style={[styles.notifTitle, { color: colors.foreground }]}>{notif.type.replace(/_/g, ' ').toUpperCase()}</Text>
                <Text style={[styles.notifBody, { color: colors.mutedForeground }]} numberOfLines={2}>{notif.message}</Text>
                <Text style={[styles.notifTime, { color: colors.mutedForeground }]}>
                  {new Date(notif.timestamp).toLocaleString()}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <Feather name="bell-off" size={32} color={colors.mutedForeground} style={{ marginBottom: 12 }} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No unread notifications</Text>
        </View>
      )}

      <TouchableOpacity 
        style={[styles.logoutBtn, { borderColor: colors.destructive, borderRadius: colors.radius }]}
        onPress={logout}
      >
        <Feather name="log-out" size={20} color={colors.destructive} />
        <Text style={[styles.logoutText, { color: colors.destructive }]}>Sign Out</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
  },
  profileCard: {
    flexDirection: 'row',
    padding: 20,
    borderWidth: 1,
    marginBottom: 32,
    alignItems: 'center',
    gap: 20,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
  },
  profileInfo: {
    flex: 1,
    alignItems: 'flex-start',
  },
  name: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    marginBottom: 4,
  },
  email: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    marginBottom: 8,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  notificationsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
  },
  markAllText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  notificationsList: {
    borderWidth: 1,
    marginBottom: 32,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  notifDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  notifContent: {
    flex: 1,
  },
  notifTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    marginBottom: 4,
  },
  notifBody: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  notifTime: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  emptyBox: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 32,
  },
  emptyText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 1,
    gap: 8,
  },
  logoutText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
  },
});
