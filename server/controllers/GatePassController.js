import mongoose from "mongoose";
import { GatePass } from "../models/GatePass.js";
import { StockMovement } from "../models/StockMovement.js";
import { WarehouseItem } from "../models/WarehouseItem.js";

const MAX_LINES = 10; // the paper form has ten item rows
const n = (v) => (v === null || v === undefined ? 0 : Number(v));

/** Next suggested number in the GP-YYYY-0001 series. */
async function nextNo(year = new Date().getFullYear()) {
  const prefix = `GP-${year}-`;
  const passes = await GatePass.find({ gatePassNo: { $regex: `^${prefix}` } }, "gatePassNo");
  const max = passes.reduce((m, p) => Math.max(m, parseInt(p.gatePassNo.slice(prefix.length), 10) || 0), 0);
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

// GET /api/v1/warehouse/gate-passes/next-number
export const getNextGatePassNo = async (_req, res) => {
  try { res.json({ gatePassNo: await nextNo() }); } catch (e) { res.status(500).json({ error: e.message }); }
};

// GET /api/v1/warehouse/gate-passes
export const getGatePasses = async (_req, res) => {
  try { res.json(await GatePass.find({}).sort({ createdAt: 1 })); } catch (e) { res.status(500).json({ error: e.message }); }
};

// GET /api/v1/warehouse/movements?itemId=
export const getMovements = async (req, res) => {
  try {
    const filter = req.query.itemId && mongoose.isValidObjectId(req.query.itemId) ? { itemId: req.query.itemId } : {};
    res.json(await StockMovement.find(filter).sort({ createdAt: 1 }));
  } catch (e) { res.status(500).json({ error: e.message }); }
};

/**
 * POST /api/v1/warehouse/gate-passes
 * IN raises Received, OUT raises Issued; Current Stock moves by the same quantity.
 * Beginning Qty is never touched. Lines not linked to an item leave stock alone.
 * Stock updates are guarded against concurrent changes and rolled back on failure.
 */
export const createGatePass = async (req, res) => {
  const b = req.body || {};
  const by = b.performedBy || "System";
  const errors = [];
  const head = {
    gatePassNo: String(b.gatePassNo || "").trim(), date: String(b.date || ""), requestingDepartment: String(b.requestingDepartment || "").trim(),
    requestor: String(b.requestor || "").trim(), material: b.material, destination: String(b.destination || "").trim(),
    preparedBy: String(b.preparedBy || "").trim(), preparedDate: b.preparedDate || "", receivedBy: String(b.receivedBy || "").trim(), receivedDate: b.receivedDate || "",
  };
  const lines = (Array.isArray(b.lines) ? b.lines : []).map((l) => ({
    itemId: l.itemId && mongoose.isValidObjectId(l.itemId) ? String(l.itemId) : undefined,
    description: String(l.description || "").trim(), quantity: Number(l.quantity), remarks: String(l.remarks || ""),
  }));

  if (!head.gatePassNo) errors.push("Gate Pass No. is required.");
  if (!head.date) errors.push("Date is required.");
  if (!head.requestingDepartment) errors.push("Requesting Department is required.");
  if (!head.requestor) errors.push("Requestor / Employee is required.");
  if (head.material !== "IN" && head.material !== "OUT") errors.push("Choose Material IN or OUT.");
  if (!head.destination) errors.push("Destination is required.");
  if (!head.preparedBy) errors.push("Prepared by is required.");
  if (lines.length === 0) errors.push("Add at least one item.");
  if (lines.length > MAX_LINES) errors.push(`A gate pass can have at most ${MAX_LINES} items.`);
  lines.forEach((l, i) => {
    if (!l.description) errors.push(`Item ${i + 1}: description is required.`);
    if (!(l.quantity > 0)) errors.push(`Item ${i + 1}: enter a quantity greater than 0.`);
  });
  const linked = lines.filter((l) => l.itemId);
  if (new Set(linked.map((l) => l.itemId)).size !== linked.length) errors.push("The same warehouse item appears on more than one row — combine them into one row.");
  if (errors.length) return res.status(400).json({ error: errors[0], errors });

  try {
    if (await GatePass.exists({ gatePassNo: head.gatePassNo })) return res.status(400).json({ error: `Gate Pass No. ${head.gatePassNo} already exists.` });

    const items = await WarehouseItem.find({ _id: { $in: linked.map((l) => l.itemId) } });
    const byId = new Map(items.map((i) => [String(i._id), i]));
    for (const l of linked) {
      const item = byId.get(l.itemId);
      if (!item) return res.status(400).json({ error: `A linked warehouse item no longer exists (${l.description}).` });
      if (head.material === "OUT" && l.quantity > n(item.currentStock)) {
        return res.status(400).json({ error: `${item.itemCode}: only ${n(item.currentStock)} in stock, cannot issue ${l.quantity}.` });
      }
    }

    const applied = [];
    const rollback = async () => {
      for (const a of applied.reverse()) {
        await WarehouseItem.updateOne({ _id: a.id }, { $set: { currentStock: a.currentStock, received: a.received, issued: a.issued }, $pop: { activity: 1 } });
      }
    };

    const movements = [];
    for (const l of linked) {
      const item = byId.get(l.itemId);
      const previous = n(item.currentStock);
      const next = head.material === "IN" ? previous + l.quantity : previous - l.quantity;
      const set = { currentStock: next, updatedBy: by };
      if (head.material === "IN") set.received = n(item.received) + l.quantity; else set.issued = n(item.issued) + l.quantity;
      // Only apply if nobody changed the stock since we read it
      const r = await WarehouseItem.updateOne(
        { _id: item._id, currentStock: item.currentStock ?? null, received: item.received ?? null, issued: item.issued ?? null },
        { $set: set, $push: { activity: { user: by, action: `Material ${head.material}`, description: `Gate Pass ${head.gatePassNo}: ${l.quantity} ${head.material === "IN" ? "received" : "issued"} (stock ${previous} → ${next})` } } },
      );
      if (r.matchedCount === 0) {
        await rollback();
        return res.status(409).json({ error: `${item.itemCode} changed while posting. Nothing was saved — please try again.` });
      }
      applied.push({ id: item._id, currentStock: item.currentStock ?? null, received: item.received ?? null, issued: item.issued ?? null });
      l.itemCode = item.itemCode;
      movements.push({
        date: head.date, gatePassNo: head.gatePassNo, itemId: item._id, itemCode: item.itemCode, itemDescription: item.itemDescription,
        department: item.department, movementType: head.material, quantity: l.quantity, previousStock: previous, currentStock: next,
        destination: head.destination, requestor: head.requestor, preparedBy: head.preparedBy, receivedBy: head.receivedBy, remarks: l.remarks,
      });
    }

    let pass;
    try {
      pass = await GatePass.create({ ...head, lines, createdBy: by });
      if (movements.length) await StockMovement.insertMany(movements.map((m) => ({ ...m, gatePassId: pass._id })));
    } catch (e) {
      await rollback();
      if (pass) await GatePass.deleteOne({ _id: pass._id });
      const dup = e && e.code === 11000;
      return res.status(dup ? 400 : 500).json({ error: dup ? `Gate Pass No. ${head.gatePassNo} already exists.` : e.message });
    }

    res.status(201).json({ gatePass: pass, movementCount: movements.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
};
