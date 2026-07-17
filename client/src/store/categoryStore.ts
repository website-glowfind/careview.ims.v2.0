import { create } from 'zustand';

// v2: bumped from the legacy 'itInventoryCategories' key, which could still
// hold the old 'phone' category and miss 'mobile' / 'mobile + subscription'.
const STORAGE_KEY = 'itInventoryCategories_v2';

// Canonical built-in categories (order matters for the dropdown)
export const DEFAULT_CATEGORIES = [
  'laptop', 'desktop', 'monitor', 'keyboard', 'mouse', 'printer',
  'server', 'networking', 'mobile', 'mobile + subscription', 'tablet', 'other',
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
  return [...DEFAULT_CATEGORIES];
}

function persist(categories: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
}

interface CategoryState {
  categories: string[];
  defaultCategories: string[];
  addCategory: (category: string) => void;
  deleteCategory: (category: string) => void;
}

export const useCategoryStore = create<CategoryState>((set, get) => ({
  categories: loadCategories(),
  defaultCategories: DEFAULT_CATEGORIES,

  addCategory: (category) => {
    const normalized = category.toLowerCase().trim();
    if (!normalized) return;
    const { categories } = get();
    if (categories.some(c => c.toLowerCase() === normalized)) return; // no duplicates
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
