import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema({
  action:     { type: String, enum: ['added', 'edited', 'deleted', 'transferred', 'disposed', 'restored'], required: true },
  category:   { type: String, enum: ['asset', 'subscription', 'user'], required: true },
  deviceCode: { type: String, required: true },
  deviceName: { type: String, required: true },
  company:    { type: String, enum: ['KHEALTH', 'CAREVIEW', 'GLOWFIND'], required: true },
  fromCompany:{ type: String, enum: ['KHEALTH', 'CAREVIEW', 'GLOWFIND'] },
  toCompany:  { type: String, enum: ['KHEALTH', 'CAREVIEW', 'GLOWFIND'] },
  details:    { type: String },
  performedBy:{ type: String },
}, { timestamps: true });

export const ActivityLog = mongoose.model("ActivityLog", activityLogSchema);
