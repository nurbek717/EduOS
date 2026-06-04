const mongoose = require("mongoose");

const classSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    school: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: "SchoolBranch", default: null },
    classTeacher: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", default: null },
  },
  { timestamps: true },
);

classSchema.index({ school: 1 });
classSchema.index({ school: 1, name: 1 });

module.exports = mongoose.model("Class", classSchema);

