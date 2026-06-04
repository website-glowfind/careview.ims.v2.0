import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema({
  referenceCode:      { type: String, required: true, unique: true },
  type:               { type: String, enum: ['License', 'Subscription'], required: true },
  company:            { type: String, enum: ['KHEALTH', 'CAREVIEW', 'GLOWFIND'], required: true },

  // Employee
  employeeName:       { type: String },
  position:           { type: String },
  branch:             { type: String },
  department:         { type: String },

  // License-specific
  licenseKey:         { type: String },
  numberOfSeats:      { type: Number },

  // Subscription-specific
  subscriptionName:   { type: String },
  accountNumber:      { type: String },
  accountDescription: { type: String },
  accountName:        { type: String },
  accountEmail:       { type: String },

  // Common
  name:               { type: String, required: true },
  provider:           { type: String, required: true },
  planType:           { type: String },
  category:           { type: String },
  status:             { type: String, enum: ['Active', 'Expired', 'Pending', 'Cancelled'], default: 'Active' },
  billingCycle:       { type: String, enum: ['Monthly', 'Quarterly', 'Annually', 'One-time'], required: true },
  cost:               { type: Number, default: 0 },
  currency:           { type: String, enum: ['$', '₱'], default: '$' },
  purchaseDate:       { type: Date },
  renewalDate:        { type: Date, required: true },
  startDate:          { type: Date },
  notes:              { type: String },
  modeOfPayment:      { type: String, enum: ['Credit Card', 'Cash', 'Deposit', 'Invoice'] },
  modeOfPaymentNote:  { type: String },
  autoRenewal:        { type: Boolean, default: true },
  deviceId:           { type: String },
}, { timestamps: true });

export const Subscription = mongoose.model("Subscription", subscriptionSchema);
