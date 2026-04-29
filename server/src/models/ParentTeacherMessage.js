const mongoose = require("mongoose");

const parentTeacherMessageSchema = new mongoose.Schema(
  {
    thread: { type: mongoose.Schema.Types.ObjectId, ref: "ParentTeacherThread", required: true },
    school: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true },
    senderUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    senderRole: { type: String, enum: ["parent", "teacher"], required: true },
    text: { type: String, required: true, trim: true, maxlength: 4000 },
  },
  { timestamps: true },
);

parentTeacherMessageSchema.index({ thread: 1, createdAt: 1 });
parentTeacherMessageSchema.index({ school: 1, createdAt: -1 });

module.exports = mongoose.model("ParentTeacherMessage", parentTeacherMessageSchema);
