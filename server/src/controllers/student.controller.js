const User = require("../models/User");
const Student = require("../models/Student");
const ClassModel = require("../models/Class");
const Grade = require("../models/Grade");
const Attendance = require("../models/Attendance");
const Homework = require("../models/Homework");
const HomeworkSubmission = require("../models/HomeworkSubmission");
const Timetable = require("../models/Timetable");

const normalizeClassName = (value) => (value || "").toString().toLowerCase().replace(/\s+/g, "").trim();

const getStudentForUser = async (user) => {
  const student = await Student.findOne({ user: user.id }).populate("school class");
  if (!student) {
    throw new Error("Student profile not found");
  }
  if (!user.schoolId || student.school._id.toString() !== user.schoolId.toString()) {
    throw new Error("Student not in this school");
  }
  return student;
};

const myGrades = async (req, res) => {
  try {
    const student = await getStudentForUser(req.user);
    const studentRecords = await Student.find({
      user: req.user.id,
      school: student.school._id,
    }).select("_id");

    const candidateStudentIds = studentRecords.length > 0
      ? studentRecords.map((s) => s._id)
      : [student._id];

    const grades = await Grade.find({
      student: { $in: candidateStudentIds },
      school: student.school._id,
    })
      .populate("subject", "name")
      .populate({ path: "teacher", populate: { path: "user", select: "name" } })
      .sort({ date: -1, createdAt: -1 })
      .exec();

    return res.json(
      grades.map((g) => ({
        _id: g._id,
        grade: g.grade,
        date: g.date,
        subject: {
          name: g.subject?.name || "",
        },
        teacherName: g.teacher?.user?.name || "",
      })),
    );
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to load grades" });
  }
};

const myAttendance = async (req, res) => {
  try {
    const student = await getStudentForUser(req.user);
    const attendance = await Attendance.find({ student: student._id, school: student.school._id }).exec();
    return res.json(attendance);
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to load attendance" });
  }
};

const myHomework = async (req, res) => {
  try {
    const student = await getStudentForUser(req.user);

    const studentRecords = await Student.find({
      user: req.user.id,
      school: student.school._id,
    })
      .select("_id class")
      .lean();

    const classIds = [];
    studentRecords.forEach((record) => {
      if (record.class && !classIds.some((id) => id.toString() === record.class.toString())) {
        classIds.push(record.class);
      }
    });

    if (classIds.length === 0 && student.class && student.class._id) {
      classIds.push(student.class._id);
    }

    if (classIds.length === 0) {
      return res.json([]);
    }

    const primaryHomeworkCount = await Homework.countDocuments({
      school: student.school._id,
      class: { $in: classIds },
    });

    if (primaryHomeworkCount === 0 && student.class && student.class.name) {
      const targetClassName = normalizeClassName(student.class.name);
      const allSchoolClasses = await ClassModel.find({ school: student.school._id }).select("_id name");
      const siblingClasses = allSchoolClasses.filter(
        (cls) => normalizeClassName(cls.name) === targetClassName,
      );

      siblingClasses.forEach((cls) => {
        if (!classIds.some((id) => id.toString() === cls._id.toString())) {
          classIds.push(cls._id);
        }
      });
    }

    const homework = await Homework.find({
      class: { $in: classIds },
      school: student.school._id,
    })
      .populate("subject", "name")
      .populate({ path: "teacher", populate: { path: "user", select: "name" } })
      .sort({ deadline: 1, createdAt: -1 })
      .exec();

    const homeworkIds = homework.map((h) => h._id);
    const candidateStudentIds = studentRecords.length > 0
      ? studentRecords.map((s) => s._id)
      : [student._id];

    const submissions = await HomeworkSubmission.find({
      school: student.school._id,
      student: { $in: candidateStudentIds },
      homework: { $in: homeworkIds },
    })
      .select("homework answerText attachmentUrl attachmentOriginalName submittedAt gradedScore gradingComment gradedAt")
      .lean();

    const submissionMap = new Map(submissions.map((s) => [s.homework.toString(), s]));

    return res.json(
      homework.map((hw) => ({
        _id: hw._id,
        description: hw.description,
        deadline: hw.deadline,
        subject: { name: hw.subject?.name || "" },
        teacherName: hw.teacher?.user?.name || "",
        attachmentUrl: hw.attachmentUrl || null,
        attachmentOriginalName: hw.attachmentOriginalName || null,
        mySubmission: submissionMap.has(hw._id.toString())
          ? {
              answerText: submissionMap.get(hw._id.toString()).answerText || "",
              attachmentUrl: submissionMap.get(hw._id.toString()).attachmentUrl || null,
              attachmentOriginalName:
                submissionMap.get(hw._id.toString()).attachmentOriginalName || null,
              submittedAt: submissionMap.get(hw._id.toString()).submittedAt,
              gradedScore: submissionMap.get(hw._id.toString()).gradedScore ?? null,
              gradingComment: submissionMap.get(hw._id.toString()).gradingComment || "",
              gradedAt: submissionMap.get(hw._id.toString()).gradedAt || null,
            }
          : null,
      })),
    );
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to load homework" });
  }
};

const submitHomework = async (req, res) => {
  try {
    const student = await getStudentForUser(req.user);
    const { id } = req.params;
    const answerText = (req.body?.answerText || "").toString().trim();

    if (!answerText && !req.file) {
      return res.status(400).json({ message: "Javob matni yoki fayl yuborish majburiy" });
    }

    const studentRecords = await Student.find({
      user: req.user.id,
      school: student.school._id,
    })
      .select("class")
      .lean();

    const classIds = [];
    studentRecords.forEach((record) => {
      if (record.class && !classIds.some((id) => id.toString() === record.class.toString())) {
        classIds.push(record.class);
      }
    });

    if (classIds.length === 0 && student.class && student.class._id) {
      classIds.push(student.class._id);
    }

    if (classIds.length === 0) {
      return res.status(400).json({ message: "Sizga sinf biriktirilmagan" });
    }

    if (student.class && student.class.name) {
      const targetClassName = normalizeClassName(student.class.name);
      const allSchoolClasses = await ClassModel.find({ school: student.school._id }).select("_id name");
      const siblingClasses = allSchoolClasses.filter(
        (cls) => normalizeClassName(cls.name) === targetClassName,
      );

      siblingClasses.forEach((cls) => {
        if (!classIds.some((existingId) => existingId.toString() === cls._id.toString())) {
          classIds.push(cls._id);
        }
      });
    }

    const hw = await Homework.findOne({
      _id: id,
      school: student.school._id,
      class: { $in: classIds },
    });

    if (!hw) {
      return res.status(404).json({ message: "Uy vazifa topilmadi yoki sizga tegishli emas" });
    }

    const existingSubmission = await HomeworkSubmission.findOne({
      school: student.school._id,
      student: student._id,
      homework: hw._id,
    });

    if (existingSubmission?.gradeRef) {
      await Grade.deleteOne({ _id: existingSubmission.gradeRef, school: student.school._id });
    }

    const update = {
      answerText,
      submittedAt: new Date(),
      gradedScore: null,
      gradingComment: "",
      gradedAt: null,
      gradedBy: null,
      gradeRef: null,
    };

    if (req.file) {
      update.attachmentUrl = `${req.protocol}://${req.get("host")}/uploads/submissions/${req.file.filename}`;
      update.attachmentOriginalName = req.file.originalname || null;
      update.attachmentMimeType = req.file.mimetype || null;
      update.attachmentSize = req.file.size || null;
    }

    const submission = await HomeworkSubmission.findOneAndUpdate(
      {
        school: student.school._id,
        student: student._id,
        homework: hw._id,
      },
      {
        $set: update,
      },
      {
        upsert: true,
        returnDocument: "after",
        setDefaultsOnInsert: true,
      },
    );

    return res.status(201).json({
      id: submission._id,
      submittedAt: submission.submittedAt,
      attachmentUrl: submission.attachmentUrl || null,
      attachmentOriginalName: submission.attachmentOriginalName || null,
    });
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to submit homework" });
  }
};

const myTimetable = async (req, res) => {
  try {
    const student = await getStudentForUser(req.user);
    if (!student.class || !student.class._id) {
      return res.json([]);
    }

    const classIds = [student.class._id];

    // Backward-compatibility fallback:
    // if timetable was linked to an older duplicate class document with the same name,
    // include those class ids so students still see their lessons.
    const primaryEntries = await Timetable.find({
      school: student.school._id,
      class: student.class._id,
    }).select("_id");

    if (primaryEntries.length === 0 && student.class.name) {
      const targetClassName = normalizeClassName(student.class.name);
      const allSchoolClasses = await ClassModel.find({
        school: student.school._id,
      }).select("_id name");

      const siblingClasses = allSchoolClasses.filter(
        (cls) => normalizeClassName(cls.name) === targetClassName,
      );

      siblingClasses.forEach((cls) => {
        if (!classIds.some((id) => id.toString() === cls._id.toString())) {
          classIds.push(cls._id);
        }
      });
    }

    const entries = await Timetable.find({
      school: student.school._id,
      class: { $in: classIds },
    })
      .populate("subject", "name")
      .populate({
        path: "teacher",
        populate: { path: "user", select: "name" },
      })
      .populate("class", "name")
      .sort({ dayOfWeek: 1, startTime: 1 })
      .exec();

    return res.json(
      entries.map((e) => ({
        id: e._id,
        dayOfWeek: e.dayOfWeek,
        startTime: e.startTime,
        endTime: e.endTime,
        room: e.room || "",
        subjectName: e.subject?.name || "",
        teacherName: e.teacher?.user?.name || "",
        className: e.class?.name || student.class?.name || "",
      })),
    );
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to load timetable" });
  }
};

const getProfile = async (req, res) => {
  try {
    const [user, student] = await Promise.all([
      User.findById(req.user.id)
        .select("name email photoUrl")
        .lean(),
      Student.findOne({ user: req.user.id })
        .populate("class", "name")
        .select("class")
        .lean(),
    ]);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      name: user.name,
      email: user.email,
      photoUrl: user.photoUrl || null,
      className: student?.class?.name || null,
      classId: student?.class?._id || null,
    });
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to load profile" });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    // Talaba o'z rasmini o'zgartira olmaydi — faqat o'qituvchi yoki direktor o'rnatadi
    if (name && typeof name === "string" && name.trim()) user.name = name.trim();
    await user.save();
    return res.json({
      name: user.name,
      email: user.email,
      photoUrl: user.photoUrl || null,
    });
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to update profile" });
  }
};

module.exports = {
  myGrades,
  myAttendance,
  myHomework,
  submitHomework,
  myTimetable,
  getProfile,
  updateProfile,
};

