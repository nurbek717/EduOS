const mongoose = require("mongoose");

const examSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    school: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true },
    class: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
    durationMinutes: { type: Number, required: true, min: 1, max: 600 },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    isPublished: { type: Boolean, default: false },
    createdByUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    createdByTeacher: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", default: null },
    createdByRole: {
      type: String,
      enum: ["teacher", "school_admin", "super_admin"],
      required: true,
    },
  },
  { timestamps: true },
);

examSchema.index({ school: 1, class: 1, startTime: 1, endTime: 1 });
examSchema.index({ school: 1, createdByUser: 1, createdAt: -1 });
examSchema.index({ school: 1, isPublished: 1, startTime: 1, endTime: 1 });

module.exports = mongoose.model("Exam", examSchema);
