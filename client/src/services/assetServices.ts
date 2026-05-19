import api from "./api";
import axios from "axios";
import type { ITAsset } from "@/types/inventory";

const handleAxiosError = (error: any) => {
    if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error || "Server error occurred");
    }
    throw new Error("An unknown error occurred");
};

export const assetServices = {
    getAllAssets: async (): Promise<ITAsset[]> => {
        try {
            const response = await api.get("/assets");
            return response.data;
        } catch (error) {
            throw handleAxiosError(error);
        }
    },

    createAsset: async (assetData: any, subscriptionData?: any) => {
        try {
            const response = await api.post("/assets/create", { assetData, subscriptionData });
            return response.data;
        } catch (error) {
            throw handleAxiosError(error);
        }
    },

    // 3. Update Asset
    updateAsset: async (id: string, assetData: Partial<ITAsset>) => {
        try {
            const response = await api.put(`/assets/${id}`, assetData);
            return response.data;
        } catch (error) {
            throw handleAxiosError(error);
        }
    },

    // 4. Soft Delete (Patch)
    softDeleteAsset: async (id: string) => {
        try {
            const response = await api.patch(`/assets/${id}/delete`);
            return response.data;
        } catch (error) {
            throw handleAxiosError(error);
        }
    }
};