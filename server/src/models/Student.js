const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    class: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
    school: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true },
    monthlyFee: { type: Number, default: 0, min: 0 },
    // O'quvchining ota-onasi va uy manzili haqidagi qo'shimcha ma'lumotlar
    parentName: { type: String },
    parentPhone: { type: String },
    address: { type: String },
  },
  { timestamps: true },
);

studentSchema.index({ school: 1 });
studentSchema.index({ class: 1 });
studentSchema.index({ school: 1, class: 1 });

module.exports = mongoose.model("Student", studentSchema);

