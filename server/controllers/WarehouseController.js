import { WarehouseItem } from "../models/WarehouseItem.js";
import { WAREHOUSE_SEED, WAREHOUSE_DEPARTMENT_TABS, WAREHOUSE_TAB_NOTES } from "../data/mwWarehouseSeed.js";

const FIELDS = ["itemCode", "itemDescription", "department", "unit", "beginningQty", "received", "issued", "currentStock", "location", "remarks", "status"];
const NUMERIC = ["beginningQty", "received", "issued", "currentStock"];
const LABEL = {
  itemCode: "Item Code", itemDescription: "Item Description", department: "Department", unit: "Unit", beginningQty: "Beginning Qty",
  received: "Received", issued: "Issued", currentStock: "Current Stock", location: "Location", remarks: "Remarks", status: "Status",
};

const num = (v) => (v === "" || v === null || v === undefined ? null : Number(v));

/** Pick the workbook fields from a request body, normalising quantities. */
function clean(body) {
  const out = {};
  for (const k of FIELDS) {
    if (body[k] === undefined) continue;
    out[k] = NUMERIC.includes(k) ? num(body[k]) : String(body[k] ?? "");
  }
  return out;
}

function invalid(d) {
  if (!d.itemCode || !String(d.itemCode).trim()) return "Item code is required.";
  if (!d.itemDescription || !String(d.itemDescription).trim()) return "Item description is required.";
  if (!d.department || !String(d.department).trim()) return "Department is required.";
  for (const k of NUMERIC) {
    if (d[k] !== null && d[k] !== undefined && !(d[k] >= 0)) return `${LABEL[k]} must be a number, 0 or more.`;
  }
  return null;
}

// GET /api/v1/warehouse/meta
export const getMeta = async (_req, res) => {
  try {
    const codes = WAREHOUSE_SEED.map((r) => r.itemCode);
    const imported = await WarehouseItem.countDocuments({ itemCode: { $in: codes } });
    res.json({ departmentTabs: WAREHOUSE_DEPARTMENT_TABS, tabNotes: WAREHOUSE_TAB_NOTES, workbookCount: codes.length, workbookImported: imported });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// GET /api/v1/warehouse/items
export const getItems = async (_req, res) => {
  try { res.json(await WarehouseItem.find({}).sort({ order: 1, createdAt: 1 })); }
  catch (e) { res.status(500).json({ error: e.message }); }
};

// POST /api/v1/warehouse/items
export const createItem = async (req, res) => {
  try {
    const d = clean(req.body);
    d.itemCode = (d.itemCode || "").trim();
    const bad = invalid(d);
    if (bad) return res.status(400).json({ error: bad });
    if (await WarehouseItem.exists({ itemCode: d.itemCode })) return res.status(400).json({ error: `Item code ${d.itemCode} already exists.` });
    const by = req.body.performedBy || "System";
    const item = await WarehouseItem.create({
      ...d, createdBy: by, updatedBy: by,
      activity: [{ user: by, action: "Item Added", description: `${d.itemCode} added to ${d.department}` }],
    });
    res.status(201).json(item);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// PUT /api/v1/warehouse/items/:id — the item code is permanent
export const updateItem = async (req, res) => {
  try {
    const item = await WarehouseItem.findById(req.params.id);
    if (!item) return res.status(404).json({ error: "Item not found." });
    const d = clean(req.body);
    delete d.itemCode;
    const bad = invalid({ ...item.toObject(), ...d });
    if (bad) return res.status(400).json({ error: bad });
    const changes = Object.keys(d)
      .filter((k) => String(item[k] ?? "") !== String(d[k] ?? ""))
      .map((k) => `${LABEL[k]}: "${item[k] ?? ""}" → "${d[k] ?? ""}"`);
    if (changes.length === 0) return res.json(item);
    const by = req.body.performedBy || "System";
    Object.assign(item, d, { updatedBy: by });
    item.activity.push({ user: by, action: "Item Updated", description: changes.join("; ") });
    await item.save();
    res.json(item);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

/** Insert rows whose item code does not exist yet; existing codes are left untouched. */
async function insertNew(rows, by, action, description, orderBase) {
  const found = await WarehouseItem.find({ itemCode: { $in: rows.map((r) => r.itemCode) } }, "itemCode");
  const existing = new Set(found.map((i) => i.itemCode));
  const toInsert = rows
    .filter((r) => !existing.has(r.itemCode))
    .map((r, i) => ({ ...r, order: orderBase + i, createdBy: by, updatedBy: by, activity: [{ user: by, action, description }] }));
  if (toInsert.length) await WarehouseItem.insertMany(toInsert, { ordered: false });
  return {
    inserted: toInsert.length,
    skipped: rows.length - toInsert.length,
    skippedCodes: rows.filter((r) => existing.has(r.itemCode)).map((r) => r.itemCode),
  };
}

// POST /api/v1/warehouse/import-workbook — loads the 139 workbook items (safe to run again)
export const importWorkbook = async (req, res) => {
  try {
    const by = (req.body && req.body.performedBy) || "System";
    res.json(await insertNew(WAREHOUSE_SEED, by, "Item Imported", "Loaded from MW WAREHOUSE INVENTORY 2026 workbook without changes", 0));
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// POST /api/v1/warehouse/items/bulk { rows } — Excel upload; only new item codes are added
export const bulkImport = async (req, res) => {
  try {
    const rows = Array.isArray(req.body && req.body.rows) ? req.body.rows : [];
    if (!rows.length) return res.status(400).json({ error: "No rows to import." });
    const errors = [];
    const valid = [];
    const seen = new Set();
    rows.forEach((raw, i) => {
      const d = clean(raw);
      d.itemCode = (d.itemCode || "").trim();
      if (!d.status) d.status = "AVAILABLE";
      const bad = invalid(d);
      if (bad) errors.push(`Row ${i + 2}: ${bad}`);
      else if (seen.has(d.itemCode)) errors.push(`Row ${i + 2}: duplicate item code ${d.itemCode} in the file`);
      else { seen.add(d.itemCode); valid.push(d); }
    });
    const by = req.body.performedBy || "System";
    const result = valid.length
      ? await insertNew(valid, by, "Item Imported", "Imported from Excel upload", Date.now())
      : { inserted: 0, skipped: 0, skippedCodes: [] };
    res.json({ ...result, errors });
  } catch (e) { res.status(500).json({ error: e.message }); }
};
