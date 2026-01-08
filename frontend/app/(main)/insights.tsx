import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { palette, spacing, borderRadius, typography } from '../../constants/theme';
import { analyticsAPI } from '../../services/api';
import { Ionicons } from '@expo/vector-icons';
import { BarChart, LineChart } from 'react-native-gifted-charts';

const screenWidth = Dimensions.get('window').width;

export default function InsightsScreen() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadAnalytics = async () => {
    try {
      const response = await analyticsAPI.get();
      setAnalytics(response.data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
  };

  if (loading || !analytics) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Ionicons name="analytics" size={64} color={palette.muted} />
        <Text style={styles.loadingText}>Loading insights...</Text>
      </View>
    );
  }

  const { weekly_stats, insights, habit_streaks, mood_chart_data, focus_chart_data } =
    analytics;

  // Prepare chart data
  const moodData = mood_chart_data.map((item: any) => ({
    value: item.mood,
    label: item.date.slice(-2),
    frontColor: palette.accentBlue,
  }));

  const focusData = focus_chart_data.map((item: any) => ({
    value: item.minutes,
    label: item.date.slice(-2),
    frontColor: palette.accentTeal,
  }));

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'sleep_focus':
        return 'moon';
      case 'habit_streak':
        return 'flame';
      case 'mood_trend':
        return 'happy';
      case 'focus_productivity':
        return 'timer';
      default:
        return 'bulb';
    }
  };

  const getInsightColor = (trend: string) => {
    switch (trend) {
      case 'up':
        return palette.accentTeal;
      case 'down':
        return '#ff6b6b';
      default:
        return palette.accentBlue;
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.accentBlue} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Your Insights</Text>
        <Text style={styles.subtitle}>Data-driven personal intelligence</Text>
      </View>

      {/* Key Insights */}
      {insights && insights.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Insights</Text>
          {insights.map((insight: any, index: number) => (
            <View
              key={index}
              style={[
                styles.insightCard,
                { borderLeftColor: getInsightColor(insight.trend) },
              ]}
            >
              <View style={styles.insightHeader}>
                <View
                  style={[
                    styles.insightIcon,
                    { backgroundColor: getInsightColor(insight.trend) + '20' },
                  ]}
                >
                  <Ionicons
                    name={getInsightIcon(insight.type) as any}
                    size={24}
                    color={getInsightColor(insight.trend)}
                  />
                </View>
                <View style={styles.insightContent}>
                  <Text style={styles.insightTitle}>{insight.title}</Text>
                  <Text style={styles.insightDescription}>{insight.description}</Text>
                </View>
              </View>
              <View style={styles.insightValue}>
                <Text style={[styles.insightValueText, { color: getInsightColor(insight.trend) }]}>
                  {insight.value}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Weekly Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Weekly Summary</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="checkmark-done-circle" size={32} color={palette.accentBlue} />
            <Text style={styles.statValue}>{weekly_stats.total_habits_completed}</Text>
            <Text style={styles.statLabel}>Habits Completed</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="timer" size={32} color={palette.accentTeal} />
            <Text style={styles.statValue}>{weekly_stats.total_focus_minutes}</Text>
            <Text style={styles.statLabel}>Focus Minutes</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="happy" size={32} color={palette.accentBlue} />
            <Text style={styles.statValue}>{weekly_stats.average_mood.toFixed(1)}</Text>
            <Text style={styles.statLabel}>Avg Mood</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="moon" size={32} color={palette.accentTeal} />
            <Text style={styles.statValue}>{weekly_stats.average_sleep.toFixed(1)}h</Text>
            <Text style={styles.statLabel}>Avg Sleep</Text>
          </View>
        </View>
        <View style={styles.completionCard}>
          <Text style={styles.completionLabel}>Habit Completion Rate</Text>
          <Text style={styles.completionValue}>{weekly_stats.habit_completion_rate.toFixed(0)}%</Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${weekly_stats.habit_completion_rate}%` },
              ]}
            />
          </View>
        </View>
      </View>

      {/* Habit Streaks */}
      {habit_streaks && Object.keys(habit_streaks).length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Habit Streaks</Text>
          {Object.entries(habit_streaks).map(([habit, streak]: any) => (
            <View key={habit} style={styles.streakCard}>
              <Text style={styles.streakHabit}>{habit}</Text>
              <View style={styles.streakBadge}>
                <Ionicons name="flame" size={16} color={palette.accentBlue} />
                <Text style={styles.streakCount}>{streak} days</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Charts */}
      {moodData.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mood Trend (7 Days)</Text>
          <View style={styles.chartContainer}>
            <BarChart
              data={moodData}
              width={screenWidth - spacing.lg * 4}
              height={200}
              barWidth={32}
              spacing={20}
              roundedTop
              roundedBottom
              hideRules
              xAxisThickness={0}
              yAxisThickness={0}
              yAxisTextStyle={{ color: palette.muted }}
              noOfSections={5}
              maxValue={5}
              barBorderRadius={4}
            />
          </View>
        </View>
      )}

      {focusData.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Focus Time (7 Days)</Text>
          <View style={styles.chartContainer}>
            <BarChart
              data={focusData}
              width={screenWidth - spacing.lg * 4}
              height={200}
              barWidth={32}
              spacing={20}
              roundedTop
              roundedBottom
              hideRules
              xAxisThickness={0}
              yAxisThickness={0}
              yAxisTextStyle={{ color: palette.muted }}
              noOfSections={4}
              barBorderRadius={4}
            />
          </View>
        </View>
      )}

      {insights.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="bar-chart-outline" size={64} color={palette.muted} />
          <Text style={styles.emptyText}>Not enough data yet</Text>
          <Text style={styles.emptySubtext}>
            Keep tracking your habits, mood, and focus to see personalized insights!
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: palette.muted,
    marginTop: spacing.md,
    fontFamily: typography.regular,
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
  section: {
    padding: spacing.lg,
    paddingTop: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: palette.text,
    marginBottom: spacing.md,
    fontFamily: typography.bold,
  },
  insightCard: {
    backgroundColor: palette.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
  },
  insightHeader: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  insightIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: palette.text,
    marginBottom: spacing.xs,
    fontFamily: typography.bold,
  },
  insightDescription: {
    fontSize: 14,
    color: palette.muted,
    lineHeight: 20,
    fontFamily: typography.regular,
  },
  insightValue: {
    alignItems: 'flex-end',
  },
  insightValueText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
    marginBottom: spacing.md,
  },
  statCard: {
    width: '47%',
    backgroundColor: palette.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    margin: spacing.xs,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: palette.text,
    marginTop: spacing.sm,
    fontFamily: typography.bold,
  },
  statLabel: {
    fontSize: 12,
    color: palette.muted,
    marginTop: spacing.xs,
    textAlign: 'center',
    fontFamily: typography.regular,
  },
  completionCard: {
    backgroundColor: palette.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  completionLabel: {
    fontSize: 14,
    color: palette.muted,
    marginBottom: spacing.xs,
  },
  completionValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: palette.accentBlue,
    marginBottom: spacing.sm,
  },
  progressBar: {
    height: 8,
    backgroundColor: palette.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: palette.accentBlue,
  },
  streakCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  streakHabit: {
    fontSize: 16,
    fontWeight: '500',
    color: palette.text,
    flex: 1,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.accentBlue + '20',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  streakCount: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.accentBlue,
    marginLeft: spacing.xs,
  },
  chartContainer: {
    backgroundColor: palette.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xl,
    marginTop: spacing.xl,
  },
  emptyText: {
    fontSize: 18,
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
    paddingHorizontal: spacing.lg,
    fontFamily: typography.regular,
  },
});
