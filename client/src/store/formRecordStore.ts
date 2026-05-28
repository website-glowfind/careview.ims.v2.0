import { create } from 'zustand';
import type { FormRecord, Company } from '@/types/inventory';

interface FormRecordState {
  formRecords: FormRecord[];
  selectedCompany: Company | 'all';
  addFormRecord: (record: Omit<FormRecord, 'id' | 'dateCreated'>) => void;
  setSelectedCompany: (company: Company | 'all') => void;
}

export const useFormRecordStore = create<FormRecordState>((set) => ({
  formRecords: [],
  selectedCompany: 'all',

  addFormRecord: (record) => {
    const newRecord: FormRecord = {
      ...record,
      id: Date.now().toString() + Math.random(),
      dateCreated: new Date().toISOString(),
    };
    set((state) => ({ formRecords: [newRecord, ...state.formRecords] }));
  },

  setSelectedCompany: (company) => set({ selectedCompany: company }),
}));
