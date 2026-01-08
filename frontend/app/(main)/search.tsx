import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { palette, spacing, borderRadius } from '../../constants/theme';
import { habitsAPI, moodAPI, focusAPI } from '../../services/api';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [habits, setHabits] = useState<any[]>([]);
  const [moodEntries, setMoodEntries] = useState<any[]>([]);
  const [focusSessions, setFocusSessions] = useState<any[]>([]);
  const [filteredResults, setFilteredResults] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterData();
  }, [searchQuery, habits, moodEntries, focusSessions]);

  const loadData = async () => {
    try {
      const [habitsRes, moodRes, focusRes] = await Promise.all([
        habitsAPI.getAll(),
        moodAPI.getAll(),
        focusAPI.getAll(),
      ]);
      setHabits(habitsRes.data);
      setMoodEntries(moodRes.data);
      setFocusSessions(focusRes.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const filterData = () => {
    if (!searchQuery.trim()) {
      setFilteredResults([]);
      return;
    }

    const query = searchQuery.toLowerCase();
    const results: any[] = [];

    // Search habits
    habits.forEach((habit) => {
      if (
        habit.name.toLowerCase().includes(query) ||
        habit.description?.toLowerCase().includes(query)
      ) {
        results.push({ type: 'habit', data: habit });
      }
    });

    // Search mood entries
    moodEntries.forEach((entry) => {
      if (entry.notes?.toLowerCase().includes(query) || entry.date.includes(query)) {
        results.push({ type: 'mood', data: entry });
      }
    });

    // Search focus sessions
    focusSessions.forEach((session) => {
      if (
        session.task_name.toLowerCase().includes(query) ||
        session.date.includes(query)
      ) {
        results.push({ type: 'focus', data: session });
      }
    });

    setFilteredResults(results);
  };

  const renderResult = (result: any) => {
    switch (result.type) {
      case 'habit':
        return (
          <View style={styles.resultCard}>
            <View
              style={[
                styles.resultIcon,
                { backgroundColor: result.data.color + '20' },
              ]}
            >
              <Ionicons name={result.data.icon} size={24} color={result.data.color} />
            </View>
            <View style={styles.resultContent}>
              <Text style={styles.resultType}>Habit</Text>
              <Text style={styles.resultTitle}>{result.data.name}</Text>
              {result.data.description && (
                <Text style={styles.resultSubtitle}>{result.data.description}</Text>
              )}
            </View>
          </View>
        );

      case 'mood':
        return (
          <View style={styles.resultCard}>
            <View
              style={[
                styles.resultIcon,
                { backgroundColor: palette.accentBlue + '20' },
              ]}
            >
              <Ionicons name="happy" size={24} color={palette.accentBlue} />
            </View>
            <View style={styles.resultContent}>
              <Text style={styles.resultType}>Mood Entry</Text>
              <Text style={styles.resultTitle}>
                {format(new Date(result.data.date), 'MMM d, yyyy')}
              </Text>
              <Text style={styles.resultSubtitle}>
                Mood: {result.data.mood_level}/5 • Energy: {result.data.energy_level}/5
              </Text>
              {result.data.notes && (
                <Text style={styles.resultNotes}>{result.data.notes}</Text>
              )}
            </View>
          </View>
        );

      case 'focus':
        return (
          <View style={styles.resultCard}>
            <View
              style={[
                styles.resultIcon,
                { backgroundColor: palette.accentTeal + '20' },
              ]}
            >
              <Ionicons name="timer" size={24} color={palette.accentTeal} />
            </View>
            <View style={styles.resultContent}>
              <Text style={styles.resultType}>Focus Session</Text>
              <Text style={styles.resultTitle}>{result.data.task_name}</Text>
              <Text style={styles.resultSubtitle}>
                {format(new Date(result.data.date), 'MMM d, yyyy')} •{' '}
                {result.data.duration_minutes} min
              </Text>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color={palette.muted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search habits, moods, focus sessions..."
            placeholderTextColor={palette.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={palette.muted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView style={styles.resultsContainer}>
        {filteredResults.length === 0 && searchQuery.length > 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={64} color={palette.muted} />
            <Text style={styles.emptyText}>No results found</Text>
            <Text style={styles.emptySubtext}>Try a different search term</Text>
          </View>
        ) : searchQuery.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="search" size={64} color={palette.muted} />
            <Text style={styles.emptyText}>Start searching</Text>
            <Text style={styles.emptySubtext}>
              Search your habits, mood entries, and focus sessions
            </Text>
          </View>
        ) : (
          <View style={styles.resultsSection}>
            <Text style={styles.resultsCount}>
              {filteredResults.length} result{filteredResults.length !== 1 && 's'}
            </Text>
            {filteredResults.map((result, index) => (
              <View key={index}>{renderResult(result)}</View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  searchContainer: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: palette.border,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: 48,
    color: palette.text,
    fontSize: 16,
  },
  resultsContainer: {
    flex: 1,
  },
  resultsSection: {
    padding: spacing.lg,
  },
  resultsCount: {
    fontSize: 14,
    color: palette.muted,
    marginBottom: spacing.md,
  },
  resultCard: {
    flexDirection: 'row',
    backgroundColor: palette.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  resultIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  resultContent: {
    flex: 1,
  },
  resultType: {
    fontSize: 12,
    color: palette.muted,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: palette.text,
    marginBottom: spacing.xs,
  },
  resultSubtitle: {
    fontSize: 14,
    color: palette.muted,
  },
  resultNotes: {
    fontSize: 14,
    color: palette.muted,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    marginTop: spacing.xl * 2,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: palette.text,
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontSize: 14,
    color: palette.muted,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
