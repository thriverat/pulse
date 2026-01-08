import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { palette, spacing, borderRadius } from '../../constants/theme';
import { useAuthStore } from '../../store/authStore';
import { habitsAPI, moodAPI, focusAPI, analyticsAPI } from '../../services/api';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

export default function HomeScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [todayHabits, setTodayHabits] = useState<any[]>([]);
  const [todayMood, setTodayMood] = useState<any>(null);

  const loadData = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      
      // Load analytics stats
      const analyticsRes = await analyticsAPI.get();
      setStats(analyticsRes.data.weekly_stats);

      // Load today's habits
      const habitsRes = await habitsAPI.getAll();
      const logsRes = await habitsAPI.getLogs();
      
      const todayLogs = logsRes.data.filter((log: any) => log.date === today);
      const habitsWithStatus = habitsRes.data.map((habit: any) => {
        const log = todayLogs.find((l: any) => l.habit_id === habit.id);
        return {
          ...habit,
          completed: log?.completed || false,
        };
      });
      setTodayHabits(habitsWithStatus);

      // Load today's mood
      const moodRes = await moodAPI.getAll();
      const todayMoodEntry = moodRes.data.find((m: any) => m.date === today);
      setTodayMood(todayMoodEntry);
    } catch (error) {
      console.error('Failed to load home data:', error);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const renderStatCard = (icon: string, label: string, value: string, color: string) => (
    <View style={[styles.statCard, { borderColor: color }]}>
      <Ionicons name={icon as any} size={24} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.accentBlue} />}
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, {user?.name}!</Text>
        <Text style={styles.date}>{format(new Date(), 'EEEE, MMMM d')}</Text>
      </View>

      {/* Quick Stats */}
      {stats && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>This Week</Text>
          <View style={styles.statsGrid}>
            {renderStatCard(
              'checkmark-done-circle',
              'Habits',
              stats.total_habits_completed.toString(),
              palette.accentBlue
            )}
            {renderStatCard(
              'timer',
              'Focus (min)',
              stats.total_focus_minutes.toString(),
              palette.accentTeal
            )}
            {renderStatCard(
              'happy',
              'Avg Mood',
              stats.average_mood.toFixed(1),
              palette.accentBlue
            )}
            {renderStatCard(
              'moon',
              'Avg Sleep',
              stats.average_sleep.toFixed(1) + 'h',
              palette.accentTeal
            )}
          </View>
        </View>
      )}

      {/* Today's Habits */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Habits</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Habits')}>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>
        {todayHabits.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="add-circle-outline" size={48} color={palette.muted} />
            <Text style={styles.emptyText}>No habits yet</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => navigation.navigate('Habits')}
            >
              <Text style={styles.addButtonText}>Add Habit</Text>
            </TouchableOpacity>
          </View>
        ) : (
          todayHabits.slice(0, 3).map((habit: any) => (
            <View key={habit.id} style={styles.habitCard}>
              <View style={styles.habitInfo}>
                <View style={[styles.habitIcon, { backgroundColor: habit.color + '20' }]}>
                  <Ionicons name={habit.icon} size={20} color={habit.color} />
                </View>
                <Text style={styles.habitName}>{habit.name}</Text>
              </View>
              <View style={[styles.checkbox, habit.completed && styles.checkboxChecked]}>
                {habit.completed && (
                  <Ionicons name="checkmark" size={18} color={palette.text} />
                )}
              </View>
            </View>
          ))
        )}
      </View>

      {/* Mood Check-in */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Mood</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Mood')}>
            <Text style={styles.seeAll}>{todayMood ? 'Edit' : 'Add'}</Text>
          </TouchableOpacity>
        </View>
        {todayMood ? (
          <View style={styles.moodCard}>
            <View style={styles.moodRow}>
              <Ionicons name="happy" size={24} color={palette.accentBlue} />
              <Text style={styles.moodText}>Mood: {todayMood.mood_level}/5</Text>
            </View>
            <View style={styles.moodRow}>
              <Ionicons name="flash" size={24} color={palette.accentTeal} />
              <Text style={styles.moodText}>Energy: {todayMood.energy_level}/5</Text>
            </View>
            <View style={styles.moodRow}>
              <Ionicons name="moon" size={24} color={palette.muted} />
              <Text style={styles.moodText}>Sleep: {todayMood.sleep_hours}h</Text>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.checkInCard}
            onPress={() => navigation.navigate('Mood')}
          >
            <Ionicons name="add-circle" size={32} color={palette.accentBlue} />
            <Text style={styles.checkInText}>Check in your mood</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('Focus')}
          >
            <Ionicons name="timer" size={32} color={palette.accentBlue} />
            <Text style={styles.actionText}>Start Focus</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('Insights')}
          >
            <Ionicons name="analytics" size={32} color={palette.accentTeal} />
            <Text style={styles.actionText}>View Insights</Text>
          </TouchableOpacity>
        </View>
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
    paddingBottom: spacing.md,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: palette.text,
    marginBottom: spacing.xs,
  },
  date: {
    fontSize: 14,
    color: palette.muted,
  },
  section: {
    padding: spacing.lg,
    paddingTop: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: palette.text,
  },
  seeAll: {
    fontSize: 14,
    color: palette.accentBlue,
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
  },
  statCard: {
    width: '47%',
    backgroundColor: palette.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    margin: spacing.xs,
    borderWidth: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: palette.text,
    marginTop: spacing.sm,
  },
  statLabel: {
    fontSize: 12,
    color: palette.muted,
    marginTop: spacing.xs,
  },
  habitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: palette.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  habitInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  habitIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  habitName: {
    fontSize: 16,
    color: palette.text,
    fontWeight: '500',
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: palette.accentBlue,
    borderColor: palette.accentBlue,
  },
  emptyCard: {
    backgroundColor: palette.surface,
    borderRadius: borderRadius.md,
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: palette.muted,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  addButton: {
    backgroundColor: palette.accentBlue,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  addButtonText: {
    color: palette.text,
    fontSize: 14,
    fontWeight: '600',
  },
  moodCard: {
    backgroundColor: palette.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  moodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  moodText: {
    fontSize: 16,
    color: palette.text,
    marginLeft: spacing.md,
  },
  checkInCard: {
    backgroundColor: palette.surface,
    borderRadius: borderRadius.md,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.border,
    borderStyle: 'dashed',
  },
  checkInText: {
    fontSize: 16,
    color: palette.muted,
    marginTop: spacing.md,
  },
  actionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: '48%',
    backgroundColor: palette.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
  },
  actionText: {
    fontSize: 14,
    color: palette.text,
    marginTop: spacing.md,
    fontWeight: '500',
  },
});
