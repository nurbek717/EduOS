const mongoose = require("mongoose");

const examAttemptSchema = new mongoose.Schema(
  {
    exam: { type: mongoose.Schema.Types.ObjectId, ref: "Exam", required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    school: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true },
    class: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
    startedAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    finishedAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ["in_progress", "submitted", "awaiting_manual_review", "evaluated", "expired"],
      default: "in_progress",
    },
    autoScore: { type: Number, default: 0, min: 0 },
    manualScore: { type: Number, default: 0, min: 0 },
    totalScore: { type: Number, default: 0, min: 0 },
    maxScore: { type: Number, required: true, min: 1 },
    isFinalScore: { type: Boolean, default: false },
    submittedAnswersCount: { type: Number, default: 0, min: 0 },
    timeSpentSeconds: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

examAttemptSchema.index({ exam: 1, student: 1 }, { unique: true });
examAttemptSchema.index({ school: 1, student: 1, createdAt: -1 });
examAttemptSchema.index({ school: 1, exam: 1, status: 1 });

module.exports = mongoose.model("ExamAttempt", examAttemptSchema);
