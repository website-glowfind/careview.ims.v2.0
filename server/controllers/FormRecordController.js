import { FormRecord } from "../models/FormRecord.js";

export const getFormRecords = async (req, res) => {
  try {
    const { company, formType } = req.query;
    const filter = {};
    if (company && company !== 'all') filter.company = company;
    if (formType) filter.formType = formType;

    const records = await FormRecord.find(filter).sort({ createdAt: -1 }).limit(500);
    res.status(200).json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const createFormRecord = async (req, res) => {
  try {
    const data = req.body;

    // Prevent duplicates: if a record for the same form type + asset tag +
    // employee already exists, return it instead of adding another.
    if (data.formType && data.assetTag) {
      const existing = await FormRecord.findOne({
        formType: data.formType,
        assetTag: data.assetTag,
        employeeName: data.employeeName ?? null,
      });
      if (existing) return res.status(200).json(existing);
    }

    const record = new FormRecord(data);
    const saved = await record.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const deleteFormRecord = async (req, res) => {
  try {
    await FormRecord.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
