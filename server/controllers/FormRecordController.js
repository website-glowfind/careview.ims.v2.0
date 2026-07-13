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
    const record = new FormRecord(req.body);
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
