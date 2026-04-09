const mongoose = require("mongoose");

const parentTeacherThreadSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true },
    targetType: {
      type: String,
      enum: ["class_teacher", "subject_teacher"],
      required: true,
    },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", default: null },
    lastMessageAt: { type: Date, default: Date.now },
    lastSenderRole: {
      type: String,
      enum: ["parent", "teacher", null],
      default: null,
    },
  },
  { timestamps: true },
);

parentTeacherThreadSchema.index({ school: 1, parent: 1, lastMessageAt: -1 });
parentTeacherThreadSchema.index({ school: 1, teacher: 1, lastMessageAt: -1 });
parentTeacherThreadSchema.index(
  { school: 1, parent: 1, student: 1, teacher: 1, targetType: 1, subject: 1 },
  { unique: true },
);

module.exports = mongoose.model("ParentTeacherThread", parentTeacherThreadSchema);
