import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const api = axios.create({
  baseURL: `${EXPO_PUBLIC_BACKEND_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      await useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth API
export const authAPI = {
  register: (name: string, email: string, password: string) =>
    api.post('/auth/register', { name, email, password }),
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  getMe: () => api.get('/auth/me'),
};

// Habits API
export const habitsAPI = {
  getAll: () => api.get('/habits'),
  create: (data: any) => api.post('/habits', data),
  log: (data: any) => api.post('/habits/log', data),
  getLogs: (habitId?: string) => 
    api.get('/habits/logs', { params: habitId ? { habit_id: habitId } : {} }),
};

// Mood API
export const moodAPI = {
  getAll: () => api.get('/mood'),
  create: (data: any) => api.post('/mood', data),
};

// Focus API
export const focusAPI = {
  getAll: () => api.get('/focus'),
  create: (data: any) => api.post('/focus', data),
};

// Analytics API
export const analyticsAPI = {
  get: () => api.get('/analytics'),
};
