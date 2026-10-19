import mongoose from "mongoose";

// Warehouse Gate Pass — Material IN or OUT. Lines linked to a warehouse item
// (itemId) move its stock; free-text lines are recorded but leave stock alone.
const lineSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: "WarehouseItem" },
  itemCode: String,
  description: { type: String, required: true },
  quantity: { type: Number, required: true },
  remarks: { type: String, default: "" },
}, { _id: false });

const gatePassSchema = new mongoose.Schema({
  gatePassNo: { type: String, required: true, unique: true, trim: true },
  date: { type: String, required: true }, // yyyy-mm-dd
  requestingDepartment: { type: String, required: true },
  requestor: { type: String, required: true },
  material: { type: String, enum: ["IN", "OUT"], required: true },
  lines: [lineSchema],
  destination: { type: String, required: true },
  preparedBy: { type: String, required: true },
  preparedDate: String,
  receivedBy: String,
  receivedDate: String,
  createdBy: String,
}, { timestamps: true });

export const GatePass = mongoose.model("GatePass", gatePassSchema);
