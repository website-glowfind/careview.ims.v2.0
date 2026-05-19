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
    companyId: { type: String },
    brand: { type: String, required: true },
    model: { type: String, required: true },
    serialNumber: { type: String, required: true, unique: true },
    specifications: { type: String },
    status: {
        type: String,
        enum: ['active', 'in-maintenance', 'in-storage', 'available', 'disposed'],
        default: 'available'
    },
    assignedTo: { type: String },
    employeeId: { type: String },
    position: { type: String },
    department: { type: String },
    purchaseDate: { type: Date, required: true },
    warrantyExpiry: { type: Date },
    location: { type: String, required: true },
    notes: { type: String },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    disposalId: { type: String },
}, { timestamps: true });

export const Asset = mongoose.model("Asset", assetSchema);