const mongoose = require("mongoose");

const branchSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    name: { type: String, required: true, trim: true },
    address: { type: String, default: "", trim: true },
  },
  { timestamps: true, collection: "branches" },
);

branchSchema.index({ tenantId: 1, name: 1 });

module.exports = mongoose.model("Branch", branchSchema);
