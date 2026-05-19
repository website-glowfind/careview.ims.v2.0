import mongoose from "mongoose";

const assetSchema = new mongoose.Schema({
    deviceCode: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    category: { 
        type: String, 
        enum: ['laptop', 'desktop', 'monitor', 'keyboard', 'mouse', 'printer', 'server', 'networking', 'phone', 'tablet', 'other'],
        required: true 
    },
    company: { type: String, enum: ['KHEALTH', 'CAREVIEW', 'GLOWFIND'], required: true },
    brand: { type: String, required: true },
    model: { type: String, required: true },
    serialNumber: { type: String, required: true, unique: true },
    status: { 
        type: String, 
        enum: ['active', 'in-maintenance', 'in-storage', 'available', 'disposed'], 
        default: 'available' 
    },
    purchaseDate: { type: Date, required: true },
    warrantyExpiry: { type: Date },
    assignedTo: { type: String },
    location: { type: String, required: true },
    isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

export const Asset = mongoose.model("Asset", assetSchema);