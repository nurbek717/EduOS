const mongoose = require("mongoose");

const subjectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // e.g. "Matematika"
    school: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true },
  },
  { timestamps: true },
);

subjectSchema.index({ school: 1 });
subjectSchema.index({ school: 1, name: 1 });

module.exports = mongoose.model("Subject", subjectSchema);

