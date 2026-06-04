import { Subscription } from "../models/Subscription.js";

export const getSubscriptions = async (req, res) => {
  try {
    const subs = await Subscription.find().sort({ createdAt: -1 });
    res.status(200).json(subs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createSubscription = async (req, res) => {
  try {
    const newSub = await Subscription.create(req.body);
    res.status(201).json(newSub);
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue || {})[0] || 'field';
      const value = error.keyValue?.[field] || '';
      return res.status(400).json({ error: `Duplicate value: "${value}" already exists (${field}).` });
    }
    res.status(400).json({ error: error.message });
  }
};

export const updateSubscription = async (req, res) => {
  try {
    const sub = await Subscription.findById(req.params.id);
    if (!sub) return res.status(404).json({ error: "Subscription not found" });
    delete req.body.referenceCode;
    const updated = await Subscription.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    res.status(200).json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const deleteSubscription = async (req, res) => {
  try {
    const sub = await Subscription.findByIdAndDelete(req.params.id);
    if (!sub) return res.status(404).json({ error: "Subscription not found" });
    res.status(200).json({ message: "Subscription deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
