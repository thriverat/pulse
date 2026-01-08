import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { NavigationContainer } from '@react-navigation/native';
import { palette } from '../../constants/theme';
import HomeScreen from './home';
import HabitsScreen from './habits';
import MoodScreen from './mood';
import FocusScreen from './focus';
import InsightsScreen from './insights';
import SearchScreen from './search';
import NotificationsScreen from './notifications';
import ProfileScreen from './profile';
import { Ionicons } from '@expo/vector-icons';

const Drawer = createDrawerNavigator();

export default function MainLayout() {
  return (
    <NavigationContainer independent={true}>
      <Drawer.Navigator
        screenOptions={{
          drawerStyle: {
            backgroundColor: palette.surface,
          },
          drawerActiveTintColor: palette.accentBlue,
          drawerInactiveTintColor: palette.muted,
          headerStyle: {
            backgroundColor: palette.surface,
          },
          headerTintColor: palette.text,
          headerShadowVisible: false,
        }}
      >
        <Drawer.Screen
          name="Home"
          component={HomeScreen}
          options={{
            drawerIcon: ({ color, size }) => (
              <Ionicons name="home" size={size} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="Habits"
          component={HabitsScreen}
          options={{
            drawerIcon: ({ color, size }) => (
              <Ionicons name="checkmark-circle" size={size} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="Mood"
          component={MoodScreen}
          options={{
            drawerIcon: ({ color, size }) => (
              <Ionicons name="happy" size={size} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="Focus"
          component={FocusScreen}
          options={{
            drawerIcon: ({ color, size }) => (
              <Ionicons name="timer" size={size} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="Insights"
          component={InsightsScreen}
          options={{
            drawerIcon: ({ color, size }) => (
              <Ionicons name="analytics" size={size} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="Search"
          component={SearchScreen}
          options={{
            drawerIcon: ({ color, size }) => (
              <Ionicons name="search" size={size} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="Notifications"
          component={NotificationsScreen}
          options={{
            drawerIcon: ({ color, size }) => (
              <Ionicons name="notifications" size={size} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="Profile"
          component={ProfileScreen}
          options={{
            drawerIcon: ({ color, size }) => (
              <Ionicons name="person" size={size} color={color} />
            ),
          }}
        />
      </Drawer.Navigator>
    </NavigationContainer>
  );
}
