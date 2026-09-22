import { create } from 'zustand';
import type { FormRecord, Company } from '@/types/inventory';
import api from '@/services/api';

interface FormRecordState {
  formRecords: FormRecord[];
  selectedCompany: Company | 'all';
  isLoading: boolean;
  fetchFormRecords: () => Promise<void>;
  addFormRecord: (record: Omit<FormRecord, 'id' | 'dateCreated'>) => Promise<FormRecord | null>;
  deleteFormRecord: (id: string) => Promise<void>;
  setSelectedCompany: (company: Company | 'all') => void;
}

function mapRecord(r: any): FormRecord {
  return {
    ...r,
    id: r._id ?? r.id,
    dateCreated: r.createdAt ?? r.dateCreated,
  };
}

export const useFormRecordStore = create<FormRecordState>((set, get) => ({
  formRecords: [],
  selectedCompany: 'all',
  isLoading: false,

  fetchFormRecords: async () => {
    set({ isLoading: true });
    try {
      const { selectedCompany } = get();
      const params = selectedCompany !== 'all' ? `?company=${selectedCompany}` : '';
      const res = await api.get(`/form-records${params}`);
      set({ formRecords: res.data.map(mapRecord), isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  addFormRecord: async (record) => {
    try {
      const res = await api.post('/form-records', record);
      const saved = mapRecord(res.data);
      // If the backend returned an existing record (duplicate), don't add it twice
      set((state) =>
        state.formRecords.some((r) => r.id === saved.id)
          ? state
          : { formRecords: [saved, ...state.formRecords] },
      );
      return saved;
    } catch (err) {
      console.error('Failed to save form record:', err);
      return null;
    }
  },

  deleteFormRecord: async (id) => {
    try {
      await api.delete(`/form-records/${id}`);
      set((state) => ({ formRecords: state.formRecords.filter(r => r.id !== id) }));
    } catch (err) {
      console.error('Failed to delete form record:', err);
    }
  },

  setSelectedCompany: (company) => set({ selectedCompany: company }),
}));
