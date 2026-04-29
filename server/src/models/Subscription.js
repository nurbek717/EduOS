const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true, unique: true, index: true },
    // Obuna tugash vaqti (server real time asosida)
    endAt: { type: Date, required: true, index: true },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

module.exports = mongoose.model("Subscription", subscriptionSchema);

