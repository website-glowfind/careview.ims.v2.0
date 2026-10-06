import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
  name:      { type: String, required: true, lowercase: true, trim: true },
  // 'IT' = IT Inventory categories, 'General' = Asset List categories
  assetType: { type: String, enum: ['IT', 'General', 'StaffHouse', 'Vehicle'], default: 'IT' },
  isDefault: { type: Boolean, default: false },
}, { timestamps: true });

// A category name is unique within its asset type
categorySchema.index({ name: 1, assetType: 1 }, { unique: true });

export const Category = mongoose.model("Category", categorySchema);

// Built-in defaults, seeded on first run
export const DEFAULT_IT_CATEGORIES = [
  'laptop', 'desktop', 'monitor', 'keyboard', 'mouse', 'printer',
  'server', 'networking', 'mobile', 'mobile + subscription', 'tablet', 'other', 'mini pc',
];
export const DEFAULT_GENERAL_CATEGORIES = [
  'furniture', 'appliance', 'fixture', 'equipment', 'vehicle', 'other',
];
