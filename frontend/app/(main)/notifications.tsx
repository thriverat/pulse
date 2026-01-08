import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { palette, spacing, borderRadius } from '../../constants/theme';
import { typography } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function NotificationsScreen() {
  // This is a placeholder for future notification features
  const notifications = [
    {
      id: '1',
      type: 'reminder',
      title: 'Time for your mood check-in',
      message: 'How are you feeling today?',
      time: '2 hours ago',
      icon: 'happy',
      color: palette.accentBlue,
    },
    {
      id: '2',
      type: 'achievement',
      title: '7-day streak!',
      message: "You've maintained your morning meditation habit for a week!",
      time: '1 day ago',
      icon: 'flame',
      color: palette.accentTeal,
    },
    {
      id: '3',
      type: 'insight',
      title: 'New insight available',
      message: 'Check out your weekly insights',
      time: '2 days ago',
      icon: 'analytics',
      color: palette.accentBlue,
    },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
        <Text style={styles.subtitle}>Stay updated on your progress</Text>
      </View>

      {notifications.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="notifications-outline" size={64} color={palette.muted} />
          <Text style={styles.emptyText}>No notifications yet</Text>
          <Text style={styles.emptySubtext}>
            You'll see reminders and achievements here
          </Text>
        </View>
      ) : (
        <View style={styles.notificationsList}>
          {notifications.map((notification) => (
            <View key={notification.id} style={styles.notificationCard}>
              <View
                style={[
                  styles.notificationIcon,
                  { backgroundColor: notification.color + '20' },
                ]}
              >
                <Ionicons
                  name={notification.icon as any}
                  size={24}
                  color={notification.color}
                />
              </View>
              <View style={styles.notificationContent}>
                <Text style={styles.notificationTitle}>{notification.title}</Text>
                <Text style={styles.notificationMessage}>{notification.message}</Text>
                <Text style={styles.notificationTime}>{notification.time}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.infoCard}>
        <Ionicons name="information-circle" size={24} color={palette.accentBlue} />
        <Text style={styles.infoText}>
          Push notifications are not enabled in this MVP. This page shows what notifications
          would look like in the full version.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  header: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: palette.text,
    marginBottom: spacing.xs,
    fontFamily: typography.bold,
  },
  subtitle: {
    fontSize: 14,
    color: palette.muted,
    fontFamily: typography.regular,
  },
  notificationsList: {
    padding: spacing.lg,
    paddingTop: spacing.md,
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: palette.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  notificationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: palette.text,
    marginBottom: spacing.xs,
    fontFamily: typography.bold,
  },
  notificationMessage: {
    fontSize: 14,
    color: palette.muted,
    marginBottom: spacing.xs,
    lineHeight: 20,
  },
  notificationTime: {
    fontSize: 12,
    color: palette.muted,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xl,
    marginTop: spacing.xl * 2,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: palette.text,
    marginTop: spacing.md,
    fontFamily: typography.bold,
  },
  emptySubtext: {
    fontSize: 14,
    color: palette.muted,
    marginTop: spacing.sm,
    textAlign: 'center',
    fontFamily: typography.regular,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: palette.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    margin: spacing.lg,
    borderWidth: 1,
    borderColor: palette.accentBlue + '40',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: palette.muted,
    marginLeft: spacing.md,
    lineHeight: 20,
  },
});
