import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { palette, spacing, borderRadius } from '../../constants/theme';
import { moodAPI } from '../../services/api';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

const MOOD_LEVELS = [
  { level: 1, emoji: 'sad', color: '#ff6b6b', label: 'Very Bad' },
  { level: 2, emoji: 'sad-outline', color: '#ffa07a', label: 'Bad' },
  { level: 3, emoji: 'remove', color: '#ffd93d', label: 'Okay' },
  { level: 4, emoji: 'happy-outline', color: '#6bcf7f', label: 'Good' },
  { level: 5, emoji: 'happy', color: '#4ecdc4', label: 'Excellent' },
];

const ENERGY_LEVELS = [1, 2, 3, 4, 5];
const SLEEP_HOURS = [4, 5, 6, 7, 8, 9, 10, 11, 12];

export default function MoodScreen() {
  const [moodLevel, setMoodLevel] = useState(3);
  const [energyLevel, setEnergyLevel] = useState(3);
  const [sleepHours, setSleepHours] = useState(7);
  const [notes, setNotes] = useState('');
  const [entries, setEntries] = useState<any[]>([]);
  const [hasEntryToday, setHasEntryToday] = useState(false);

  const loadEntries = async () => {
    try {
      const response = await moodAPI.getAll();
      setEntries(response.data);
      
      const today = format(new Date(), 'yyyy-MM-dd');
      const todayEntry = response.data.find((e: any) => e.date === today);
      
      if (todayEntry) {
        setHasEntryToday(true);
        setMoodLevel(todayEntry.mood_level);
        setEnergyLevel(todayEntry.energy_level);
        setSleepHours(todayEntry.sleep_hours);
        setNotes(todayEntry.notes || '');
      }
    } catch (error) {
      console.error('Failed to load mood entries:', error);
    }
  };

  useEffect(() => {
    loadEntries();
  }, []);

  const handleSubmit = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      await moodAPI.create({
        mood_level: moodLevel,
        energy_level: energyLevel,
        sleep_hours: sleepHours,
        notes,
        date: today,
      });
      
      Alert.alert('Success', hasEntryToday ? 'Mood updated!' : 'Mood logged!');
      await loadEntries();
    } catch (error) {
      Alert.alert('Error', 'Failed to save mood entry');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>How are you feeling?</Text>
        <Text style={styles.subtitle}>{format(new Date(), 'EEEE, MMMM d')}</Text>
      </View>

      {/* Mood Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mood</Text>
        <View style={styles.moodGrid}>
          {MOOD_LEVELS.map((mood) => (
            <TouchableOpacity
              key={mood.level}
              style={[
                styles.moodButton,
                moodLevel === mood.level && {
                  backgroundColor: mood.color + '20',
                  borderColor: mood.color,
                },
              ]}
              onPress={() => setMoodLevel(mood.level)}
            >
              <Ionicons
                name={mood.emoji as any}
                size={32}
                color={moodLevel === mood.level ? mood.color : palette.muted}
              />
              <Text
                style={[
                  styles.moodLabel,
                  moodLevel === mood.level && { color: mood.color },
                ]}
              >
                {mood.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Energy Level */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Energy Level</Text>
          <View style={styles.valueDisplay}>
            <Ionicons name="flash" size={20} color={palette.accentTeal} />
            <Text style={styles.valueText}>{energyLevel}/5</Text>
          </View>
        </View>
        <View style={styles.slider}>
          {ENERGY_LEVELS.map((level) => (
            <TouchableOpacity
              key={level}
              style={[
                styles.sliderDot,
                energyLevel >= level && styles.sliderDotActive,
              ]}
              onPress={() => setEnergyLevel(level)}
            />
          ))}
        </View>
      </View>

      {/* Sleep Hours */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Sleep Last Night</Text>
          <View style={styles.valueDisplay}>
            <Ionicons name="moon" size={20} color={palette.accentBlue} />
            <Text style={styles.valueText}>{sleepHours}h</Text>
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.sleepGrid}>
            {SLEEP_HOURS.map((hours) => (
              <TouchableOpacity
                key={hours}
                style={[
                  styles.sleepButton,
                  sleepHours === hours && styles.sleepButtonActive,
                ]}
                onPress={() => setSleepHours(hours)}
              >
                <Text
                  style={[
                    styles.sleepText,
                    sleepHours === hours && styles.sleepTextActive,
                  ]}
                >
                  {hours}h
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Notes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notes (optional)</Text>
        <TextInput
          style={styles.notesInput}
          placeholder="How was your day?"
          placeholderTextColor={palette.muted}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={4}
        />
      </View>

      {/* Submit Button */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>
            {hasEntryToday ? 'Update Entry' : 'Save Entry'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Recent Entries */}
      {entries.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Entries</Text>
          {entries.slice(0, 5).map((entry) => {
            const mood = MOOD_LEVELS.find((m) => m.level === entry.mood_level);
            return (
              <View key={entry.id} style={styles.entryCard}>
                <View style={styles.entryHeader}>
                  <Text style={styles.entryDate}>
                    {format(new Date(entry.date), 'MMM d, yyyy')}
                  </Text>
                  {mood && (
                    <Ionicons name={mood.emoji as any} size={24} color={mood.color} />
                  )}
                </View>
                <View style={styles.entryStats}>
                  <View style={styles.entryStat}>
                    <Ionicons name="flash" size={16} color={palette.muted} />
                    <Text style={styles.entryStatText}>Energy: {entry.energy_level}/5</Text>
                  </View>
                  <View style={styles.entryStat}>
                    <Ionicons name="moon" size={16} color={palette.muted} />
                    <Text style={styles.entryStatText}>Sleep: {entry.sleep_hours}h</Text>
                  </View>
                </View>
                {entry.notes && <Text style={styles.entryNotes}>{entry.notes}</Text>}
              </View>
            );
          })}
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
  header: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: palette.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
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
    marginBottom: spacing.md,
  },
  valueDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  valueText: {
    fontSize: 16,
    fontWeight: '600',
    color: palette.text,
    marginLeft: spacing.xs,
  },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  moodButton: {
    width: '18%',
    aspectRatio: 1,
    backgroundColor: palette.surface,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: palette.border,
  },
  moodLabel: {
    fontSize: 10,
    color: palette.muted,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  slider: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  sliderDot: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: palette.surface,
    borderWidth: 2,
    borderColor: palette.border,
  },
  sliderDotActive: {
    backgroundColor: palette.accentTeal,
    borderColor: palette.accentTeal,
  },
  sleepGrid: {
    flexDirection: 'row',
  },
  sleepButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: palette.surface,
    borderRadius: borderRadius.md,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: palette.border,
  },
  sleepButtonActive: {
    backgroundColor: palette.accentBlue,
    borderColor: palette.accentBlue,
  },
  sleepText: {
    fontSize: 16,
    color: palette.muted,
    fontWeight: '500',
  },
  sleepTextActive: {
    color: palette.text,
    fontWeight: '600',
  },
  notesInput: {
    backgroundColor: palette.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: palette.text,
    fontSize: 16,
    height: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: palette.border,
  },
  submitButton: {
    backgroundColor: palette.accentBlue,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  submitButtonText: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '600',
  },
  entryCard: {
    backgroundColor: palette.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  entryDate: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.text,
  },
  entryStats: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  entryStat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  entryStatText: {
    fontSize: 12,
    color: palette.muted,
    marginLeft: spacing.xs,
  },
  entryNotes: {
    fontSize: 14,
    color: palette.muted,
    fontStyle: 'italic',
  },
});
