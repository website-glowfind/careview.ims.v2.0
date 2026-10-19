import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
  name:      { type: String, required: true, lowercase: true, trim: true },
  // 'IT' = IT Inventory categories, 'General' = Asset List categories
  assetType: { type: String, enum: ['IT', 'General', 'StaffHouse', 'Vehicle', 'OfficeSupply', 'MW', 'MedicalEquipment'], default: 'IT' },
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
  'office chair', 'executive chair', 'visitor chair',
  'office table', 'executive table', 'conference table',
  'cabinet', 'filing cabinet', 'shelf', 'sofa', 'bench',
  'reception furniture', 'desk', 'partition', 'whiteboard',
  'air conditioner', 'appliance', 'locker', 'other',
];
