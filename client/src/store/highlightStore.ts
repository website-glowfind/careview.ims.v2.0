import { create } from 'zustand';

// Device code to highlight when a module is opened from Records & Compliance.
interface HighlightState {
  deviceCode: string | null;
  set: (code: string) => void;
  clear: () => void;
}

export const useHighlightStore = create<HighlightState>((set) => ({
  deviceCode: null,
  set: (code) => set({ deviceCode: code }),
  clear: () => set({ deviceCode: null }),
}));
