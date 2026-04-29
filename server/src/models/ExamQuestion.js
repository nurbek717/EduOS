const mongoose = require("mongoose");

const optionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },
    text: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const examQuestionSchema = new mongoose.Schema(
  {
    exam: { type: mongoose.Schema.Types.ObjectId, ref: "Exam", required: true },
    school: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true },
    class: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
    questionText: { type: String, required: true, trim: true },
    type: { type: String, enum: ["test", "text"], required: true },
    options: { type: [optionSchema], default: [] },
    correctAnswer: { type: String, default: null },
    points: { type: Number, required: true, min: 1, max: 100, default: 1 },
    order: { type: Number, required: true, min: 1 },
  },
  { timestamps: true },
);

examQuestionSchema.index({ exam: 1, order: 1 }, { unique: true });
examQuestionSchema.index({ school: 1, exam: 1 });

module.exports = mongoose.model("ExamQuestion", examQuestionSchema);
