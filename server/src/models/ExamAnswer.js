const mongoose = require("mongoose");

const examAnswerSchema = new mongoose.Schema(
  {
    attempt: { type: mongoose.Schema.Types.ObjectId, ref: "ExamAttempt", required: true },
    exam: { type: mongoose.Schema.Types.ObjectId, ref: "Exam", required: true },
    question: { type: mongoose.Schema.Types.ObjectId, ref: "ExamQuestion", required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    school: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true },
    type: { type: String, enum: ["test", "text"], required: true },
    answer: { type: String, default: "" },
    isCorrect: { type: Boolean, default: null },
    needsManualReview: { type: Boolean, default: false },
    awardedScore: { type: Number, default: null, min: 0 },
    maxScore: { type: Number, required: true, min: 1 },
    evaluationMode: { type: String, enum: ["auto", "manual"], default: "auto" },
    evaluatedByUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    evaluatedAt: { type: Date, default: null },
    gradingComment: { type: String, default: "" },
  },
  { timestamps: true },
);

examAnswerSchema.index({ attempt: 1, question: 1 }, { unique: true });
examAnswerSchema.index({ school: 1, exam: 1, question: 1 });
examAnswerSchema.index({ school: 1, student: 1, createdAt: -1 });

module.exports = mongoose.model("ExamAnswer", examAnswerSchema);
