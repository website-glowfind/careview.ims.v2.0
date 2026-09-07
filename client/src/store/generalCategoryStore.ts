import { create } from 'zustand';

const STORAGE_KEY = 'generalAssetCategories_v1';

// Built-in categories for General assets (appliances, furniture, etc.)
export const DEFAULT_GENERAL_CATEGORIES = [
  'furniture', 'appliance', 'fixture', 'equipment', 'vehicle', 'other',
];

function loadCategories(): string[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore malformed storage
  }
  return [...DEFAULT_GENERAL_CATEGORIES];
}

function persist(categories: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
}

interface GeneralCategoryState {
  categories: string[];
  defaultCategories: string[];
  addCategory: (category: string) => void;
  deleteCategory: (category: string) => void;
}

export const useGeneralCategoryStore = create<GeneralCategoryState>((set, get) => ({
  categories: loadCategories(),
  defaultCategories: DEFAULT_GENERAL_CATEGORIES,

  addCategory: (category) => {
    const normalized = category.toLowerCase().trim();
    if (!normalized) return;
    const { categories } = get();
    if (categories.some(c => c.toLowerCase() === normalized)) return;
    const next = [...categories, normalized];
    persist(next);
    set({ categories: next });
  },

  deleteCategory: (category) => {
    const next = get().categories.filter(c => c !== category);
    persist(next);
    set({ categories: next });
  },
}));
