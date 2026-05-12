const mongoose = require("mongoose");

/**
 * Faqat `active` o'quvchi o'chirilganda yoziladi — `inactive`/`graduated` allaqachon status bo'yicha hisoblanadi.
 */
const studentDepartureAuditSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true, index: true },
    occurredAt: { type: Date, required: true },
  },
  { timestamps: false },
);

studentDepartureAuditSchema.index({ school: 1, occurredAt: 1 });

module.exports = mongoose.model("StudentDepartureAudit", studentDepartureAuditSchema);
