import { create } from 'zustand';
import api from '@/services/api';

const STORAGE_KEY = 'staffHouseAssetCategories_v1';

// Built-in categories for Staff House assets
export const DEFAULT_STAFFHOUSE_CATEGORIES = [
  'Bed', 'Mattress', 'Cabinet', 'Table', 'Chair', 'Sofa', 'Refrigerator', 'Television',
  'Air Conditioner', 'Electric Fan', 'Washing Machine', 'Microwave', 'Rice Cooker',
  'Water Dispenser', 'Kitchen Equipment', 'Cleaning Equipment', 'Bathroom Fixture',
  'Appliance', 'Furniture', 'Electronics', 'Other',
];

interface CatItem { _id?: string; name: string; }

function loadCache(): string[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* ignore */ }
  return [...DEFAULT_STAFFHOUSE_CATEGORIES];
}

function rawCache(): string[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch { /* ignore */ }
  return [];
}

function cache(names: string[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(names)); } catch { /* ignore */ }
}

interface StaffHouseCategoryState {
  categories: string[];
  items: CatItem[];
  defaultCategories: string[];
  fetchCategories: () => Promise<void>;
  addCategory: (name: string) => Promise<void>;
  deleteCategory: (name: string) => Promise<void>;
}

export const useStaffHouseCategoryStore = create<StaffHouseCategoryState>((set, get) => ({
  categories: loadCache(),
  items: loadCache().map((name) => ({ name })),
  defaultCategories: DEFAULT_STAFFHOUSE_CATEGORIES,

  fetchCategories: async () => {
    try {
      const res = await api.get('/categories', { params: { assetType: 'StaffHouse' } });
      const items: CatItem[] = res.data.map((c: any) => ({ _id: c._id, name: c.name }));
      const names = items.map((i) => i.name);

      // Seed defaults the first time (DB empty for this register)
      if (names.length === 0) {
        for (const name of DEFAULT_STAFFHOUSE_CATEGORIES) {
          try { const r = await api.post('/categories', { name, assetType: 'StaffHouse' }); items.push({ _id: r.data._id, name }); names.push(name); } catch { /* skip */ }
        }
      }

      // Migrate previously-added custom categories not yet in the DB
      const missing = rawCache().filter((c) => !names.includes(c) && !DEFAULT_STAFFHOUSE_CATEGORIES.includes(c));
      for (const name of missing) {
        try { const r = await api.post('/categories', { name, assetType: 'StaffHouse' }); items.push({ _id: r.data._id, name }); names.push(name); } catch { /* skip */ }
      }

      set({ items, categories: names });
      cache(names);
    } catch {
      // keep cached categories
    }
  },

  addCategory: async (name) => {
    const norm = name.trim();
    if (!norm || get().categories.some((c) => c.toLowerCase() === norm.toLowerCase())) return;
    set((s) => ({ categories: [...s.categories, norm], items: [...s.items, { name: norm }] }));
    cache(get().categories);
    try {
      const res = await api.post('/categories', { name: norm, assetType: 'StaffHouse' });
      set((s) => ({ items: s.items.map((i) => (i.name === norm ? { _id: res.data._id, name: norm } : i)) }));
    } catch { /* optimistic */ }
  },

  deleteCategory: async (name) => {
    const item = get().items.find((i) => i.name === name);
    set((s) => ({ categories: s.categories.filter((c) => c !== name), items: s.items.filter((i) => i.name !== name) }));
    cache(get().categories);
    if (item?._id) { try { await api.delete(`/categories/${item._id}`); } catch { /* ignore */ } }
  },
}));
