const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    class: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
    school: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true },
    monthlyFee: { type: Number, default: 0, min: 0 },
    // O'quvchining ota-onasi va uy manzili haqidagi qo'shimcha ma'lumotlar
    studentCode: { type: String },
    birthDate: { type: Date },
    gender: { type: String, enum: ["male", "female", ""], default: "" },
    nationality: { type: String },
    birthCertSeries: { type: String },
    birthCertNumber: { type: String },
    status: { type: String, enum: ["active", "inactive", "graduated", ""], default: "active" },
    parentName: { type: String },
    parentPassport: { type: String },
    parentPhone: { type: String },
    region: { type: String },
    district: { type: String },
    address: { type: String },
    academicYear: { type: String },
    educationLanguage: { type: String },
    admissionOrderNumber: { type: String },
    admissionOrderDate: { type: Date },
    classAdmissionDate: { type: Date },
    /** `inactive` / `graduated` ga o'tganda avtomatik to'ldiriladi (chiqish statistikasi). */
    leftAt: { type: Date, default: null },
  },
  { timestamps: true },
);

const LEFT_STATUSES = ["inactive", "graduated"];

studentSchema.pre("save", async function () {
  if (this.isNew) {
    if (LEFT_STATUSES.includes(this.status)) {
      this.leftAt = new Date();
    }
    return;
  }
  if (!this.isModified("status")) return;
  const prevDoc = await this.constructor.findOne({ _id: this._id }).select("status").lean();
  const prevStatus = prevDoc?.status || "";
  const nowLeft = LEFT_STATUSES.includes(this.status);
  const wasLeft = LEFT_STATUSES.includes(prevStatus);
  if (nowLeft && !wasLeft) {
    this.leftAt = new Date();
  } else if (!nowLeft) {
    this.leftAt = null;
  }
});

studentSchema.index({ school: 1 });
studentSchema.index({ class: 1 });
studentSchema.index({ school: 1, class: 1 });

module.exports = mongoose.model("Student", studentSchema);

