import api from "./api";
import axios from "axios";
import type { ITAsset, AssetAttachment } from "@/types/inventory";

const handleAxiosError = (error: any) => {
    if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error || "Server error occurred");
    }
    throw new Error("An unknown error occurred");
};

export const assetServices = {
    getAssetById: async (id: string): Promise<ITAsset> => {
        try {
            const response = await api.get(`/assets/${id}`);
            return response.data;
        } catch (error) {
            throw handleAxiosError(error);
        }
    },

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
    },

    // 5. Upload attachments (images, PDFs, docs) — returns stored file metadata
    uploadFiles: async (files: File[]): Promise<AssetAttachment[]> => {
        try {
            const fd = new FormData();
            files.forEach((f) => fd.append("files", f));
            const response = await api.post("/uploads", fd, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            return response.data.files as AssetAttachment[];
        } catch (error) {
            throw handleAxiosError(error);
        }
    },
};