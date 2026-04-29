const mongoose = require("mongoose");

const teacherSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
    school: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true },
  },
  { timestamps: true },
);

teacherSchema.index({ school: 1 });
teacherSchema.index({ subject: 1 });
teacherSchema.index({ school: 1, subject: 1 });

module.exports = mongoose.model("Teacher", teacherSchema);

