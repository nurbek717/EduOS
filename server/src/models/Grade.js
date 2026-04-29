const mongoose = require("mongoose");

const gradeSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true },
    school: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true },
    homeworkSubmission: { type: mongoose.Schema.Types.ObjectId, ref: "HomeworkSubmission", default: null },
    examAttempt: { type: mongoose.Schema.Types.ObjectId, ref: "ExamAttempt", default: null },
    grade: { type: Number, required: true }, // e.g. 1-5 or 0-100
    date: { type: Date, required: true },
  },
  { timestamps: true },
);

gradeSchema.index({ school: 1 });
gradeSchema.index({ student: 1, date: -1 });
gradeSchema.index({ subject: 1, date: -1 });
gradeSchema.index({ school: 1, date: -1 });
gradeSchema.index({ homeworkSubmission: 1 }, { unique: true, sparse: true });
gradeSchema.index({ examAttempt: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("Grade", gradeSchema);

