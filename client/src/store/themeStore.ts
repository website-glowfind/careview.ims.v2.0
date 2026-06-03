import { create } from 'zustand';

interface ThemeState {
  isDark: boolean;
  toggleDark: () => void;
  initTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  isDark: false,

  toggleDark: () => {
    const newDark = !get().isDark;
    set({ isDark: newDark });
    if (newDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  },

  initTheme: () => {
    const saved = localStorage.getItem('theme');
    const isDark = saved === 'dark';
    set({ isDark });
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  },
}));
