import { Subscription } from "../models/Subscription.js";

export const getSubscriptions = async (req, res) => {
    try {
        const subs = await Subscription.find();
        res.status(200).json(subs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};