import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema({
    referenceCode: { type: String, required: true, unique: true },
    type: { type: String, enum: ['License', 'Subscription'], required: true },
    name: { type: String, required: true },
    renewalDate: { type: Date, required: true },
    status: { type: String, enum: ['Active', 'Expired', 'Pending', 'Cancelled'], default: 'Active' },
    company: { type: String, enum: ['KHEALTH', 'CAREVIEW', 'GLOWFIND'], required: true },
    cost: { type: Number, default: 0 },
    autoRenewal: { type: Boolean, default: true }
}, { timestamps: true });

export const Subscription = mongoose.model("Subscription", subscriptionSchema);