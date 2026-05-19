import { Asset } from "../models/Asset.js";
import {Subscription} from "../models/Subscription.js";
export const getAssets = async (req, res) => {
    try {
        // Kunin lahat ng assets na hindi pa 'deleted'
        const assets = await Asset.find({ isDeleted: false });
        res.status(200).json(assets);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const createAsset = async (req, res) => {
    try {
        const newAsset = await Asset.create(req.body);
        res.status(201).json(newAsset);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};



export const addAsset = async (req, res) => {
    try {
        const { assetData, subscriptionData } = req.body;

        const newAsset = await Asset.create(assetData);

        if (assetData.category === 'phone' && subscriptionData) {
            await Subscription.create({
                ...subscriptionData,
                name: assetData.name, // Gamitin ang pangalan ng phone
                company: assetData.company,
                deviceId: newAsset._id, // I-link sa kakagawang asset
                status: 'Active'
            });
        }

        res.status(201).json(newAsset);
    } catch (error) {
        console.error("Add Asset Error:", error);
        res.status(400).json({ error: error.message });
    }
};