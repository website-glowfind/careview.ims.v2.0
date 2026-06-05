import { create } from 'zustand';
import api from '@/services/api';
import type { Company } from '@/types/inventory';
import type { Subscription } from '@/types/subscription';
import { useActivityLogStore } from '@/store/activityLogStore';

interface SubscriptionState {
  subscriptions: Subscription[];
  selectedCompany: Company | 'ALL';
  isLoading: boolean;
  error: string | null;

  fetchSubscriptions: () => Promise<void>;
  addSubscription: (data: Omit<Subscription, 'id'>) => Promise<void>;
  updateSubscription: (id: string, data: Omit<Subscription, 'id'>) => Promise<void>;
  deleteSubscription: (id: string) => Promise<void>;
  setSelectedCompany: (company: Company | 'ALL') => void;
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  subscriptions: [],
  selectedCompany: 'ALL',
  isLoading: false,
  error: null,

  fetchSubscriptions: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.get('/subscriptions');
      // Map _id → id for consistency with frontend Subscription type
      const data = res.data.map((s: any) => ({ ...s, id: s._id ?? s.id }));
      set({ subscriptions: data, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Failed to fetch subscriptions', isLoading: false });
    }
  },

  addSubscription: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post('/subscriptions', data);
      const created = { ...res.data, id: res.data._id ?? res.data.id };
      set(state => ({ subscriptions: [created, ...state.subscriptions], isLoading: false }));
      useActivityLogStore.getState().addHistoryEntry({
        action: 'added', category: 'subscription',
        deviceCode: created.referenceCode, deviceName: created.name,
        company: created.company,
        details: `${created.type}: ${created.provider} — ${created.billingCycle}`,
      });
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to add subscription';
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  updateSubscription: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.put(`/subscriptions/${id}`, data);
      const updated = { ...res.data, id: res.data._id ?? res.data.id };
      set(state => ({
        subscriptions: state.subscriptions.map(s => s.id === id ? updated : s),
        isLoading: false,
      }));
      useActivityLogStore.getState().addHistoryEntry({
        action: 'edited', category: 'subscription',
        deviceCode: updated.referenceCode, deviceName: updated.name,
        company: updated.company,
        details: `Updated ${updated.type} — Status: ${updated.status}`,
      });
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to update subscription';
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  deleteSubscription: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const existing = get().subscriptions.find(s => s.id === id);
      await api.delete(`/subscriptions/${id}`);
      set(state => ({
        subscriptions: state.subscriptions.filter(s => s.id !== id),
        isLoading: false,
      }));
      if (existing) {
        useActivityLogStore.getState().addHistoryEntry({
          action: 'deleted', category: 'subscription',
          deviceCode: existing.referenceCode, deviceName: existing.name,
          company: existing.company,
          details: `Deleted ${existing.type}`,
        });
      }
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to delete subscription';
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  setSelectedCompany: (company) => set({ selectedCompany: company }),
}));
