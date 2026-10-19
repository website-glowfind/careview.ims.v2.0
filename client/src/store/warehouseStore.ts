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

// ─── Gate Pass & Stock Movement ──────────────────────────────────────────────

export type MaterialDirection = 'IN' | 'OUT';

export interface GatePassLine { itemId?: string; itemCode?: string; description: string; quantity: number; remarks: string }

export interface GatePass {
  _id: string;
  gatePassNo: string;
  date: string;
  requestingDepartment: string;
  requestor: string;
  material: MaterialDirection;
  lines: GatePassLine[];
  destination: string;
  preparedBy: string;
  preparedDate?: string;
  receivedBy?: string;
  receivedDate?: string;
  createdBy?: string;
  createdAt?: string;
}

export type GatePassDraft = Omit<GatePass, '_id' | 'createdBy' | 'createdAt'>;

export interface StockMovement {
  _id: string;
  date: string;
  gatePassId: string;
  gatePassNo: string;
  itemId: string;
  itemCode: string;
  itemDescription: string;
  department: string;
  movementType: MaterialDirection;
  quantity: number;
  previousStock: number;
  currentStock: number;
  destination: string;
  requestor: string;
  preparedBy: string;
  receivedBy?: string;
  remarks?: string;
  createdAt?: string;
}

interface GatePassState {
  gatePasses: GatePass[];
  movements: StockMovement[];
  fetchGatePasses: () => Promise<void>;
  fetchMovements: () => Promise<void>;
  nextGatePassNo: () => Promise<string>;
  createGatePass: (draft: GatePassDraft) => Promise<{ gatePass: GatePass; movementCount: number }>;
}

export const useGatePassStore = create<GatePassState>((set, get) => ({
  gatePasses: [],
  movements: [],

  fetchGatePasses: async () => { try { const r = await api.get('/warehouse/gate-passes'); set({ gatePasses: r.data }); } catch { /* keep */ } },
  fetchMovements: async () => { try { const r = await api.get('/warehouse/movements'); set({ movements: r.data }); } catch { /* keep */ } },

  nextGatePassNo: async () => {
    try { const r = await api.get('/warehouse/gate-passes/next-number'); return r.data.gatePassNo as string; }
    catch { return `GP-${new Date().getFullYear()}-0001`; }
  },

  createGatePass: async (draft) => {
    try {
      const r = await api.post('/warehouse/gate-passes', { ...draft, performedBy: by() });
      // Stock changed on the server — refresh everything that shows it
      await Promise.all([get().fetchGatePasses(), get().fetchMovements(), useWarehouseStore.getState().fetchItems()]);
      return r.data;
    } catch (e) { throw new Error(errMsg(e, 'Failed to post gate pass')); }
  },
}));
