const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    class: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
    school: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true },
    monthlyFee: { type: Number, default: 0, min: 0 },
    // O'quvchining ota-onasi va uy manzili haqidagi qo'shimcha ma'lumotlar
    studentCode: { type: String },
    birthDate: { type: Date },
    gender: { type: String, enum: ["male", "female", ""], default: "" },
    nationality: { type: String },
    birthCertSeries: { type: String },
    birthCertNumber: { type: String },
    status: { type: String, enum: ["active", "inactive", "graduated", ""], default: "active" },
    parentName: { type: String },
    parentPassport: { type: String },
    parentPhone: { type: String },
    region: { type: String },
    district: { type: String },
    address: { type: String },
    academicYear: { type: String },
    educationLanguage: { type: String },
    admissionOrderNumber: { type: String },
    admissionOrderDate: { type: Date },
    classAdmissionDate: { type: Date },
  },
  { timestamps: true },
);

studentSchema.index({ school: 1 });
studentSchema.index({ class: 1 });
studentSchema.index({ school: 1, class: 1 });

module.exports = mongoose.model("Student", studentSchema);

