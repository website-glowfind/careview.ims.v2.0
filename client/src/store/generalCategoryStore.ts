import { create } from 'zustand';
import api from '@/services/api';

const STORAGE_KEY = 'generalAssetCategories_v1';

// Built-in categories for General assets (appliances, furniture, etc.)
export const DEFAULT_GENERAL_CATEGORIES = [
  'furniture', 'appliance', 'fixture', 'equipment', 'vehicle', 'other',
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
  return [...DEFAULT_GENERAL_CATEGORIES];
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

interface GeneralCategoryState {
  categories: string[];
  items: CatItem[];
  defaultCategories: string[];
  fetchCategories: () => Promise<void>;
  addCategory: (name: string) => Promise<void>;
  deleteCategory: (name: string) => Promise<void>;
}

export const useGeneralCategoryStore = create<GeneralCategoryState>((set, get) => ({
  categories: loadCache(),
  items: loadCache().map((name) => ({ name })),
  defaultCategories: DEFAULT_GENERAL_CATEGORIES,

  fetchCategories: async () => {
    try {
      const res = await api.get('/categories', { params: { assetType: 'General' } });
      const items: CatItem[] = res.data.map((c: any) => ({ _id: c._id, name: c.name }));
      const names = items.map((i) => i.name);

      // Migrate previously-added custom categories not yet in the DB
      const missing = rawCache().filter(
        (c) => !names.includes(c) && !DEFAULT_GENERAL_CATEGORIES.includes(c),
      );
      for (const name of missing) {
        try {
          const r = await api.post('/categories', { name, assetType: 'General' });
          items.push({ _id: r.data._id, name });
          names.push(name);
        } catch { /* skip */ }
      }

      set({ items, categories: names });
      cache(names);
    } catch {
      // keep cached categories
    }
  },

  addCategory: async (name) => {
    const norm = name.toLowerCase().trim();
    if (!norm || get().categories.some((c) => c.toLowerCase() === norm)) return;
    set((s) => ({ categories: [...s.categories, norm], items: [...s.items, { name: norm }] }));
    cache(get().categories);
    try {
      const res = await api.post('/categories', { name: norm, assetType: 'General' });
      set((s) => ({ items: s.items.map((i) => (i.name === norm ? { _id: res.data._id, name: norm } : i)) }));
    } catch {
      // stays optimistic
    }
  },

  deleteCategory: async (name) => {
    const item = get().items.find((i) => i.name === name);
    set((s) => ({ categories: s.categories.filter((c) => c !== name), items: s.items.filter((i) => i.name !== name) }));
    cache(get().categories);
    if (item?._id) {
      try { await api.delete(`/categories/${item._id}`); } catch { /* ignore */ }
    }
  },
}));
