const mongoose = require("mongoose");

const schoolSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, trim: true },
    phone: { type: String, trim: true },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    // Mahalliy sana, statistika uchun (YYYY-MM-DD, masalan 2026-03-09)
    created_day_local: { type: String, index: true },
    director: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

// Yangi va yangilangan maktablar uchun created_day_local ni avtomatik to'ldirish
schoolSchema.pre("save", function setCreatedDayLocal() {
  // created_at maydoni timestamps orqali qo'yiladi, ammo agar hali bo'lmasa, hozirgi vaqtni olamiz
  const sourceDate = this.created_at || this.createdAt || new Date();
  const year = sourceDate.getFullYear();
  const month = String(sourceDate.getMonth() + 1).padStart(2, "0");
  const day = String(sourceDate.getDate()).padStart(2, "0");
  this.created_day_local = `${year}-${month}-${day}`;
});

module.exports = mongoose.model("School", schoolSchema);

