import mongoose from "mongoose";

// One stock change on a warehouse item, created when a Gate Pass is posted.
const stockMovementSchema = new mongoose.Schema({
  date: String, // gate pass date, yyyy-mm-dd
  gatePassId: { type: mongoose.Schema.Types.ObjectId, ref: "GatePass" },
  gatePassNo: String,
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: "WarehouseItem" },
  itemCode: String,
  itemDescription: String,
  department: String,
  movementType: { type: String, enum: ["IN", "OUT"] },
  quantity: Number,
  previousStock: Number,
  currentStock: Number,
  destination: String,
  requestor: String,
  preparedBy: String,
  receivedBy: String,
  remarks: String,
}, { timestamps: true });

stockMovementSchema.index({ itemId: 1, createdAt: -1 });

export const StockMovement = mongoose.model("StockMovement", stockMovementSchema);
