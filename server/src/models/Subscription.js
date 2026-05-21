const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true, unique: true, index: true },
    plan: { type: mongoose.Schema.Types.ObjectId, ref: "Plan", default: null, index: true },
    planName: { type: String, trim: true, default: null },
    monthlyPrice: { type: Number, default: 0, min: 0 },
    totalPrice: { type: Number, default: 0, min: 0 },
    periodDays: { type: Number, default: 0, min: 0 },
    endAt: { type: Date, required: true, index: true },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

module.exports = mongoose.model("Subscription", subscriptionSchema);

