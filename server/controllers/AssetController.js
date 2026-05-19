import { Asset } from "../models/Asset.js";
import { Subscription } from "../models/Subscription.js";

const COMPANY_PREFIXES = { KHEALTH: 'KH', CAREVIEW: 'CV', GLOWFIND: 'GF' };
const CATEGORY_PREFIXES = { laptop: 'LT', desktop: 'DT', monitor: 'MN', keyboard: 'KB', mouse: 'MS', printer: 'PR', server: 'SV', networking: 'NW', phone: 'PH', tablet: 'TB', other: 'OT' };
const DEVICE_CODE_PATTERN = /^[A-Z]{2}-[A-Z]{2}-(\d+)$/;

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
  const categoryPrefix = CATEGORY_PREFIXES[category] || 'OT';
  return `${companyPrefix}-${categoryPrefix}-${(maxNumber + 1).toString().padStart(3, '0')}`;
}
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
        res.status(400).json({ error: error.message });
    }
};



export const addAsset = async (req, res) => {
    try {
        const { assetData, subscriptionData } = req.body;

        assetData.deviceCode = await generateDeviceCode(assetData.company, assetData.category);
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