import mongoose from "mongoose";

const assetSchema = new mongoose.Schema({
    deviceCode: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    category: {
        type: String,
        enum: ['laptop', 'desktop', 'monitor', 'keyboard', 'mouse', 'printer', 'server', 'networking', 'mobile', 'mobile + subscription', 'phone', 'tablet', 'other',
               'furniture', 'appliance', 'fixture', 'equipment', 'vehicle'],
        required: true
    },
    // 'IT' = IT Inventory (default); 'General' = Asset List (appliances, furniture, etc.)
    assetType: { type: String, enum: ['IT', 'General'], default: 'IT' },
    company: { type: String, enum: ['KHEALTH', 'CAREVIEW', 'GLOWFIND'], required: true },
    companyId: { type: String },
    brand: { type: String },
    model: { type: String },
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
    // Uploaded files (images, PDFs, docs) attached to this asset
    attachments: [{
        name: { type: String },
        url:  { type: String },
        type: { type: String },
        size: { type: Number },
    }],
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    disposalId: { type: String },
}, { timestamps: true });

export const Asset = mongoose.model("Asset", assetSchema);