const mongoose = require("mongoose");

const timetableSchema = new mongoose.Schema(
  {
    class: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true },
    school: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true },
    dayOfWeek: {
      type: Number,
      required: true,
      min: 0,
      max: 6, // 0 = Sunday, 1 = Monday, ...
    },
    startTime: { type: String, required: true }, // "08:00"
    endTime: { type: String, required: true }, // "08:45"
    room: { type: String },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Timetable", timetableSchema);

