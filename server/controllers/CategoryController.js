import { Category, DEFAULT_IT_CATEGORIES, DEFAULT_GENERAL_CATEGORIES } from "../models/Category.js";

// Ensure built-in categories exist (called on server startup). Idempotent —
// inserts only the defaults that are missing, so newly added defaults (e.g.
// "mini pc") get created without duplicating existing rows.
export const seedCategories = async () => {
  try {
    const defaults = [
      ...DEFAULT_IT_CATEGORIES.map((name) => ({ name, assetType: 'IT' })),
      ...DEFAULT_GENERAL_CATEGORIES.map((name) => ({ name, assetType: 'General' })),
    ];
    const ops = defaults.map((d) => ({
      updateOne: {
        filter: { name: d.name, assetType: d.assetType },
        update: { $setOnInsert: { name: d.name, assetType: d.assetType, isDefault: true } },
        upsert: true,
      },
    }));
    const res = await Category.bulkWrite(ops, { ordered: false });
    const added = res.upsertedCount || 0;
    if (added > 0) console.log(`🌱 Seeded ${added} default categor${added === 1 ? 'y' : 'ies'}`);
  } catch (e) {
    console.error("Category seed skipped:", e.message);
  }
};

// GET /api/v1/categories?assetType=IT|General
export const getCategories = async (req, res) => {
  try {
    const { assetType } = req.query;
    const filter = assetType ? { assetType } : {};
    const categories = await Category.find(filter).sort({ createdAt: 1 });
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /api/v1/categories  { name, assetType }
export const createCategory = async (req, res) => {
  try {
    const name = String(req.body.name || '').toLowerCase().trim();
    const allowed = ['IT', 'General', 'StaffHouse', 'Vehicle'];
    const assetType = allowed.includes(req.body.assetType) ? req.body.assetType : 'IT';
    if (!name) return res.status(400).json({ error: "Category name is required" });

    const existing = await Category.findOne({ name, assetType });
    if (existing) return res.status(200).json(existing); // idempotent

    const category = await Category.create({ name, assetType, isDefault: false });
    res.status(201).json(category);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// DELETE /api/v1/categories/:id
export const deleteCategory = async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Category deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
