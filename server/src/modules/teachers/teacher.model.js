const mongoose = require("mongoose");

const teacherSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", required: true, index: true },
    fullname: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    subject: { type: String, trim: true },
  },
  { timestamps: true, collection: "teachers" },
);

teacherSchema.index({ tenantId: 1, branchId: 1 });

module.exports = mongoose.model("SaasTeacher", teacherSchema);
