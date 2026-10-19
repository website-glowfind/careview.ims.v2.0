import { create } from 'zustand';
import api from '@/services/api';
import { EQUIPMENT_KINDS, type EquipmentKind } from '@/config/equipment';

interface CatItem { _id?: string; name: string }
interface CategoryState {
  categories: string[];
  items: CatItem[];
  fetchCategories: () => Promise<void>;
  addCategory: (name: string) => Promise<void>;
  deleteCategory: (name: string) => Promise<void>;
}

// One category store per equipment register (MW / Medical Equipment). Names are
// stored lowercase (the Category model lowercases) and shown Title Case.
function makeStore(kind: EquipmentKind) {
  const cfg = EQUIPMENT_KINDS[kind];
  const assetType = cfg.assetType;
  const defaults = cfg.categories;
  const KEY = `${assetType}AssetCategories_v1`;
  const read = (): string[] => { try { const s = localStorage.getItem(KEY); const p = s ? JSON.parse(s) : null; return Array.isArray(p) ? p : []; } catch { return []; } };
  const write = (names: string[]) => { try { localStorage.setItem(KEY, JSON.stringify(names)); } catch { /* ignore */ } };
  const initial = read().length ? read() : [...defaults];

  return create<CategoryState>((set, get) => ({
    categories: initial,
    items: initial.map((name) => ({ name })),

    fetchCategories: async () => {
      try {
        const res = await api.get('/categories', { params: { assetType } });
        const items: CatItem[] = res.data.map((c: any) => ({ _id: c._id, name: c.name }));
        const names = items.map((i) => i.name);
        if (names.length === 0) {
          for (const name of defaults) {
            try { const r = await api.post('/categories', { name, assetType }); items.push({ _id: r.data._id, name }); names.push(name); } catch { /* skip */ }
          }
        }
        set({ items, categories: names });
        write(names);
      } catch { /* keep cached */ }
    },

    addCategory: async (name) => {
      const norm = name.toLowerCase().trim();
      if (!norm || get().categories.includes(norm)) return;
      set((s) => ({ categories: [...s.categories, norm], items: [...s.items, { name: norm }] }));
      write(get().categories);
      try {
        const res = await api.post('/categories', { name: norm, assetType });
        set((s) => ({ items: s.items.map((i) => (i.name === norm ? { _id: res.data._id, name: norm } : i)) }));
      } catch { /* optimistic */ }
    },

    deleteCategory: async (name) => {
      const item = get().items.find((i) => i.name === name);
      set((s) => ({ categories: s.categories.filter((c) => c !== name), items: s.items.filter((i) => i.name !== name) }));
      write(get().categories);
      if (item?._id) { try { await api.delete(`/categories/${item._id}`); } catch { /* ignore */ } }
    },
  }));
}

export const useMwCategoryStore = makeStore('mw');
export const useMedicalCategoryStore = makeStore('medical');
export const equipmentCategoryStore = (kind: EquipmentKind) => (kind === 'mw' ? useMwCategoryStore : useMedicalCategoryStore);
