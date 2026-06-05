import { create } from 'zustand';
import api from '@/services/api';
import type { User } from '@/types/inventory';
import { useActivityLogStore } from '@/store/activityLogStore';

// Map backend shape (_id/name) → frontend shape (id/fullName)
function mapUser(u: any): User {
  return {
    id:         u._id ?? u.id ?? '',
    fullName:   u.name ?? u.fullName ?? '',
    username:   u.username ?? '',
    password:   '',
    role:       u.role ?? 'employee',
    department: u.department ?? '',
    createdAt:  u.createdAt ?? new Date().toISOString(),
  };
}

interface UserStoreState {
  users: User[];
  isLoading: boolean;
  error: string | null;

  fetchUsers: () => Promise<void>;
  addUser: (data: Omit<User, 'id' | 'createdAt'>) => Promise<void>;
  editUser: (id: string, data: Omit<User, 'id' | 'createdAt'>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
}

export const useUserStore = create<UserStoreState>((set, get) => ({
  users: [],
  isLoading: false,
  error: null,

  fetchUsers: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.get('/users');
      set({ users: res.data.map(mapUser), isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Failed to fetch users', isLoading: false });
    }
  },

  addUser: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post('/users/register', {
        name: data.fullName, username: data.username,
        password: data.password, role: data.role, department: data.department,
      });
      const created = mapUser(res.data);
      set(s => ({ users: [...s.users, created], isLoading: false }));
      useActivityLogStore.getState().addHistoryEntry({
        action: 'added', category: 'user',
        deviceCode: created.username, deviceName: created.fullName,
        company: 'KHEALTH', // placeholder — users aren't company-specific
        details: `Role: ${created.role}${created.department ? ` | Dept: ${created.department}` : ''}`,
      });
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to add user';
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  editUser: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const body: any = {
        name: data.fullName, username: data.username,
        role: data.role, department: data.department,
      };
      if (data.password) body.password = data.password;
      const res = await api.put(`/users/${id}`, body);
      const updated = mapUser(res.data);
      set(s => ({ users: s.users.map(u => u.id === id ? updated : u), isLoading: false }));
      useActivityLogStore.getState().addHistoryEntry({
        action: 'edited', category: 'user',
        deviceCode: updated.username, deviceName: updated.fullName,
        company: 'KHEALTH',
        details: `Role: ${updated.role}${updated.department ? ` | Dept: ${updated.department}` : ''}`,
      });
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to update user';
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  deleteUser: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const user = get().users.find(u => u.id === id);
      await api.delete(`/users/${id}`);
      set(s => ({ users: s.users.filter(u => u.id !== id), isLoading: false }));
      if (user) {
        useActivityLogStore.getState().addHistoryEntry({
          action: 'deleted', category: 'user',
          deviceCode: user.username, deviceName: user.fullName,
          company: 'KHEALTH',
          details: `Role: ${user.role}`,
        });
      }
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to delete user';
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },
}));
