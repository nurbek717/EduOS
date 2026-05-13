const Teacher = require("../models/Teacher");
const Student = require("../models/Student");
const Grade = require("../models/Grade");
const Attendance = require("../models/Attendance");
const Homework = require("../models/Homework");
const HomeworkSubmission = require("../models/HomeworkSubmission");
const ClassModel = require("../models/Class");
const User = require("../models/User");
const Timetable = require("../models/Timetable");
const { getSchoolAttendanceStats } = require("../utils/schoolAttendanceStats");

const buildAttachmentUrl = (req, filename) =>
  `${req.protocol}://${req.get("host")}/uploads/homework/${filename}`;

const getTeacherForUser = async (user) => {
  const teacher = await Teacher.findOne({ user: user.id }).populate("school subject");
  if (!teacher) {
    throw new Error("Teacher profile not found");
  }
  if (!user.schoolId || teacher.school._id.toString() !== user.schoolId.toString()) {
    throw new Error("Teacher not in this school");
  }
  return teacher;
};

const listClassesForTeacher = async (req, res) => {
  try {
    const teacher = await getTeacherForUser(req.user);
    // Maktabdagi barcha sinflar (o'qituvchi hammasini ko'rishi mumkin)
    const classes = await ClassModel.find({ school: teacher.school._id }).sort({ name: 1 }).lean();

    // Sinflar ro'yxatidan foydalanib, aynan shu sinflarga tegishli o'quvchilarni sanaymiz
    const classIds = classes.map((cls) => cls._id);
    const counts = await Student.aggregate([
      { $match: { class: { $in: classIds } } },
      { $group: { _id: "$class", count: { $sum: 1 } } },
    ]);
    const countMap = new Map(counts.map((c) => [c._id?.toString(), c.count]));

    const result = classes.map((cls) => ({
      ...cls,
      studentCount: countMap.get(cls._id.toString()) || 0,
      isHomeroom: cls.classTeacher && cls.classTeacher.toString() === teacher._id.toString(),
    }));

    return res.json(result);
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to list classes" });
  }
};

const listStudents = async (req, res) => {
  try {
    const teacher = await getTeacherForUser(req.user);
    const { classId } = req.query;

    // Some legacy student records might be missing the `school` field.
    // To avoid "empty list" bugs, we also allow matching by class -> school.
    const schoolId = teacher.school._id;

    if (classId) {
      const cls = await ClassModel.findOne({ _id: classId, school: schoolId }).select("_id").lean();
      if (!cls) {
        return res.status(400).json({ message: "Class not found in this school" });
      }
    }

    const schoolClasses = await ClassModel.find({ school: schoolId }).select("_id").lean();
    const classIds = schoolClasses.map((c) => c._id);

    const query = classId
      ? { class: classId, $or: [{ school: schoolId }, { school: { $exists: false } }, { school: null }] }
      : { $or: [{ school: schoolId }, { class: { $in: classIds } }] };

    const students = await Student.find(query)
      .populate("user", "name email photoUrl")
      .populate("class", "name")
      .sort({ createdAt: -1 })
      .exec();

    const result = students.map((s) => ({
      id: s._id,
      userId: s.user?._id,
      name: s.user?.name,
      email: s.user?.email,
      photoUrl: s.user?.photoUrl || null,
      classId: s.class?._id,
      className: s.class?.name,
      parentName: s.parentName,
      parentPhone: s.parentPhone,
      address: s.address,
    }));

    return res.json(result);
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to list students" });
  }
};

const createStudentForTeacher = async (req, res) => {
  try {
    const teacher = await getTeacherForUser(req.user);
    const { name, email, password, classId, parentName, parentPhone, address } = req.body;

    if (!name || !email || !password || !classId) {
      return res.status(400).json({ message: "name, email, password and classId are required" });
    }

    const [existingUser, cls] = await Promise.all([
      User.findOne({ email }),
      ClassModel.findOne({ _id: classId, school: teacher.school._id, classTeacher: teacher._id }),
    ]);

    if (existingUser) {
      return res.status(400).json({ message: "Email already in use" });
    }
    if (!cls) {
      return res
        .status(400)
        .json({ message: "Bu sinf sizga sinf rahbari sifatida biriktirilmagan yoki topilmadi" });
    }

    const createdUser = await User.create({
      name,
      email,
      password,
      role: "student",
      school: teacher.school._id,
    });

    const student = await Student.create({
      user: createdUser._id,
      class: cls._id,
      school: teacher.school._id,
      parentName: parentName || undefined,
      parentPhone: parentPhone || undefined,
      address: address || undefined,
    });

    return res.status(201).json({
      user: {
        id: createdUser._id,
        name: createdUser.name,
        email: createdUser.email,
        role: createdUser.role,
      },
      student,
    });
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to create student" });
  }
};

const updateStudentForTeacher = async (req, res) => {
  try {
    const teacher = await getTeacherForUser(req.user);
    const { id } = req.params;
    const { name, email, password, classId, parentName, parentPhone, address, photoUrl, faceDescriptor } = req.body;

    const student = await Student.findOne({ _id: id, school: teacher.school._id })
      .populate("user")
      .populate("class")
      .exec();
    if (!student || !student.user) {
      return res.status(404).json({ message: "Student not found" });
    }

    const user = student.user;

    // Faqat o'zi sinf rahbari bo'lgan sinf o'quvchilarini tahrirlashi mumkin
    if (
      !student.class ||
      !student.class.classTeacher ||
      student.class.classTeacher.toString() !== teacher._id.toString()
    ) {
      return res
        .status(403)
        .json({ message: "Siz faqat sinf rahbari bo'lgan sinflaringiz o'quvchilarini tahrirlashingiz mumkin" });
    }

    if (email && email !== user.email) {
      const existing = await User.findOne({ email });
      if (existing && existing._id.toString() !== user._id.toString()) {
        return res.status(400).json({ message: "Email already in use" });
      }
      user.email = email;
    }

    if (name) {
      user.name = name;
    }
    if (password) {
      user.password = password;
    }
    if (typeof photoUrl !== "undefined") {
      user.photoUrl = photoUrl || null;
    }
    if (faceDescriptor !== undefined) {
      user.faceDescriptor = Array.isArray(faceDescriptor) && faceDescriptor.length === 128 ? faceDescriptor : null;
    }

    if (classId) {
      const cls = await ClassModel.findOne({ _id: classId, school: teacher.school._id, classTeacher: teacher._id });
      if (!cls) {
        return res
          .status(400)
          .json({ message: "Bu sinf sizga sinf rahbari sifatida biriktirilmagan yoki topilmadi" });
      }
      student.class = cls._id;
    }

    if (typeof parentName !== "undefined") {
      student.parentName = parentName;
    }
    if (typeof parentPhone !== "undefined") {
      student.parentPhone = parentPhone;
    }
    if (typeof address !== "undefined") {
      student.address = address;
    }

    await user.save();
    await student.save();

    return res.json({
      id: student._id,
      name: user.name,
      email: user.email,
      photoUrl: user.photoUrl || null,
      classId: student.class,
      parentName: student.parentName,
      parentPhone: student.parentPhone,
      address: student.address,
    });
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to update student" });
  }
};

const deleteStudentForTeacher = async (req, res) => {
  return res.status(403).json({
    message: "O'qituvchi o'quvchini o'chira olmaydi. Iltimos, school admin bilan bog'laning.",
  });
};
const createGrade = async (req, res) => {
  try {
    const teacher = await getTeacherForUser(req.user);
    const { studentId, subjectId, grade, date } = req.body;

    if (!studentId || grade == null) {
      return res.status(400).json({ message: "studentId and grade are required" });
    }

    const student = await Student.findOne({ _id: studentId, school: teacher.school._id });
    if (!student) {
      return res.status(400).json({ message: "Student not found in your school" });
    }

    // Agar subjectId berilmasa, o'qituvchining o'z fanini ishlatamiz
    const subjectToUse =
      subjectId || (teacher.subject && (typeof teacher.subject === "object" ? teacher.subject._id : teacher.subject));
    if (!subjectToUse) {
      return res.status(400).json({ message: "subjectId is required for this teacher" });
    }

    const record = await Grade.create({
      student: student._id,
      subject: subjectToUse,
      teacher: teacher._id,
      school: teacher.school._id,
      grade,
      date: date ? new Date(date) : new Date(),
    });

    return res.status(201).json(record);
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to create grade" });
  }
};

const listGradesForClass = async (req, res) => {
  try {
    const teacher = await getTeacherForUser(req.user);
    const { classId } = req.query;

    const query = { school: teacher.school._id };
    if (classId) {
      const studentsInClass = await Student.find({ class: classId, school: teacher.school._id }).select("_id");
      query.student = { $in: studentsInClass.map((s) => s._id) };
    }

    const grades = await Grade.find(query)
      .populate({
        path: "student",
        populate: { path: "user class" },
      })
      .populate("subject")
      .sort({ date: -1, createdAt: -1 })
      .exec();

    const result = grades.map((g) => ({
      ...g.toObject(),
      canEdit: g.teacher && g.teacher.toString() === teacher._id.toString(),
    }));

    return res.json(result);
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to list grades" });
  }
};

function euclideanDistance(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = (Number(a[i]) || 0) - (Number(b[i]) || 0);
    sum += d * d;
  }
  return Math.sqrt(sum);
}

const setAttendanceByFace = async (req, res) => {
  try {
    const teacher = await getTeacherForUser(req.user);
    const { descriptor, classId } = req.body;

    if (!descriptor || !Array.isArray(descriptor) || descriptor.length !== 128) {
      return res.status(400).json({ message: "descriptor (128 numbers) is required" });
    }

    let students;
    if (classId) {
      const cls = await ClassModel.findOne({ _id: classId, school: teacher.school._id });
      if (!cls) return res.status(400).json({ message: "Class not found" });
      students = await Student.find({ class: classId, school: teacher.school._id }).populate("user", "name faceDescriptor");
    } else {
      students = await Student.find({ school: teacher.school._id }).populate("user", "name faceDescriptor");
    }

    const withDescriptor = students.filter((s) => s.user && s.user.faceDescriptor && s.user.faceDescriptor.length === 128);
    if (withDescriptor.length === 0) {
      return res.status(400).json({ message: "Bu sinfda Face ID ro'yxatdan o'tkazilgan o'quvchi yo'q" });
    }

    let best = { student: null, distance: Infinity };
    for (const s of withDescriptor) {
      const d = euclideanDistance(descriptor, s.user.faceDescriptor);
      if (d < best.distance) best = { student: s, distance: d };
    }

    const threshold = 0.6;
    if (best.distance > threshold || !best.student) {
      return res.status(404).json({ message: "Yuz aniqlanmadi yoki tizimda topilmadi", matched: false });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await Attendance.findOneAndUpdate(
      { student: best.student._id, date: today, school: teacher.school._id },
      {
        $set: {
          status: "present",
          school: teacher.school._id,
          student: best.student._id,
          date: today,
        },
      },
      { upsert: true, returnDocument: "after" },
    );

    return res.json({
      matched: true,
      studentName: best.student.user?.name,
      studentId: best.student._id,
      message: `${best.student.user?.name || "O'quvchi"} davomatga qo'yildi`,
    });
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to set attendance by face" });
  }
};

const setAttendanceForClass = async (req, res) => {
  try {
    const teacher = await getTeacherForUser(req.user);
    const { classId, date, entries } = req.body;

    if (!classId || !date || !Array.isArray(entries)) {
      return res.status(400).json({ message: "classId, date and entries are required" });
    }

    const cls = await ClassModel.findOne({ _id: classId, school: teacher.school._id });
    if (!cls) {
      return res.status(400).json({ message: "Class not found in your school" });
    }

    const studentsInClass = await Student.find({ class: classId, school: teacher.school._id }).select("_id");
    const allowedStudentIds = new Set(studentsInClass.map((s) => s._id.toString()));

    const targetDate = new Date(date);

    const operations = entries
      .filter((e) => allowedStudentIds.has(e.studentId))
      .map((e) =>
        Attendance.findOneAndUpdate(
          { student: e.studentId, date: targetDate, school: teacher.school._id },
          {
            $set: {
              status: e.status,
              school: teacher.school._id,
              student: e.studentId,
              date: targetDate,
            },
          },
          { upsert: true, returnDocument: "after" },
        ),
      );

    const results = await Promise.all(operations);
    return res.status(200).json(results);
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to set attendance" });
  }
};

const createHomework = async (req, res) => {
  try {
    const teacher = await getTeacherForUser(req.user);
    const { classId, subjectId, description, deadline } = req.body;

    if (!classId || !description || !deadline) {
      return res
        .status(400)
        .json({ message: "classId, description and deadline are required" });
    }

    const cls = await ClassModel.findOne({ _id: classId, school: teacher.school._id });
    if (!cls) {
      return res.status(400).json({ message: "Class not found in your school" });
    }

    const subjectToUse =
      subjectId ||
      (teacher.subject && (typeof teacher.subject === "object" ? teacher.subject._id : teacher.subject));

    if (!subjectToUse) {
      return res.status(400).json({ message: "subjectId is required for this teacher" });
    }

    const attachmentUrl = req.file ? buildAttachmentUrl(req, req.file.filename) : null;

    const hw = await Homework.create({
      class: classId,
      subject: subjectToUse,
      teacher: teacher._id,
      school: teacher.school._id,
      description,
      deadline: new Date(deadline),
      attachmentUrl,
      attachmentOriginalName: req.file?.originalname || null,
      attachmentMimeType: req.file?.mimetype || null,
      attachmentSize: req.file?.size || null,
    });

    return res.status(201).json(hw);
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to create homework" });
  }
};

const listHomeworkForTeacher = async (req, res) => {
  try {
    const teacher = await getTeacherForUser(req.user);
    const { classId } = req.query;

    const query = {
      school: teacher.school._id,
    };

    if (classId) {
      query.class = classId;
    }

    const homeworks = await Homework.find(query)
      .populate("subject", "name")
      .populate("class", "name")
      .sort({ deadline: 1, createdAt: -1 })
      .lean();

    const homeworkIds = homeworks.map((hw) => hw._id);
    const classIds = homeworks
      .map((hw) => hw.class?._id)
      .filter(Boolean);

    const [submissions, classStudentCounts] = await Promise.all([
      HomeworkSubmission.find({
        school: teacher.school._id,
        homework: { $in: homeworkIds },
      })
        .populate({
          path: "student",
          populate: { path: "user", select: "name email" },
        })
        .sort({ submittedAt: -1 })
        .lean(),
      Student.aggregate([
        {
          $match: {
            school: teacher.school._id,
            class: { $in: classIds },
          },
        },
        { $group: { _id: "$class", count: { $sum: 1 } } },
      ]),
    ]);

    const classCountMap = new Map(classStudentCounts.map((c) => [c._id.toString(), c.count]));
    const submissionMap = new Map();

    for (const sub of submissions) {
      const key = sub.homework?.toString();
      if (!key) continue;
      if (!submissionMap.has(key)) {
        submissionMap.set(key, []);
      }
      submissionMap.get(key).push({
        id: sub._id,
        studentId: sub.student?._id || null,
        studentName: sub.student?.user?.name || "Noma'lum",
        studentEmail: sub.student?.user?.email || "",
        answerText: sub.answerText || "",
        attachmentUrl: sub.attachmentUrl || null,
        attachmentOriginalName: sub.attachmentOriginalName || null,
        submittedAt: sub.submittedAt,
        gradedScore: sub.gradedScore ?? null,
        gradingComment: sub.gradingComment || "",
        gradedAt: sub.gradedAt || null,
      });
    }

    return res.json(
      homeworks.map((hw) => {
        const hwId = hw._id.toString();
        const hwClassId = hw.class?._id?.toString() || "";
        const hwSubmissions = submissionMap.get(hwId) || [];
        const totalStudents = classCountMap.get(hwClassId) || 0;

        return {
          id: hw._id,
          classId: hw.class?._id || null,
          className: hw.class?.name || "",
          subjectName: hw.subject?.name || "",
          description: hw.description,
          deadline: hw.deadline,
          attachmentUrl: hw.attachmentUrl || null,
          attachmentOriginalName: hw.attachmentOriginalName || null,
          canEdit: hw.teacher && hw.teacher.toString() === teacher._id.toString(),
          submissionCount: hwSubmissions.length,
          totalStudents,
          pendingCount: Math.max(totalStudents - hwSubmissions.length, 0),
          lastSubmittedAt: hwSubmissions[0]?.submittedAt || null,
          submissions: hwSubmissions,
        };
      }),
    );
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to list homework" });
  }
};

const updateHomeworkForTeacher = async (req, res) => {
  try {
    const teacher = await getTeacherForUser(req.user);
    const { id } = req.params;
    const { classId, subjectId, description, deadline } = req.body;

    const hw = await Homework.findOne({ _id: id, school: teacher.school._id });
    if (!hw) {
      return res.status(404).json({ message: "Homework not found" });
    }

    if (hw.teacher.toString() !== teacher._id.toString()) {
      return res.status(403).json({ message: "Siz faqat o'zingiz kiritgan uy vazifani tahrirlashingiz mumkin" });
    }

    if (classId) {
      const cls = await ClassModel.findOne({ _id: classId, school: teacher.school._id });
      if (!cls) {
        return res.status(400).json({ message: "Class not found in your school" });
      }
      hw.class = cls._id;
    }

    if (subjectId) {
      hw.subject = subjectId;
    }

    if (typeof description === "string") {
      hw.description = description;
    }

    if (deadline) {
      hw.deadline = new Date(deadline);
    }

    if (req.file) {
      hw.attachmentUrl = buildAttachmentUrl(req, req.file.filename);
      hw.attachmentOriginalName = req.file.originalname || null;
      hw.attachmentMimeType = req.file.mimetype || null;
      hw.attachmentSize = req.file.size || null;
    }

    await hw.save();
    return res.json(hw);
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to update homework" });
  }
};

const deleteHomeworkForTeacher = async (req, res) => {
  try {
    const teacher = await getTeacherForUser(req.user);
    const { id } = req.params;

    const hw = await Homework.findOne({ _id: id, school: teacher.school._id });
    if (!hw) {
      return res.status(404).json({ message: "Homework not found" });
    }

    if (hw.teacher.toString() !== teacher._id.toString()) {
      return res.status(403).json({ message: "Siz faqat o'zingiz kiritgan uy vazifani o'chirishingiz mumkin" });
    }

    await Homework.deleteOne({ _id: hw._id });
    return res.json({ success: true });
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to delete homework" });
  }
};

const gradeHomeworkSubmissionForTeacher = async (req, res) => {
  try {
    const teacher = await getTeacherForUser(req.user);
    const { id } = req.params;
    const { gradedScore, gradingComment } = req.body;

    const submission = await HomeworkSubmission.findOne({
      _id: id,
      school: teacher.school._id,
    })
      .populate("homework")
      .exec();

    if (!submission || !submission.homework) {
      return res.status(404).json({ message: "Submission not found" });
    }

    if (submission.homework.teacher.toString() !== teacher._id.toString()) {
      return res.status(403).json({ message: "Siz faqat o'zingiz bergan vazifalarni baholaysiz" });
    }

    const scoreNumber = Number(gradedScore);
    if (!Number.isFinite(scoreNumber) || scoreNumber < 1 || scoreNumber > 100) {
      return res.status(400).json({ message: "gradedScore 1 dan 100 gacha bo'lishi kerak" });
    }

    const gradeRecord = await Grade.findOneAndUpdate(
      {
        homeworkSubmission: submission._id,
      },
      {
        student: submission.student,
        subject: submission.homework.subject,
        teacher: teacher._id,
        school: teacher.school._id,
        homeworkSubmission: submission._id,
        grade: scoreNumber,
        date: new Date(),
      },
      {
        upsert: true,
        returnDocument: "after",
        setDefaultsOnInsert: true,
      },
    );

    submission.gradedScore = scoreNumber;
    submission.gradingComment = typeof gradingComment === "string" ? gradingComment.trim() : "";
    submission.gradedAt = new Date();
    submission.gradedBy = teacher._id;
    submission.gradeRef = gradeRecord._id;
    await submission.save();

    return res.json({
      success: true,
      submissionId: submission._id,
      gradedScore: submission.gradedScore,
      gradingComment: submission.gradingComment,
      gradedAt: submission.gradedAt,
      gradeId: gradeRecord._id,
    });
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to grade submission" });
  }
};

const listTimetableForTeacher = async (req, res) => {
  try {
    const teacher = await getTeacherForUser(req.user);
    const { day } = req.query;

    let dayFilter = {};
    if (day === "today") {
      const today = new Date().getDay(); // 0-6
      dayFilter = { dayOfWeek: today };
    } else if (typeof day === "string") {
      const map = {
        sun: 0,
        mon: 1,
        tue: 2,
        wed: 3,
        thu: 4,
        fri: 5,
        sat: 6,
      };
      const key = day.toLowerCase();
      if (map[key] != null) {
        dayFilter = { dayOfWeek: map[key] };
      }
    }

    const entries = await Timetable.find({
      school: teacher.school._id,
      teacher: teacher._id,
      ...dayFilter,
    })
      .populate("class", "name")
      .populate("subject", "name")
      .sort({ dayOfWeek: 1, startTime: 1 })
      .exec();

    return res.json(
      entries.map((e) => ({
        id: e._id,
        dayOfWeek: e.dayOfWeek,
        startTime: e.startTime,
        endTime: e.endTime,
        room: e.room,
        className: e.class?.name || "",
        subjectName: e.subject?.name || "",
      })),
    );
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to list timetable" });
  }
};

const createTimetableForTeacher = async (req, res) => {
  try {
    const teacher = await getTeacherForUser(req.user);
    const { classId, dayOfWeek, startTime, endTime, room } = req.body;

    if (
      !classId ||
      typeof dayOfWeek !== "number" ||
      dayOfWeek < 0 ||
      dayOfWeek > 6 ||
      !startTime ||
      !endTime
    ) {
      return res.status(400).json({
        message: "classId, dayOfWeek (0-6), startTime va endTime majburiy maydonlardir",
      });
    }

    const cls = await ClassModel.findOne({ _id: classId, school: teacher.school._id });
    if (!cls) {
      return res.status(400).json({ message: "Class not found in your school" });
    }

    const subjectToUse =
      teacher.subject && typeof teacher.subject === "object" ? teacher.subject._id : teacher.subject;
    if (!subjectToUse) {
      return res.status(400).json({ message: "Sizga fan biriktirilmagan, jadvalga yozish uchun fan kerak" });
    }

    const entry = await Timetable.create({
      class: cls._id,
      subject: subjectToUse,
      teacher: teacher._id,
      school: teacher.school._id,
      dayOfWeek,
      startTime,
      endTime,
      room: room || undefined,
    });

    return res.status(201).json(entry);
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to create timetable entry" });
  }
};

const deleteTimetableForTeacher = async (req, res) => {
  try {
    const teacher = await getTeacherForUser(req.user);
    const { id } = req.params;

    const entry = await Timetable.findOne({ _id: id, school: teacher.school._id, teacher: teacher._id });
    if (!entry) {
      return res.status(404).json({ message: "Timetable entry not found" });
    }

    await Timetable.deleteOne({ _id: entry._id });
    return res.json({ success: true });
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to delete timetable entry" });
  }
};

const updateGradeForTeacher = async (req, res) => {
  try {
    const teacher = await getTeacherForUser(req.user);
    const { id } = req.params;
    const { grade, date } = req.body;

    const record = await Grade.findOne({ _id: id, school: teacher.school._id });
    if (!record) {
      return res.status(404).json({ message: "Grade not found" });
    }

    if (record.teacher.toString() !== teacher._id.toString()) {
      return res
        .status(403)
        .json({ message: "Siz faqat o'zingiz qo'ygan baholarni tahrirlashingiz mumkin" });
    }

    if (grade != null) {
      record.grade = grade;
    }
    if (date) {
      record.date = new Date(date);
    }

    await record.save();
    return res.json(record);
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to update grade" });
  }
};

const deleteGradeForTeacher = async (req, res) => {
  try {
    const teacher = await getTeacherForUser(req.user);
    const { id } = req.params;

    const record = await Grade.findOne({ _id: id, school: teacher.school._id });
    if (!record) {
      return res.status(404).json({ message: "Grade not found" });
    }

    if (record.teacher.toString() !== teacher._id.toString()) {
      return res
        .status(403)
        .json({ message: "Siz faqat o'zingiz qo'ygan baholarni o'chirishingiz mumkin" });
    }

    await Grade.deleteOne({ _id: record._id });
    return res.json({ success: true });
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to delete grade" });
  }
};

const listAttendanceStatsForTeacher = async (req, res) => {
  try {
    const teacher = await getTeacherForUser(req.user);
    const schoolId = teacher.school._id;
    const range = (req.query.range || "1w").toString();
    if (!["1d", "1w", "1m"].includes(range)) {
      return res.status(400).json({ message: "range must be 1d, 1w, or 1m" });
    }
    const payload = await getSchoolAttendanceStats(schoolId, range);
    return res.json(payload);
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to load attendance stats" });
  }
};

module.exports = {
  listClassesForTeacher,
  listStudents,
  createStudentForTeacher,
  updateStudentForTeacher,
  deleteStudentForTeacher,
  createGrade,
  listGradesForClass,
  setAttendanceForClass,
  setAttendanceByFace,
  createHomework,
  listHomeworkForTeacher,
  updateHomeworkForTeacher,
  deleteHomeworkForTeacher,
  gradeHomeworkSubmissionForTeacher,
  updateGradeForTeacher,
  deleteGradeForTeacher,
  listTimetableForTeacher,
  createTimetableForTeacher,
  deleteTimetableForTeacher,
  listAttendanceStatsForTeacher,
};

