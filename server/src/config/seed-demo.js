/**
 * Demo ma'lumotlarni bazaga qo'shish.
 * Ishga tushirish: node src/config/seed-demo.js
 * Yoki: npm run seed:demo
 */
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const School = require("../models/School");
const Class = require("../models/Class");
const Subject = require("../models/Subject");
const Teacher = require("../models/Teacher");
const Student = require("../models/Student");
const Parent = require("../models/Parent");
const Grade = require("../models/Grade");
const Attendance = require("../models/Attendance");
const Homework = require("../models/Homework");
const Timetable = require("../models/Timetable");

const DEMO_PASSWORD = "Demo123!";

const demoSchools = [
  {
    name: "1-son umumiy o'rta ta'lim maktabi",
    address: "Toshkent sh., Chilonzor tumani, 12-mavze",
    phone: "+998 71 123 45 67",
    director: { name: "Otabek Karimov", email: "director1@demo.uz" },
  },
  {
    name: "2-son umumiy o'rta ta'lim maktabi",
    address: "Toshkent sh., Yunusobod tumani, 5-mavze",
    phone: "+998 71 234 56 78",
    director: { name: "Dilnoza Rahimova", email: "director2@demo.uz" },
  },
  {
    name: "3-son umumiy o'rta ta'lim maktabi",
    address: "Toshkent sh., Yakkasaroy tumani, 8-mavze",
    phone: "+998 71 345 67 89",
    director: { name: "Jasur Toshmatov", email: "director3@demo.uz" },
  },
];

const demoTeachers = [
  { name: "Aziza Norboyeva", email: "teacher1@demo.uz" },
  { name: "Bekzod Ismoilov", email: "teacher2@demo.uz" },
  { name: "Charos Yusupova", email: "teacher3@demo.uz" },
  { name: "Doston Aliyev", email: "teacher4@demo.uz" },
  { name: "Elena Kim", email: "teacher5@demo.uz" },
];

const demoStudents = [
  { name: "Ali Valiyev", email: "student1@demo.uz" },
  { name: "Bobur Tursunov", email: "student2@demo.uz" },
  { name: "Camila Rahimova", email: "student3@demo.uz" },
  { name: "Davron Karimov", email: "student4@demo.uz" },
  { name: "Eldor Shodmonov", email: "student5@demo.uz" },
  { name: "Feruza Azimova", email: "student6@demo.uz" },
  { name: "Gulnoza Toshmatova", email: "student7@demo.uz" },
  { name: "Hasan Rahimov", email: "student8@demo.uz" },
];

const demoParents = [
  { name: "Vali Valiyev", email: "parent1@demo.uz" },
  { name: "Tursun Tursunov", email: "parent2@demo.uz" },
  { name: "Rahim Rahimov", email: "parent3@demo.uz" },
];

const subjectNames = ["Matematika", "Ona tili", "Ingliz tili", "Fizika", "Tarix"];
const classNames = ["5A", "5B", "6A", "6B", "7A", "8A", "9A", "10A", "11A"];

async function seedDemo() {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/school_saas";
  await mongoose.connect(uri);
  // eslint-disable-next-line no-console
  console.log("MongoDB ulandi. Demo ma'lumotlar qo'shilmoqda...");

  try {
    const createdSchools = [];
    const createdSubjects = [];
    const createdClasses = [];

    // 1. Maktablar va direktorlar
    for (const s of demoSchools) {
      const existingSchool = await School.findOne({ name: s.name });
      if (existingSchool) {
        // eslint-disable-next-line no-console
        console.log(`Maktab mavjud: ${s.name}`);
        createdSchools.push(existingSchool);
        continue;
      }

      const directorUser = await User.findOne({ email: s.director.email });
      let director = directorUser;
      if (!director) {
        director = await User.create({
          name: s.director.name,
          email: s.director.email,
          password: DEMO_PASSWORD,
          role: "director",
          school: null,
        });
      }

      const school = await School.create({
        name: s.name,
        address: s.address,
        phone: s.phone,
        status: "active",
        director: director._id,
      });
      director.school = school._id;
      await director.save();
      createdSchools.push(school);
      // eslint-disable-next-line no-console
      console.log(`Maktab yaratildi: ${s.name}`);
    }

    // 2. Fanlar va sinflar (birinchi maktab uchun)
    const school1 = createdSchools[0];
    for (const subName of subjectNames) {
      let sub = await Subject.findOne({ name: subName, school: school1._id });
      if (!sub) {
        sub = await Subject.create({ name: subName, school: school1._id });
        createdSubjects.push(sub);
      }
    }
    for (const clsName of classNames) {
      let cls = await Class.findOne({ name: clsName, school: school1._id });
      if (!cls) {
        cls = await Class.create({ name: clsName, school: school1._id });
        createdClasses.push(cls);
      }
    }

    // 3. O'qituvchilar (birinchi maktab uchun, har biri alohida fanga)
    const subjectsForSchool = await Subject.find({ school: school1._id }).limit(demoTeachers.length);
    for (let i = 0; i < Math.min(5, demoTeachers.length, subjectsForSchool.length); i++) {
      const t = demoTeachers[i];
      const exists = await User.findOne({ email: t.email });
      if (!exists) {
        const user = await User.create({
          name: t.name,
          email: t.email,
          password: DEMO_PASSWORD,
          role: "teacher",
          school: school1._id,
        });
        await Teacher.create({
          user: user._id,
          subject: subjectsForSchool[i]._id,
          school: school1._id,
        });
        // eslint-disable-next-line no-console
        console.log(`O'qituvchi yaratildi: ${t.name}`);
      }
    }

    // 4. O'quvchilar (birinchi maktab, 5A sinfi uchun)
    const class5A = await Class.findOne({ name: "5A", school: school1._id });
    if (class5A) {
      for (let i = 0; i < Math.min(8, demoStudents.length); i++) {
        const st = demoStudents[i];
        const exists = await User.findOne({ email: st.email });
        if (!exists) {
          const user = await User.create({
            name: st.name,
            email: st.email,
            password: DEMO_PASSWORD,
            role: "student",
            school: school1._id,
          });
          await Student.create({
            user: user._id,
            class: class5A._id,
            school: school1._id,
          });
          // eslint-disable-next-line no-console
          console.log(`O'quvchi yaratildi: ${st.name}`);
        }
      }
    }

    // 5. Ota-onalar (birinchi maktab, o'quvchilar bilan bog'lash)
    const students = await Student.find({ school: school1._id }).limit(3);
    for (let i = 0; i < Math.min(3, demoParents.length, students.length); i++) {
      const p = demoParents[i];
      const st = students[i];
      let parentUser = await User.findOne({ email: p.email });
      if (!parentUser) {
        parentUser = await User.create({
          name: p.name,
          email: p.email,
          password: DEMO_PASSWORD,
          role: "parent",
          school: school1._id,
        });
        await Parent.create({
          user: parentUser._id,
          student: st._id,
          school: school1._id,
        });
        // eslint-disable-next-line no-console
        console.log(`Ota-ona yaratildi: ${p.name}`);
      }
    }

    // 6. Demo: baholar, davomat, uy vazifalari, dars jadvali (birinchi maktab, 5A)
    const class5AForDemo = await Class.findOne({ name: "5A", school: school1._id });
    const students5A = await Student.find({ school: school1._id, class: class5AForDemo?._id });
    const teachers = await Teacher.find({ school: school1._id }).populate("subject");
    const subjects = await Subject.find({ school: school1._id });

    if (class5AForDemo && students5A.length > 0 && teachers.length > 0 && subjects.length > 0) {
      // Baholar: har bir o'quvchiga bir nechta fan bo'yicha baho
      const gradeCount = await Grade.countDocuments({ school: school1._id });
      if (gradeCount === 0) {
        const grades = [4, 5, 3, 5, 4];
        for (const st of students5A) {
          for (let i = 0; i < Math.min(5, subjects.length, teachers.length); i++) {
            const d = new Date();
            d.setDate(d.getDate() - Math.floor(Math.random() * 30));
            await Grade.create({
              student: st._id,
              subject: subjects[i]._id,
              teacher: teachers[i]._id,
              school: school1._id,
              grade: grades[i] || 4,
              date: d,
            });
          }
        }
        // eslint-disable-next-line no-console
        console.log("Demo baholar qo'shildi.");
      }

      // Davomat: so'nggi 20 kun uchun present/absent
      const attendanceCount = await Attendance.countDocuments({ school: school1._id });
      if (attendanceCount === 0) {
        for (const st of students5A) {
          for (let d = 0; d < 20; d++) {
            const date = new Date();
            date.setDate(date.getDate() - d);
            if (date.getDay() >= 1 && date.getDay() <= 5) {
              await Attendance.create({
                student: st._id,
                school: school1._id,
                date,
                status: Math.random() > 0.1 ? "present" : "absent",
              });
            }
          }
        }
        // eslint-disable-next-line no-console
        console.log("Demo davomat qo'shildi.");
      }

      // Uy vazifalari: sinf uchun bir nechta vazifa
      const homeworkCount = await Homework.countDocuments({ school: school1._id, class: class5AForDemo._id });
      if (homeworkCount === 0) {
        const tasks = [
          { subjectIdx: 0, desc: "245-247 misollar, 15-bet", daysFromNow: 2 },
          { subjectIdx: 1, desc: "8-mavzu, mustaqil ish", daysFromNow: 3 },
          { subjectIdx: 2, desc: "Unit 8, Exercise 3-5", daysFromNow: 1 },
          { subjectIdx: 3, desc: "Laboratoriya ishi №5", daysFromNow: 5 },
          { subjectIdx: 4, desc: "22-mavzu, referat", daysFromNow: 7 },
        ];
        for (const t of tasks) {
          const sub = subjects[t.subjectIdx % subjects.length];
          const teacher = teachers.find((tr) => tr.subject && tr.subject._id.toString() === sub._id.toString()) || teachers[0];
          const deadline = new Date();
          deadline.setDate(deadline.getDate() + t.daysFromNow);
          await Homework.create({
            subject: sub._id,
            teacher: teacher._id,
            school: school1._id,
            class: class5AForDemo._id,
            description: t.desc,
            deadline,
          });
        }
        // eslint-disable-next-line no-console
        console.log("Demo uy vazifalari qo'shildi.");
      }

      // Dars jadvali: Dushanba–Juma, 6 dars
      const timetableCount = await Timetable.countDocuments({ school: school1._id, class: class5AForDemo._id });
      if (timetableCount === 0) {
        const slots = [
          { start: "08:00", end: "08:45" },
          { start: "09:00", end: "09:45" },
          { start: "10:00", end: "10:45" },
          { start: "11:00", end: "11:45" },
          { start: "12:00", end: "12:45" },
          { start: "13:00", end: "13:45" },
        ];
        for (let day = 1; day <= 5; day++) {
          for (let i = 0; i < Math.min(6, subjects.length, teachers.length); i++) {
            await Timetable.create({
              class: class5AForDemo._id,
              subject: subjects[i % subjects.length]._id,
              teacher: teachers[i % teachers.length]._id,
              school: school1._id,
              dayOfWeek: day,
              startTime: slots[i].start,
              endTime: slots[i].end,
              room: `${200 + i}${day}`,
            });
          }
        }
        // eslint-disable-next-line no-console
        console.log("Demo dars jadvali qo'shildi.");
      }
    }

    // eslint-disable-next-line no-console
    console.log("\nDemo ma'lumotlar muvaffaqiyatli qo'shildi!");
    // eslint-disable-next-line no-console
    console.log("\nKirish ma'lumotlari (parol hammasi: Demo123!):");
    // eslint-disable-next-line no-console
    console.log("  Direktor: director1@demo.uz");
    // eslint-disable-next-line no-console
    console.log("  O'qituvchi: teacher1@demo.uz");
    // eslint-disable-next-line no-console
    console.log("  O'quvchi: student1@demo.uz");
    // eslint-disable-next-line no-console
    console.log("  Ota-ona: parent1@demo.uz");
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Xatolik:", err);
    throw err;
  } finally {
    await mongoose.disconnect();
    // eslint-disable-next-line no-console
    console.log("MongoDB ulanishi yopildi.");
  }
}

seedDemo();
