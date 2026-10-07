import { create } from 'zustand';
import { api } from '../lib/api.js';

export const useAuth = create((set, get) => ({
  token: localStorage.getItem('token'),
  user: null,
  ready: false,

  async init() {
    if (!get().token) return set({ ready: true });
    try {
      const { user } = await api.get('/auth/me');
      set({ user, ready: true });
    } catch {
      get().logout();
      set({ ready: true });
    }
  },

  async login(email, password) {
    const { token, user } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', token);
    set({ token, user });
  },

  async signup(payload) {
    const { token, user } = await api.post('/auth/signup', payload);
    localStorage.setItem('token', token);
    set({ token, user });
  },

  logout() {
    localStorage.removeItem('token');
    set({ token: null, user: null });
  },
}));
