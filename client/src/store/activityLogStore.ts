import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { HistoryEntry, HistoryAction, Company } from '@/types/inventory';

interface ActivityLogState {
  history: HistoryEntry[];
  addHistoryEntry: (entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => void;
  clearHistory: () => void;
}

export const useActivityLogStore = create<ActivityLogState>()(
  persist(
    (set) => ({
      history: [],

      addHistoryEntry: (entry) => {
        const newEntry: HistoryEntry = {
          ...entry,
          id:        Date.now().toString() + Math.random(),
          timestamp: new Date().toISOString(),
        };
        set(state => ({ history: [newEntry, ...state.history] }));
      },

      clearHistory: () => set({ history: [] }),
    }),
    { name: 'ims-activity-log' }
  )
);
