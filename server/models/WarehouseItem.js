import mongoose from "mongoose";

// MW warehouse stock item. The eleven workbook columns are kept as-is; the
// rest are system fields. Quantities may be null (blank in the workbook).
const activitySchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  user: String,
  action: String,
  description: String,
}, { _id: false });

const warehouseItemSchema = new mongoose.Schema({
  itemCode: { type: String, required: true, unique: true, trim: true },
  itemDescription: { type: String, required: true },
  department: { type: String, required: true },
  unit: { type: String, default: "" },
  beginningQty: { type: Number, default: null },
  received: { type: Number, default: null },
  issued: { type: Number, default: null },
  currentStock: { type: Number, default: null },
  location: { type: String, default: "" },
  remarks: { type: String, default: "" },
  status: { type: String, default: "AVAILABLE" },
  // Keeps workbook order for imported rows; new items sort after them
  order: { type: Number, default: () => Date.now() },
  createdBy: String,
  updatedBy: String,
  activity: [activitySchema],
}, { timestamps: true });

export const WarehouseItem = mongoose.model("WarehouseItem", warehouseItemSchema);
