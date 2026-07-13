import mongoose from "mongoose";

const formRecordSchema = new mongoose.Schema({
  formType:               { type: String, enum: ['Asset Issuance', 'Inventory Management', 'Subscription Management', 'Asset Transfer', 'Asset Disposal', 'New User Transfer'], default: 'Asset Transfer' },
  assignedTo:             { type: String },
  position:               { type: String },
  deviceCode:             { type: String },
  assetTag:               { type: String },
  referenceId:            { type: String },
  employeeName:           { type: String },
  department:             { type: String },
  company:                { type: String, enum: ['KHEALTH', 'CAREVIEW', 'GLOWFIND'] },
  fromCompany:            { type: String, enum: ['KHEALTH', 'CAREVIEW', 'GLOWFIND'] },
  toCompany:              { type: String, enum: ['KHEALTH', 'CAREVIEW', 'GLOWFIND'] },
  location:               { type: String },
  brand:                  { type: String },
  category:               { type: String },
  name:                   { type: String },
  status:                 { type: String, enum: ['Active', 'Returned', 'Disposed', 'Completed'], default: 'Active' },
  details:                { type: String },
  createdBy:              { type: String, required: true },
  relatedAssetId:         { type: String },
  relatedSubscriptionId:  { type: String },
  formData:               { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

export const FormRecord = mongoose.model("FormRecord", formRecordSchema);
