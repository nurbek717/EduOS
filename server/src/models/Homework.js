const mongoose = require("mongoose");

const homeworkSchema = new mongoose.Schema(
  {
    subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true },
    school: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true },
    class: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
    description: { type: String, required: true },
    deadline: { type: Date, required: true },
    attachmentUrl: { type: String, default: null },
    attachmentOriginalName: { type: String, default: null },
    attachmentMimeType: { type: String, default: null },
    attachmentSize: { type: Number, default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Homework", homeworkSchema);

