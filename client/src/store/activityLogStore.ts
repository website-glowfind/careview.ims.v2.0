import { create } from 'zustand';
import api from '@/services/api';
import type { HistoryEntry, HistoryAction, HistoryCategory, Company } from '@/types/inventory';

// Map MongoDB doc → HistoryEntry
function mapLog(doc: any): HistoryEntry {
  return {
    id:          doc._id ?? doc.id,
    timestamp:   doc.createdAt ?? doc.timestamp,
    action:      doc.action      as HistoryAction,
    category:    doc.category    as HistoryCategory,
    deviceCode:  doc.deviceCode,
    deviceName:  doc.deviceName,
    company:     doc.company     as Company,
    fromCompany: doc.fromCompany as Company | undefined,
    toCompany:   doc.toCompany   as Company | undefined,
    details:     doc.details,
    performedBy: doc.performedBy,
    changes:     doc.changes,
  };
}

interface ActivityLogState {
  history: HistoryEntry[];
  deviceHistory: HistoryEntry[];
  isLoading: boolean;

  fetchHistory:          () => Promise<void>;
  fetchHistoryByDevice:  (deviceCode: string) => Promise<void>;
  addHistoryEntry:       (entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => Promise<void>;
  clearHistory:          () => Promise<void>;
}

export const useActivityLogStore = create<ActivityLogState>((set) => ({
  history:       [],
  deviceHistory: [],
  isLoading:     false,

  fetchHistoryByDevice: async (deviceCode: string) => {
    set({ isLoading: true });
    try {
      const res = await api.get(`/activity-log?deviceCode=${encodeURIComponent(deviceCode)}`);
      set({ deviceHistory: res.data.map(mapLog), isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  fetchHistory: async () => {
    set({ isLoading: true });
    try {
      const res = await api.get('/activity-log');
      set({ history: res.data.map(mapLog), isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  addHistoryEntry: async (entry) => {
    try {
      const res = await api.post('/activity-log', entry);
      const newEntry = mapLog(res.data);
      set(state => ({ history: [newEntry, ...state.history] }));
    } catch (err) {
      // Fallback: add locally if API fails
      const fallback: HistoryEntry = {
        ...entry,
        id:        Date.now().toString() + Math.random(),
        timestamp: new Date().toISOString(),
      };
      set(state => ({ history: [fallback, ...state.history] }));
      console.error('Failed to save activity log:', err);
    }
  },

  clearHistory: async () => {
    try {
      await api.delete('/activity-log');
      set({ history: [] });
    } catch (err) {
      console.error('Failed to clear activity log:', err);
    }
  },
}));
