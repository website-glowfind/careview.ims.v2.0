import { create } from 'zustand';
import api from '@/services/api';

const STORAGE_KEY = 'itInventoryCategories_v2';

// Canonical built-in categories (fallback + manage-modal reference)
export const DEFAULT_CATEGORIES = [
  'laptop', 'desktop', 'monitor', 'keyboard', 'mouse', 'printer',
  'server', 'networking', 'mobile', 'mobile + subscription', 'tablet', 'other', 'mini pc',
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
  return [...DEFAULT_CATEGORIES];
}

// Raw cached names (no defaults fallback) — used to migrate previously-added
// custom categories into the DB on first sync.
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

interface CategoryState {
  categories: string[];
  items: CatItem[];
  defaultCategories: string[];
  fetchCategories: () => Promise<void>;
  addCategory: (name: string) => Promise<void>;
  deleteCategory: (name: string) => Promise<void>;
}

export const useCategoryStore = create<CategoryState>((set, get) => ({
  categories: loadCache(),
  items: loadCache().map((name) => ({ name })),
  defaultCategories: DEFAULT_CATEGORIES,

  // Load categories from the DB; falls back to the cached list on failure
  fetchCategories: async () => {
    try {
      const res = await api.get('/categories', { params: { assetType: 'IT' } });
      const items: CatItem[] = res.data.map((c: any) => ({ _id: c._id, name: c.name }));
      const names = items.map((i) => i.name);

      // Migrate previously-added custom categories (in localStorage but not yet
      // in the DB, and not a built-in default) so users don't re-add them.
      const missing = rawCache().filter(
        (c) => !names.includes(c) && !DEFAULT_CATEGORIES.includes(c),
      );
      for (const name of missing) {
        try {
          const r = await api.post('/categories', { name, assetType: 'IT' });
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
    // Optimistic update
    set((s) => ({ categories: [...s.categories, norm], items: [...s.items, { name: norm }] }));
    cache(get().categories);
    try {
      const res = await api.post('/categories', { name: norm, assetType: 'IT' });
      set((s) => ({ items: s.items.map((i) => (i.name === norm ? { _id: res.data._id, name: norm } : i)) }));
    } catch {
      // stays optimistic; will reconcile on next fetch
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
