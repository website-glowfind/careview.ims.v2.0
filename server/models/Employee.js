import mongoose from "mongoose";

const employeeSchema = new mongoose.Schema({
  fullName:   { type: String, required: true },
  employeeId: { type: String, required: true, unique: true },
  department: { type: String, default: '' },
  position:   { type: String, default: '' },
  company:    { type: String, enum: ['KHEALTH', 'CAREVIEW', 'GLOWFIND'], required: true },
}, { timestamps: true });

employeeSchema.index({ company: 1 });
employeeSchema.index({ department: 1 });

export const Employee = mongoose.model("Employee", employeeSchema);
