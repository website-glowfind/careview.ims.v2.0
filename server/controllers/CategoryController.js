import { Category, DEFAULT_IT_CATEGORIES, DEFAULT_GENERAL_CATEGORIES } from "../models/Category.js";

// Seed built-in categories once (called on server startup)
export const seedCategories = async () => {
  try {
    const count = await Category.estimatedDocumentCount();
    if (count > 0) return;
    const docs = [
      ...DEFAULT_IT_CATEGORIES.map((name) => ({ name, assetType: 'IT', isDefault: true })),
      ...DEFAULT_GENERAL_CATEGORIES.map((name) => ({ name, assetType: 'General', isDefault: true })),
    ];
    await Category.insertMany(docs, { ordered: false });
    console.log("🌱 Seeded default categories");
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
    const assetType = req.body.assetType === 'General' ? 'General' : 'IT';
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
