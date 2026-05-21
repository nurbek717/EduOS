const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    planId: { type: mongoose.Schema.Types.ObjectId, ref: "Plan", required: true },
    startsAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true, index: true },
    status: { type: String, enum: ["active", "expired", "canceled", "trial", "pending"], default: "active" },
  },
  { timestamps: true, collection: "saas_subscriptions" },
);

subscriptionSchema.index({ tenantId: 1, status: 1 });

module.exports = mongoose.model("SaasSubscription", subscriptionSchema);
