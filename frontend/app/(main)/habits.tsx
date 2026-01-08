import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  RefreshControl,
} from 'react-native';
import { palette, spacing, borderRadius } from '../../constants/theme';
import { typography } from '../../constants/theme';
import { habitsAPI } from '../../services/api';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

const COLORS = [
  palette.accentBlue,
  palette.accentTeal,
  '#f447b9',
  '#ff6b6b',
  '#4ecdc4',
  '#ffe66d',
];

const ICONS = [
  'checkmark-circle',
  'fitness',
  'water',
  'book',
  'moon',
  'walk',
  'restaurant',
  'leaf',
];

export default function HabitsScreen() {
  const [habits, setHabits] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newHabit, setNewHabit] = useState({
    name: '',
    description: '',
    color: palette.accentBlue,
    icon: 'checkmark-circle',
  });
  const [refreshing, setRefreshing] = useState(false);

  const loadHabits = async () => {
    try {
      const [habitsRes, logsRes] = await Promise.all([
        habitsAPI.getAll(),
        habitsAPI.getLogs(),
      ]);
      setHabits(habitsRes.data);
      setLogs(logsRes.data);
    } catch (error) {
      console.error('Failed to load habits:', error);
    }
  };

  useEffect(() => {
    loadHabits();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHabits();
    setRefreshing(false);
  };

  const handleCreateHabit = async () => {
    if (!newHabit.name.trim()) {
      Alert.alert('Error', 'Please enter a habit name');
      return;
    }

    try {
      await habitsAPI.create(newHabit);
      setModalVisible(false);
      setNewHabit({
        name: '',
        description: '',
        color: palette.accentBlue,
        icon: 'checkmark-circle',
      });
      await loadHabits();
    } catch (error) {
      Alert.alert('Error', 'Failed to create habit');
    }
  };

  const toggleHabit = async (habitId: string, currentStatus: boolean) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    try {
      await habitsAPI.log({
        habit_id: habitId,
        date: today,
        completed: !currentStatus,
        notes: '',
      });
      await loadHabits();
    } catch (error) {
      Alert.alert('Error', 'Failed to update habit');
    }
  };

  const getHabitStatus = (habitId: string) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const log = logs.find((l) => l.habit_id === habitId && l.date === today);
    return log?.completed || false;
  };

  const getStreak = (habitId: string) => {
    const habitLogs = logs
      .filter((l) => l.habit_id === habitId && l.completed)
      .sort((a, b) => b.date.localeCompare(a.date));
    
    let streak = 0;
    const today = new Date();
    
    for (let i = 0; i < habitLogs.length; i++) {
      const logDate = new Date(habitLogs[i].date);
      const daysDiff = Math.floor((today.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === i) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.accentBlue} />}
      >
        <View style={styles.header}>
          <Text style={styles.title}>My Habits</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setModalVisible(true)}
          >
            <Ionicons name="add" size={24} color={palette.text} />
          </TouchableOpacity>
        </View>

        {habits.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle-outline" size={64} color={palette.muted} />
            <Text style={styles.emptyText}>No habits yet</Text>
            <Text style={styles.emptySubtext}>Create your first habit to get started</Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => setModalVisible(true)}
            >
              <Text style={styles.createButtonText}>Create Habit</Text>
            </TouchableOpacity>
          </View>
        ) : (
          habits.map((habit) => {
            const completed = getHabitStatus(habit.id);
            const streak = getStreak(habit.id);
            
            return (
              <TouchableOpacity
                key={habit.id}
                style={styles.habitCard}
                onPress={() => toggleHabit(habit.id, completed)}
              >
                <View style={styles.habitLeft}>
                  <View
                    style={[
                      styles.habitIcon,
                      { backgroundColor: habit.color + '20' },
                    ]}
                  >
                    <Ionicons name={habit.icon} size={24} color={habit.color} />
                  </View>
                  <View style={styles.habitInfo}>
                    <Text style={styles.habitName}>{habit.name}</Text>
                    {habit.description && (
                      <Text style={styles.habitDescription}>{habit.description}</Text>
                    )}
                    {streak > 0 && (
                      <View style={styles.streakBadge}>
                        <Ionicons name="flame" size={14} color={palette.accentBlue} />
                        <Text style={styles.streakText}>{streak} day streak</Text>
                      </View>
                    )}
                  </View>
                </View>
                <View
                  style={[
                    styles.checkbox,
                    completed && { backgroundColor: habit.color, borderColor: habit.color },
                  ]}
                >
                  {completed && <Ionicons name="checkmark" size={20} color={palette.text} />}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Create Habit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Habit</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={palette.text} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Habit name"
              placeholderTextColor={palette.muted}
              value={newHabit.name}
              onChangeText={(text) => setNewHabit({ ...newHabit, name: text })}
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description (optional)"
              placeholderTextColor={palette.muted}
              value={newHabit.description}
              onChangeText={(text) => setNewHabit({ ...newHabit, description: text })}
              multiline
              numberOfLines={3}
            />

            <Text style={styles.label}>Choose Color</Text>
            <View style={styles.colorGrid}>
              {COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    newHabit.color === color && styles.colorSelected,
                  ]}
                  onPress={() => setNewHabit({ ...newHabit, color })}
                >
                  {newHabit.color === color && (
                    <Ionicons name="checkmark" size={20} color={palette.text} />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Choose Icon</Text>
            <View style={styles.iconGrid}>
              {ICONS.map((icon) => (
                <TouchableOpacity
                  key={icon}
                  style={[
                    styles.iconOption,
                    newHabit.icon === icon && styles.iconSelected,
                  ]}
                  onPress={() => setNewHabit({ ...newHabit, icon })}
                >
                  <Ionicons name={icon as any} size={24} color={palette.text} />
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.submitButton} onPress={handleCreateHabit}>
              <Text style={styles.submitButtonText}>Create Habit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: palette.text,
    fontFamily: typography.bold,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.accentBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  habitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: palette.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  habitLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  habitIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  habitInfo: {
    flex: 1,
  },
  habitName: {
    fontSize: 16,
    fontWeight: '600',
    color: palette.text,
    marginBottom: spacing.xs,
    fontFamily: typography.bold,
  },
  habitDescription: {
    fontSize: 14,
    color: palette.muted,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  streakText: {
    fontSize: 12,
    color: palette.accentBlue,
    marginLeft: spacing.xs,
    fontWeight: '500',
  },
  checkbox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
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
    fontFamily: typography.bold,
  },
  emptySubtext: {
    fontSize: 14,
    color: palette.muted,
    marginTop: spacing.sm,
    textAlign: 'center',
    fontFamily: typography.regular,
  },
  createButton: {
    backgroundColor: palette.accentBlue,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
  },
  createButtonText: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: palette.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: palette.text,
  },
  input: {
    backgroundColor: palette.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: palette.text,
    fontSize: 16,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: palette.border,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: palette.text,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
    fontFamily: typography.bold,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.md,
  },
  colorOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    margin: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSelected: {
    borderWidth: 3,
    borderColor: palette.text,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.md,
  },
  iconOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    margin: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.background,
  },
  iconSelected: {
    backgroundColor: palette.accentBlue,
  },
  submitButton: {
    backgroundColor: palette.accentBlue,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  submitButtonText: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
