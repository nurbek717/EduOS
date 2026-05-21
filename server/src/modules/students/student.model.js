const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", required: true, index: true },
    fullname: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    parentPhone: { type: String, trim: true },
  },
  { timestamps: true, collection: "students" },
);

studentSchema.index({ tenantId: 1, branchId: 1 });

module.exports = mongoose.model("SaasStudent", studentSchema);
