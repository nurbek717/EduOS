const mongoose = require("mongoose");

const homeworkSubmissionSchema = new mongoose.Schema(
  {
    homework: { type: mongoose.Schema.Types.ObjectId, ref: "Homework", required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    school: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true },
    answerText: { type: String, default: "" },
    attachmentUrl: { type: String, default: null },
    attachmentOriginalName: { type: String, default: null },
    attachmentMimeType: { type: String, default: null },
    attachmentSize: { type: Number, default: null },
    submittedAt: { type: Date, default: Date.now },
    gradedScore: { type: Number, default: null },
    gradingComment: { type: String, default: "" },
    gradedAt: { type: Date, default: null },
    gradedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", default: null },
    gradeRef: { type: mongoose.Schema.Types.ObjectId, ref: "Grade", default: null },
  },
  { timestamps: true },
);

homeworkSubmissionSchema.index({ homework: 1, student: 1 }, { unique: true });
homeworkSubmissionSchema.index({ school: 1, submittedAt: -1 });
homeworkSubmissionSchema.index({ school: 1, gradedAt: -1 });

module.exports = mongoose.model("HomeworkSubmission", homeworkSubmissionSchema);
