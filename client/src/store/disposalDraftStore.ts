import { create } from 'zustand';
import type { ITAsset } from '@/types/inventory';

// Holds assets queued for disposal while navigating from an asset register to
// the Disposal module. The Disposal form consumes and then clears this.
interface DisposalDraftState {
  items: ITAsset[];
  setItems: (items: ITAsset[]) => void;
  clear: () => void;
}

export const useDisposalDraftStore = create<DisposalDraftState>((set) => ({
  items: [],
  setItems: (items) => set({ items }),
  clear: () => set({ items: [] }),
}));
