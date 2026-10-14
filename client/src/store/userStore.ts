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
    email:      u.email ?? '',
    centerBranch: u.centerBranch ?? '',
    status:     u.status ?? 'active',
    permissions: u.permissions ?? {},
    lastLogin:  u.lastLogin ?? undefined,
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
  updatePermissions: (id: string, permissions: Record<string, string[]>) => Promise<void>;
  setUserStatus: (id: string, status: 'active' | 'inactive') => Promise<void>;
  resetPassword: (id: string) => Promise<{ tempPassword: string; email: string; username: string }>;
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
        email: data.email, centerBranch: data.centerBranch, status: data.status,
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
        email: data.email, centerBranch: data.centerBranch, status: data.status,
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

  updatePermissions: async (id, permissions) => {
    try {
      const res = await api.put(`/users/${id}`, { permissions });
      const updated = mapUser(res.data);
      set(s => ({ users: s.users.map(u => u.id === id ? updated : u) }));
      const u = get().users.find(x => x.id === id);
      useActivityLogStore.getState().addHistoryEntry({
        action: 'edited', category: 'user',
        deviceCode: u?.username ?? '', deviceName: u?.fullName ?? '',
        company: 'KHEALTH', details: 'Updated module access permissions',
      });
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to update permissions';
      set({ error: message });
      throw new Error(message);
    }
  },

  setUserStatus: async (id, status) => {
    try {
      const res = await api.put(`/users/${id}`, { status });
      const updated = mapUser(res.data);
      set(s => ({ users: s.users.map(u => u.id === id ? updated : u) }));
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to update status';
      set({ error: message });
      throw new Error(message);
    }
  },

  resetPassword: async (id) => {
    try {
      const res = await api.post(`/users/${id}/reset-password`);
      const u = get().users.find(x => x.id === id);
      useActivityLogStore.getState().addHistoryEntry({
        action: 'edited', category: 'user',
        deviceCode: u?.username ?? '', deviceName: u?.fullName ?? '',
        company: 'KHEALTH', details: 'Password reset (temporary password issued)',
      });
      return res.data as { tempPassword: string; email: string; username: string };
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to reset password';
      set({ error: message });
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
