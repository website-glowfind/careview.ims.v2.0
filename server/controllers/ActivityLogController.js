import { ActivityLog } from "../models/ActivityLog.js";

export const getLogs = async (req, res) => {
  try {
    const logs = await ActivityLog.find().sort({ createdAt: -1 }).limit(500);
    res.status(200).json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createLog = async (req, res) => {
  try {
    const log = await ActivityLog.create(req.body);
    res.status(201).json(log);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const clearLogs = async (req, res) => {
  try {
    await ActivityLog.deleteMany({});
    res.status(200).json({ message: "Activity log cleared" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
