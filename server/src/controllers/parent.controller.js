const ParentModel = require("../models/Parent");
const Grade = require("../models/Grade");
const Attendance = require("../models/Attendance");
const Homework = require("../models/Homework");
const Student = require("../models/Student");
const ExamAttempt = require("../models/ExamAttempt");

const getParentForUser = async (user) => {
  const parent = await ParentModel.findOne({ user: user.id }).populate({
    path: "student",
    populate: { path: "school class" },
  });
  if (!parent) {
    throw new Error("Parent profile not found");
  }
  const school = parent.student.school;
  if (!user.schoolId || school._id.toString() !== user.schoolId.toString()) {
    throw new Error("Parent not in this school");
  }
  return parent;
};

const childGrades = async (req, res) => {
  try {
    const parent = await getParentForUser(req.user);
    const schoolId = parent.student.school._id;

    const grades = await Grade.find({
      student: parent.student._id,
      school: schoolId,
    })
      .populate("subject teacher")
      .exec();

    return res.json(grades);
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to load child grades" });
  }
};

const childAttendance = async (req, res) => {
  try {
    const parent = await getParentForUser(req.user);
    const schoolId = parent.student.school._id;

    const attendance = await Attendance.find({
      student: parent.student._id,
      school: schoolId,
    }).exec();

    return res.json(attendance);
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to load child attendance" });
  }
};

const childHomework = async (req, res) => {
  try {
    const parent = await getParentForUser(req.user);
    const schoolId = parent.student.school._id;

    const homework = await Homework.find({
      class: parent.student.class._id,
      school: schoolId,
    })
      .populate("subject", "name")
      .populate({ path: "teacher", populate: { path: "user", select: "name" } })
      .sort({ deadline: 1, createdAt: -1 })
      .exec();

    return res.json(
      homework.map((hw) => ({
        _id: hw._id,
        description: hw.description,
        deadline: hw.deadline,
        subject: { name: hw.subject?.name || "" },
        teacherName: hw.teacher?.user?.name || "",
        attachmentUrl: hw.attachmentUrl || null,
        attachmentOriginalName: hw.attachmentOriginalName || null,
      })),
    );
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to load child homework" });
  }
};

const myChildren = async (req, res) => {
  try {
    const parentDocs = await ParentModel.find({ user: req.user.id }).populate({
      path: "student",
      populate: { path: "user class school" },
    });

    if (!parentDocs.length) {
      return res.json([]);
    }

    const schoolId = req.user.schoolId?.toString();
    const students = parentDocs
      .filter((p) => p.student.school._id.toString() === schoolId)
      .map((p) => p.student);

    return res.json(students);
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to load children" });
  }
};

const childExamResults = async (req, res) => {
  try {
    const parent = await getParentForUser(req.user);
    const schoolId = parent.student.school._id;

    const attempts = await ExamAttempt.find({
      student: parent.student._id,
      school: schoolId,
      status: { $in: ["submitted", "awaiting_manual_review", "evaluated", "expired"] },
    })
      .populate({
        path: "exam",
        select: "title startTime endTime subject",
        populate: { path: "subject", select: "name" },
      })
      .sort({ finishedAt: -1, createdAt: -1 })
      .lean();

    const rows = attempts
      .filter((a) => Boolean(a.exam))
      .map((a) => ({
        id: a._id,
        examId: a.exam._id,
        examTitle: a.exam.title || "Imtihon",
        subjectName: a.exam.subject?.name || "Fan",
        startTime: a.exam.startTime,
        endTime: a.exam.endTime,
        status: a.status,
        totalScore: Number(a.totalScore || 0),
        maxScore: Number(a.maxScore || 0),
        gradePercent: a.maxScore > 0 ? Math.round((Number(a.totalScore || 0) / Number(a.maxScore)) * 100) : 0,
        isFinalScore: Boolean(a.isFinalScore),
        finishedAt: a.finishedAt || null,
      }));

    return res.json(rows);
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to load child exam results" });
  }
};

module.exports = {
  childGrades,
  childAttendance,
  childHomework,
  childExamResults,
  myChildren,
};

