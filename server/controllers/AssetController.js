import { Asset } from "../models/Asset.js";
import { Subscription } from "../models/Subscription.js";
import { ActivityLog } from "../models/ActivityLog.js";

const COMPANY_PREFIXES = { KHEALTH: 'KH', CAREVIEW: 'CV', GLOWFIND: 'GF' };
const CATEGORY_PREFIXES = { laptop: 'LT', desktop: 'DT', monitor: 'MN', keyboard: 'KB', mouse: 'MS', printer: 'PR', server: 'SV', networking: 'NW', mobile: 'MB', 'mobile + subscription': 'MB', phone: 'PH', tablet: 'TB', other: 'OT', furniture: 'FN', appliance: 'AP', fixture: 'FX', equipment: 'EQ', vehicle: 'VH' };
const DEVICE_CODE_PATTERN = /^[A-Z]{2}-[A-Z]{2}-(\d+)$/;

// Derive a 2-letter prefix for a custom/unknown category (matches the client)
function deriveCategoryPrefix(category) {
  const letters = String(category || '').replace(/[^a-zA-Z]/g, '');
  return letters.slice(0, 2).toUpperCase() || 'OT';
}

async function generateDeviceCode(company, category) {
  const allAssets = await Asset.find({}, 'deviceCode');
  let maxNumber = 0;
  allAssets.forEach(asset => {
    const match = asset.deviceCode?.match(DEVICE_CODE_PATTERN);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNumber) maxNumber = num;
    }
  });
  const companyPrefix = COMPANY_PREFIXES[company] || 'XX';
  const categoryPrefix = CATEGORY_PREFIXES[category] || deriveCategoryPrefix(category);
  return `${companyPrefix}-${categoryPrefix}-${(maxNumber + 1).toString().padStart(3, '0')}`;
}
export const getAssetById = async (req, res) => {
    try {
        const asset = await Asset.findById(req.params.id);
        if (!asset || asset.isDeleted) {
            return res.status(404).json({ error: "Asset not found" });
        }
        res.status(200).json(asset);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

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
        const assetData = req.body;
        assetData.deviceCode = await generateDeviceCode(assetData.company, assetData.category);
        const newAsset = await Asset.create(assetData);
        res.status(201).json(newAsset);
    } catch (error) {
        if (error.code === 11000) {
            const field = Object.keys(error.keyValue || {})[0] || 'field';
            const value = error.keyValue?.[field] || '';
            return res.status(400).json({ error: `Duplicate value: "${value}" is already used by another asset (${field}).` });
        }
        res.status(400).json({ error: error.message });
    }
};



export const updateAsset = async (req, res) => {
    try {
        const asset = await Asset.findById(req.params.id);
        if (!asset || asset.isDeleted) {
            return res.status(404).json({ error: "Asset not found" });
        }

        // Prevent deviceCode from being overwritten
        delete req.body.deviceCode;

        const updated = await Asset.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true, runValidators: true }
        );

        res.status(200).json(updated);
    } catch (error) {
        if (error.code === 11000) {
            const field = Object.keys(error.keyValue || {})[0] || 'field';
            const value = error.keyValue?.[field] || '';
            return res.status(400).json({ error: `Duplicate value: "${value}" is already used by another asset (${field}).` });
        }
        res.status(400).json({ error: error.message });
    }
};

export const deleteAsset = async (req, res) => {
    try {
        const asset = await Asset.findById(req.params.id);
        if (!asset) return res.status(404).json({ error: "Asset not found" });
        asset.isDeleted = true;
        asset.deletedAt = new Date();
        await asset.save();
        res.status(200).json({ message: "Asset deleted", asset });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const restoreAsset = async (req, res) => {
    try {
        const asset = await Asset.findById(req.params.id);
        if (!asset) return res.status(404).json({ error: "Asset not found" });
        asset.isDeleted = false;
        asset.deletedAt = undefined;
        await asset.save();
        res.status(200).json(asset);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getDeletedAssets = async (req, res) => {
    try {
        const assets = await Asset.find({ isDeleted: true });
        res.status(200).json(assets);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const addAsset = async (req, res) => {
    try {
        const { assetData, subscriptionData } = req.body;

        assetData.deviceCode = await generateDeviceCode(assetData.company, assetData.category);
        // General assets may have no serial — fall back to the (unique) asset code
        if (!assetData.serialNumber || !String(assetData.serialNumber).trim()) {
            assetData.serialNumber = assetData.deviceCode;
        }
        const newAsset = await Asset.create(assetData);

        if (assetData.category === 'mobile + subscription' && subscriptionData) {
            // Generate a global sequential reference code: IT-SUB-####
            const lastSub = await Subscription
                .findOne({ referenceCode: /^IT-SUB-\d+$/ })
                .sort({ referenceCode: -1 })
                .lean();
            let nextNum = 1;
            if (lastSub) {
                const match = lastSub.referenceCode.match(/^IT-SUB-(\d+)$/);
                if (match) nextNum = parseInt(match[1], 10) + 1;
            }
            const referenceCode = `IT-SUB-${nextNum.toString().padStart(4, '0')}`;

            const newSub = await Subscription.create({
                ...subscriptionData,
                referenceCode,
                type: 'Subscription',
                name: assetData.name, // Gamitin ang pangalan ng mobile
                company: assetData.company,
                employeeName: assetData.assignedTo,
                department: assetData.department,
                position: assetData.position,
                deviceId: newAsset._id, // I-link sa kakagawang asset
                status: 'Active'
            });

            // Log the auto-created subscription so it shows in its Activity Log
            try {
                await ActivityLog.create({
                    action: 'added',
                    category: 'subscription',
                    deviceCode: newSub.referenceCode,
                    deviceName: newSub.name,
                    company: newSub.company,
                    details: `Auto-created from asset ${newAsset.deviceCode} (${assetData.category})`,
                    performedBy: assetData.assignedTo || undefined,
                });
            } catch (logErr) {
                console.error("Subscription activity log failed:", logErr.message);
            }
        }

        res.status(201).json(newAsset);
    } catch (error) {
        console.error("Add Asset Error:", error);
        res.status(400).json({ error: error.message });
    }
};