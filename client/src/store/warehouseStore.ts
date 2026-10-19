import { create } from 'zustand';
import api from '@/services/api';
import { useAuthStore } from '@/store/authStore';

export interface WarehouseActivity { timestamp: string; user?: string; action: string; description: string }

export interface WarehouseItem {
  _id: string;
  itemCode: string;
  itemDescription: string;
  department: string;
  unit: string;
  beginningQty: number | null;
  received: number | null;
  issued: number | null;
  currentStock: number | null;
  location: string;
  remarks: string;
  status: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
  activity: WarehouseActivity[];
}

export type WarehouseItemInput = Pick<WarehouseItem,
  'itemCode' | 'itemDescription' | 'department' | 'unit' | 'beginningQty' | 'received' | 'issued' | 'currentStock' | 'location' | 'remarks' | 'status'>;

export interface WarehouseMeta {
  departmentTabs: string[];
  tabNotes: Record<string, string[]>;
  workbookCount: number;
  workbookImported: number;
}

export interface ImportOutcome { inserted: number; skipped: number; skippedCodes: string[]; errors?: string[] }

interface WarehouseState {
  items: WarehouseItem[];
  meta: WarehouseMeta | null;
  isLoading: boolean;
  fetchItems: () => Promise<void>;
  fetchMeta: () => Promise<void>;
  createItem: (input: WarehouseItemInput) => Promise<void>;
  updateItem: (id: string, input: Partial<WarehouseItemInput>) => Promise<void>;
  importWorkbook: () => Promise<ImportOutcome>;
  bulkImport: (rows: Partial<WarehouseItemInput>[]) => Promise<ImportOutcome>;
}

const by = () => useAuthStore.getState().user?.name || 'System';
const errMsg = (e: any, fallback: string) => e?.response?.data?.error || fallback;

export const useWarehouseStore = create<WarehouseState>((set, get) => ({
  items: [],
  meta: null,
  isLoading: false,

  fetchItems: async () => {
    set({ isLoading: true });
    try { const res = await api.get('/warehouse/items'); set({ items: res.data }); }
    finally { set({ isLoading: false }); }
  },

  fetchMeta: async () => {
    try { const res = await api.get('/warehouse/meta'); set({ meta: res.data }); } catch { /* keep previous */ }
  },

  createItem: async (input) => {
    try {
      const res = await api.post('/warehouse/items', { ...input, performedBy: by() });
      set((s) => ({ items: [...s.items, res.data] }));
    } catch (e) { throw new Error(errMsg(e, 'Failed to add item')); }
  },

  updateItem: async (id, input) => {
    try {
      const res = await api.put(`/warehouse/items/${id}`, { ...input, performedBy: by() });
      set((s) => ({ items: s.items.map((i) => (i._id === id ? res.data : i)) }));
    } catch (e) { throw new Error(errMsg(e, 'Failed to update item')); }
  },

  importWorkbook: async () => {
    try {
      const res = await api.post('/warehouse/import-workbook', { performedBy: by() });
      await Promise.all([get().fetchItems(), get().fetchMeta()]);
      return res.data;
    } catch (e) { throw new Error(errMsg(e, 'Workbook import failed')); }
  },

  bulkImport: async (rows) => {
    try {
      const res = await api.post('/warehouse/items/bulk', { rows, performedBy: by() });
      await Promise.all([get().fetchItems(), get().fetchMeta()]);
      return res.data;
    } catch (e) { throw new Error(errMsg(e, 'Upload failed')); }
  },
}));
