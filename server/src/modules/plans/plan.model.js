const mongoose = require("mongoose");

const planSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    maxStudents: { type: Number, required: true },
    maxBranches: { type: Number, required: true },
    features: {
      analytics: { type: Boolean, default: false },
      ai: { type: Boolean, default: false },
      payment: { type: Boolean, default: false },
      attendanceReports: { type: Boolean, default: false },
      finance: { type: Boolean, default: false },
    },
    price: { type: Number, required: true },
  },
  { timestamps: true, collection: "plans" },
);

module.exports = mongoose.model("Plan", planSchema);
