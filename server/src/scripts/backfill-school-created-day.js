/**
 * Eski School hujjatlari uchun created_day_local maydonini to'ldirish.
 *
 * Ishga tushirish:
 *   cd server
 *   npm run backfill:school-days
 */

const dotenv = require("dotenv");
const mongoose = require("mongoose");
const School = require("../models/School");

dotenv.config();

function toLocalDayString(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function run() {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/school_saas";
  await mongoose.connect(uri);
  console.log("MongoDB ulandi. created_day_local maydonlari to'ldirilmoqda...");

  try {
    const cursor = School.find({
      $or: [{ created_day_local: { $exists: false } }, { created_day_local: null }],
    }).cursor();

    let updated = 0;
    for await (const school of cursor) {
      const sourceDate = school.created_at || school.createdAt || new Date();
      school.created_day_local = toLocalDayString(sourceDate);
      await school.save();
      updated += 1;
      if (updated % 50 === 0) {
        console.log(`Yangilangan maktablar: ${updated}`);
      }
    }

    console.log(`Tugadi. Jami yangilangan maktablar: ${updated}`);
  } catch (err) {
    console.error("Xatolik:", err);
  } finally {
    await mongoose.disconnect();
    console.log("MongoDB ulanishi yopildi.");
  }
}

run();

