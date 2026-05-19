import { create } from "zustand";
import api from "../services/api";
import { assetServices } from "@/services/assetServices";
// I-import lahat ng kailangang types mula sa iyong types file
import type { ITAsset, Company, LicenseSubscription } from "@/types/inventory";

interface AssetState {
  assets: ITAsset[];
  setAssets: (assets: ITAsset[]) => void;
  subscriptions: LicenseSubscription[]; // Gamitin ang detailed interface mo
  selectedCompany: Company | 'all';
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchAssets: () => Promise<void>;
  fetchSubscriptions: () => Promise<void>;
  setSelectedCompany: (company: Company | 'all') => void;
  addAsset: (assetData: any, subscriptionData?: any) => Promise<void>;
  updateAsset: (id: string, assetData: any) => Promise<void>;
  deleteAsset: (id: string) => void

  // Logic/Getters (Helper functions para sa Dashboard)
  getWarrantyExpiringAssets: () => ITAsset[];
  getExpiringSubscriptions: () => LicenseSubscription[];
}

export const useAssetStore = create<AssetState>((set, get) => ({
  assets: [],
  setAssets: (assets) => set({ assets }),
  subscriptions: [],
  selectedCompany: 'all',
  isLoading: false,
  error: null,

  setSelectedCompany: (company) => set({ selectedCompany: company }),

  fetchAssets: async () => {
    set({ isLoading: true });
    try {
      // Endpoint sa backend na kailangan mong gawin
      const response = await api.get("/assets");
      set({ assets: response.data, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.error || "Failed to fetch assets", isLoading: false });
    }
  },

  fetchSubscriptions: async () => {
    try {
      const response = await api.get("/subscriptions");
      set({ subscriptions: response.data });
    } catch (err: any) {
      console.error("Fetch subscriptions error:", err);
    }
  },

  // Helper: Warranties expiring in the next 90 days
  getWarrantyExpiringAssets: () => {
    const { assets, selectedCompany } = get();
    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);

    return assets.filter((asset) => {
      if (!asset.warrantyExpiry) return false;
      
      const expiryDate = new Date(asset.warrantyExpiry);
      const isExpiring = expiryDate <= ninetyDaysFromNow && expiryDate >= new Date();
      const matchesCompany = selectedCompany === 'all' || asset.company === selectedCompany;

      return isExpiring && matchesCompany && !asset.isDeleted;
    });
  },

  // Helper: Subscriptions expiring in the next 30 days
  getExpiringSubscriptions: () => {
    const { subscriptions, selectedCompany } = get();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    return subscriptions.filter((sub) => {
      const renewalDate = new Date(sub.renewalDate);
      const isExpiring = renewalDate <= thirtyDaysFromNow && renewalDate >= new Date();
      const matchesCompany = selectedCompany === 'all' || sub.company === selectedCompany;

      return isExpiring && matchesCompany && sub.status === 'Active';
    });
  },
  deleteAsset: async (id: string) => {
    try {
      await api.patch(`/assets/${id}/delete`); 
      set((state) => ({
        assets: state.assets.map(asset => 
          asset._id === id ? { ...asset, isDeleted: true } : asset
        )
      }));
    } catch (err) {
      console.error("Failed to delete asset:", err);
    }
  },
  addAsset: async (assetData, subscriptionData) => {
        set({ isLoading: true });
        try {
            const newAsset = await assetServices.createAsset(assetData, subscriptionData);
            set((state) => ({ 
                assets: [...state.assets, newAsset], 
                isLoading: false 
            }));
        } catch (err: any) {
            set({ isLoading: false });
            throw err;
        }
    },

  updateAsset: async (id, assetData) => {
    set({ isLoading: true });
    try {
      const response = await api.put(`/assets/${id}`, assetData);
      set((state) => ({
        assets: state.assets.map((a) => (a._id === id || a._id === id ? response.data : a)),
        isLoading: false
      }));
    } catch (err: any) {
      set({ error: err.response?.data?.error || "Failed to update asset", isLoading: false });
      throw err;
    }
  },
}));