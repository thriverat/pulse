import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import { palette, spacing, borderRadius } from '../../constants/theme';
import { typography } from '../../constants/theme';
import { focusAPI } from '../../services/api';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

const PRESET_DURATIONS = [15, 25, 45, 60];

export default function FocusScreen() {
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes in seconds
  const [selectedDuration, setSelectedDuration] = useState(25);
  const [taskName, setTaskName] = useState('');
  const [sessions, setSessions] = useState<any[]>([]);

  const loadSessions = async () => {
    try {
      const response = await focusAPI.getAll();
      setSessions(response.data);
    } catch (error) {
      console.error('Failed to load focus sessions:', error);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    let interval: any;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      handleComplete();
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  const handleStart = () => {
    if (!taskName.trim()) {
      Alert.alert('Error', 'Please enter a task name');
      return;
    }
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(selectedDuration * 60);
  };

  const handleComplete = async () => {
    setIsRunning(false);
    const completedMinutes = Math.ceil((selectedDuration * 60 - timeLeft) / 60);
    
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      await focusAPI.create({
        task_name: taskName,
        duration_minutes: completedMinutes,
        date: today,
        completed: true,
      });
      
      Alert.alert('Great job!', `You focused for ${completedMinutes} minutes!`);
      setTaskName('');
      setTimeLeft(selectedDuration * 60);
      await loadSessions();
    } catch (error) {
      Alert.alert('Error', 'Failed to save focus session');
    }
  };

  const handleDurationChange = (duration: number) => {
    if (!isRunning) {
      setSelectedDuration(duration);
      setTimeLeft(duration * 60);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = 1 - timeLeft / (selectedDuration * 60);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Focus Timer</Text>
        <Text style={styles.subtitle}>Stay focused, track your progress</Text>
      </View>

      {/* Task Input */}
      {!isRunning && (
        <View style={styles.section}>
          <Text style={styles.label}>What are you working on?</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter task name..."
            placeholderTextColor={palette.muted}
            value={taskName}
            onChangeText={setTaskName}
          />
        </View>
      )}

      {/* Duration Selection */}
      {!isRunning && (
        <View style={styles.section}>
          <Text style={styles.label}>Duration</Text>
          <View style={styles.durationGrid}>
            {PRESET_DURATIONS.map((duration) => (
              <TouchableOpacity
                key={duration}
                style={[
                  styles.durationButton,
                  selectedDuration === duration && styles.durationButtonActive,
                ]}
                onPress={() => handleDurationChange(duration)}
              >
                <Text
                  style={[
                    styles.durationText,
                    selectedDuration === duration && styles.durationTextActive,
                  ]}
                >
                  {duration}m
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Timer Display */}
      <View style={styles.timerContainer}>
        <View style={styles.timerCircle}>
          <View style={[styles.progressRing, { opacity: progress }]} />
          <View style={styles.timerContent}>
            <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
            {isRunning && taskName && (
              <Text style={styles.taskText}>{taskName}</Text>
            )}
          </View>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        {!isRunning ? (
          <TouchableOpacity style={styles.startButton} onPress={handleStart}>
            <Ionicons name="play" size={32} color={palette.text} />
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity style={styles.controlButton} onPress={handlePause}>
              <Ionicons name="pause" size={28} color={palette.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlButton} onPress={handleReset}>
              <Ionicons name="stop" size={28} color={palette.text} />
            </TouchableOpacity>
          </>
        )}
      </View>

      {timeLeft === 0 && (
        <View style={styles.section}>
          <TouchableOpacity style={styles.completeButton} onPress={handleComplete}>
            <Text style={styles.completeButtonText}>Save Session</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Recent Sessions */}
      {sessions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Sessions</Text>
          {sessions.slice(0, 5).map((session) => (
            <View key={session.id} style={styles.sessionCard}>
              <View style={styles.sessionLeft}>
                <View style={styles.sessionIcon}>
                  <Ionicons name="timer" size={20} color={palette.accentBlue} />
                </View>
                <View>
                  <Text style={styles.sessionTask}>{session.task_name}</Text>
                  <Text style={styles.sessionDate}>
                    {format(new Date(session.date), 'MMM d, yyyy')}
                  </Text>
                </View>
              </View>
              <Text style={styles.sessionDuration}>{session.duration_minutes}m</Text>
            </View>
          ))}
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
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: palette.text,
    marginBottom: spacing.md,
    fontFamily: typography.bold,
  },
  input: {
    backgroundColor: palette.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: palette.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: palette.border,
  },
  durationGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  durationButton: {
    flex: 1,
    backgroundColor: palette.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginHorizontal: spacing.xs,
    borderWidth: 1,
    borderColor: palette.border,
  },
  durationButtonActive: {
    backgroundColor: palette.accentBlue,
    borderColor: palette.accentBlue,
  },
  durationText: {
    fontSize: 18,
    fontWeight: '600',
    color: palette.muted,
  },
  durationTextActive: {
    color: palette.text,
  },
  timerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  timerCircle: {
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: palette.surface,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  progressRing: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 140,
    borderWidth: 8,
    borderColor: palette.accentBlue,
  },
  timerContent: {
    alignItems: 'center',
  },
  timerText: {
    fontSize: 64,
    fontWeight: 'bold',
    color: palette.text,
    fontFamily: typography.bold,
  },
  taskText: {
    fontSize: 16,
    color: palette.muted,
    marginTop: spacing.sm,
    textAlign: 'center',
    fontFamily: typography.regular,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  startButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: palette.accentBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: palette.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.md,
  },
  completeButton: {
    backgroundColor: palette.accentTeal,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  completeButtonText: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: palette.text,
    marginBottom: spacing.md,
    fontFamily: typography.bold,
  },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: palette.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  sessionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sessionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.accentBlue + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  sessionTask: {
    fontSize: 16,
    fontWeight: '500',
    color: palette.text,
    fontFamily: typography.medium,
  },
  sessionDate: {
    fontSize: 12,
    color: palette.muted,
    marginTop: spacing.xs,
  },
  sessionDuration: {
    fontSize: 18,
    fontWeight: '600',
    color: palette.accentBlue,
  },
});
