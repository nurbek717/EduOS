const mongoose = require("mongoose");

const tenantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "TenantUser", default: null },
    planId: { type: mongoose.Schema.Types.ObjectId, ref: "Plan", required: true },
    status: { type: String, enum: ["active", "suspended", "archived"], default: "active" },
  },
  { timestamps: true, collection: "tenants" },
);

tenantSchema.index({ ownerId: 1 });

tenantSchema.index({ status: 1 });

module.exports = mongoose.model("Tenant", tenantSchema);
