const User = require("../models/User");
const School = require("../models/School");
const ClassModel = require("../models/Class");
const Subject = require("../models/Subject");
const Student = require("../models/Student");
const Teacher = require("../models/Teacher");
const ParentModel = require("../models/Parent");
const Timetable = require("../models/Timetable");
const Attendance = require("../models/Attendance");
const FinanceTransaction = require("../models/FinanceTransaction");
const Grade = require("../models/Grade");
const Subscription = require("../models/Subscription");
const StudentDepartureAudit = require("../models/StudentDepartureAudit");
const { getSchoolAttendanceStats } = require("../utils/schoolAttendanceStats");

const ensureSchoolManagementUser = async (user) => {
  if (!user.schoolId) {
    throw new Error("School manager is not linked to a school");
  }
  const school = await School.findById(user.schoolId);
  if (!school) {
    throw new Error("School not found for school manager");
  }
  return school;
};

const BASE_MANAGEABLE_SCHOOL_USER_ROLES = ["teacher", "student", "parent"];
const DIRECTOR_MANAGEABLE_SCHOOL_USER_ROLES = [...BASE_MANAGEABLE_SCHOOL_USER_ROLES, "school_admin"];

const getManageableSchoolUserRoles = (role) =>
  role === "director" ? DIRECTOR_MANAGEABLE_SCHOOL_USER_ROLES : BASE_MANAGEABLE_SCHOOL_USER_ROLES;

const countMonthsInclusive = (fromDate, toDate) => {
  const start = new Date(fromDate);
  const end = new Date(toDate);
  if (start > end) {
    return 0;
  }

  return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
};

/**
 * Kunlik qabul: `Student.createdAt`.
 * Kunlik chiqish: `leftAt` (yoki eski yozuvlar uchun `updatedAt`) + faol o'quvchini o'chirish `StudentDepartureAudit`.
 * UTC kun bo'yicha.
 */
/** Frontend 1 yil oralig'ini filtrlashi uchun (kabisa + zaxira). */
const ADMISSION_TIMELINE_DAY_COUNT = 400;

const buildAdmissionTimeline = (
  admissionRangeStartUtc,
  recentAdmissionDocs,
  departedStudentDocs,
  departureAuditDocs,
) => {
  const admittedByDay = new Map();
  recentAdmissionDocs.forEach((doc) => {
    const key = new Date(doc.createdAt).toISOString().slice(0, 10);
    admittedByDay.set(key, (admittedByDay.get(key) || 0) + 1);
  });

  const departedByDay = new Map();
  departedStudentDocs.forEach((doc) => {
    const at = doc.leftAt || doc.updatedAt;
    if (!at) return;
    const key = new Date(at).toISOString().slice(0, 10);
    departedByDay.set(key, (departedByDay.get(key) || 0) + 1);
  });
  departureAuditDocs.forEach((doc) => {
    const key = new Date(doc.occurredAt).toISOString().slice(0, 10);
    departedByDay.set(key, (departedByDay.get(key) || 0) + 1);
  });

  const admissionTimeline = [];
  const cursor = new Date(admissionRangeStartUtc);
  for (let i = 0; i < ADMISSION_TIMELINE_DAY_COUNT; i++) {
    const key = cursor.toISOString().slice(0, 10);
    admissionTimeline.push({
      date: key,
      admitted: admittedByDay.get(key) || 0,
      departed: departedByDay.get(key) || 0,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return admissionTimeline;
};

const buildClassSummaries = async (schoolId, classes) => {
  const classIds = classes.map((cls) => cls._id);
  const students = await Student.find({
    school: schoolId,
    class: { $in: classIds },
  })
    .select("_id class")
    .lean()
    .exec();

  const studentIds = students.map((student) => student._id);
  const studentCountMap = new Map();
  const studentClassMap = new Map();

  students.forEach((student) => {
    const classKey = String(student.class);
    studentCountMap.set(classKey, (studentCountMap.get(classKey) || 0) + 1);
    studentClassMap.set(String(student._id), classKey);
  });

  const now = new Date();
  const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [grades, attendances] = studentIds.length
    ? await Promise.all([
        Grade.find({
          school: schoolId,
          student: { $in: studentIds },
          date: { $gte: startOfPreviousMonth, $lt: startOfNextMonth },
        })
          .select("student grade date")
          .lean()
          .exec(),
        Attendance.find({
          school: schoolId,
          student: { $in: studentIds },
          date: { $gte: startOfCurrentMonth, $lt: startOfNextMonth },
        })
          .select("student status")
          .lean()
          .exec(),
      ])
    : [[], []];

  const metricsMap = new Map(
    classIds.map((classId) => [
      String(classId),
      {
        currentGradeTotal: 0,
        currentGradeCount: 0,
        previousGradeTotal: 0,
        previousGradeCount: 0,
        absentCount: 0,
        lateCount: 0,
      },
    ]),
  );

  grades.forEach((gradeRecord) => {
    const classKey = studentClassMap.get(String(gradeRecord.student));
    if (!classKey || !metricsMap.has(classKey)) return;

    const metrics = metricsMap.get(classKey);
    const gradeDate = new Date(gradeRecord.date);

    if (gradeDate >= startOfCurrentMonth) {
      metrics.currentGradeTotal += gradeRecord.grade;
      metrics.currentGradeCount += 1;
      return;
    }

    metrics.previousGradeTotal += gradeRecord.grade;
    metrics.previousGradeCount += 1;
  });

  attendances.forEach((attendanceRecord) => {
    const classKey = studentClassMap.get(String(attendanceRecord.student));
    if (!classKey || !metricsMap.has(classKey)) return;

    const metrics = metricsMap.get(classKey);
    if (attendanceRecord.status === "absent") {
      metrics.absentCount += 1;
    } else if (attendanceRecord.status === "late") {
      metrics.lateCount += 1;
    }
  });

  const summaryBase = classes.map((cls) => {
    const classKey = String(cls._id);
    const metrics = metricsMap.get(classKey) || {
      currentGradeTotal: 0,
      currentGradeCount: 0,
      previousGradeTotal: 0,
      previousGradeCount: 0,
      absentCount: 0,
      lateCount: 0,
    };

    const currentAverageGrade =
      metrics.currentGradeCount > 0 ? Number((metrics.currentGradeTotal / metrics.currentGradeCount).toFixed(2)) : 0;
    const previousAverageGrade =
      metrics.previousGradeCount > 0 ? Number((metrics.previousGradeTotal / metrics.previousGradeCount).toFixed(2)) : 0;
    const monthlyGrowth =
      metrics.currentGradeCount > 0
        ? Number((currentAverageGrade - (metrics.previousGradeCount > 0 ? previousAverageGrade : 0)).toFixed(2))
        : null;

    let monthlyTrend = "no_data";
    let monthlyTrendTitle = "Bu oy ma'lumot yetarli emas";
    let monthlyTrendReason = "Bu sinf uchun shu oy yetarli baho yoki davomat ma'lumoti topilmadi.";

    if (metrics.currentGradeCount > 0) {
      if (monthlyGrowth > 0.5) {
        monthlyTrend = "up";
        monthlyTrendTitle = "Bu oy sinf bali oshdi";
        monthlyTrendReason =
          metrics.absentCount === 0 && metrics.lateCount === 0
            ? "Davomat yaxshi va o'rtacha baholar ko'tarilgan."
            : "Baholar ko'tarilgan, lekin davomatni yanada yaxshilash mumkin.";
      } else if (monthlyGrowth < -0.5) {
        monthlyTrend = "down";
        monthlyTrendTitle = "Bu oy sinf bali tushdi";
        monthlyTrendReason =
          metrics.absentCount > 0 || metrics.lateCount > 0
            ? `Sabab: ${metrics.absentCount} ta kelmaganlik, ${metrics.lateCount} ta kechikish va o'rtacha baholar pasayishi.`
            : "Sabab: o'rtacha baholar o'tgan oyga nisbatan pasaygan.";
      } else {
        monthlyTrend = "stable";
        monthlyTrendTitle = "Bu oy sinf bali barqaror";
        monthlyTrendReason =
          metrics.absentCount > 0 || metrics.lateCount > 0
            ? `Natija barqaror, ammo ${metrics.absentCount} ta kelmaganlik va ${metrics.lateCount} ta kechikish bor.`
            : "Davomat va baholar barqaror ketmoqda.";
      }
    }

    return {
      _id: cls._id,
      name: cls.name,
      classTeacherId: cls.classTeacher?._id || null,
      classTeacherName: cls.classTeacher?.user?.name || null,
      studentCount: studentCountMap.get(classKey) || 0,
      currentAverageGrade,
      previousAverageGrade,
      monthlyGrowth,
      absentCount: metrics.absentCount,
      lateCount: metrics.lateCount,
      monthlyTrend,
      monthlyTrendTitle,
      monthlyTrendReason,
    };
  });

  const ranked = summaryBase
    .filter((item) => item.monthlyGrowth !== null)
    .sort((a, b) => (b.monthlyGrowth || 0) - (a.monthlyGrowth || 0));

  const monthlyRankMap = new Map(ranked.map((item, index) => [String(item._id), index + 1]));

  return summaryBase.map((item) => ({
    ...item,
    monthlyRank: monthlyRankMap.get(String(item._id)) || null,
  }));
};

const createSchoolAdminForDirector = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    const school = await ensureSchoolManagementUser(req.user);

    const [existingUser, existingSchoolAdmin] = await Promise.all([
      User.findOne({ email }),
      User.findOne({ role: "school_admin", school: school._id }),
    ]);

    if (existingUser) {
      return res.status(400).json({ message: "Email already in use" });
    }

    if (existingSchoolAdmin) {
      return res.status(400).json({ message: "Bu maktabda allaqachon school admin mavjud" });
    }

    const user = await User.create({
      name,
      email,
      phone,
      password,
      role: "school_admin",
      school: school._id,
    });

    return res.status(201).json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      relatedLabel: "Maktab boshqaruvi",
      createdAt: user.createdAt,
    });
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to create school admin" });
  }
};

const listUsersForDirector = async (req, res) => {
  try {
    const school = await ensureSchoolManagementUser(req.user);
    const { role, search } = req.query;
    const manageableRoles = getManageableSchoolUserRoles(req.user.role);

    const query = {
      school: school._id,
      role: role || { $in: manageableRoles },
    };

    if (role && !manageableRoles.includes(role)) {
      return res.json([]);
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const users = await User.find(query).sort({ createdAt: -1 }).lean().exec();
    const userIds = users.map((user) => user._id);

    const [teacherDocs, studentDocs, parentDocs] = await Promise.all([
      Teacher.find({ user: { $in: userIds }, school: school._id }).populate("subject", "name").lean().exec(),
      Student.find({ user: { $in: userIds }, school: school._id }).populate("class", "name").lean().exec(),
      ParentModel.find({ user: { $in: userIds }, school: school._id })
        .populate({
          path: "student",
          select: "parentPhone user monthlyFee createdAt",
          populate: {
            path: "user",
            select: "name",
          },
        })
        .lean()
        .exec(),
    ]);

    const now = new Date();
    const studentIds = Array.from(
      new Set([
        ...studentDocs.map((doc) => String(doc._id)),
        ...parentDocs.map((doc) => (doc.student ? String(doc.student._id) : null)).filter(Boolean),
      ]),
    );

    const studentParentDocs = studentIds.length
      ? await ParentModel.find({ student: { $in: studentIds }, school: school._id })
        .populate("user", "name")
        .select("student user")
        .lean()
        .exec()
      : [];

    const studentParentNameMap = new Map();
    studentParentDocs.forEach((doc) => {
      const studentId = doc?.student ? String(doc.student) : null;
      if (!studentId || studentParentNameMap.has(studentId)) {
        return;
      }

      const linkedParentName = doc?.user?.name || null;
      studentParentNameMap.set(studentId, linkedParentName);
    });

    const studentPaymentMap = new Map();
    if (studentIds.length > 0) {
      const payments = await FinanceTransaction.find({
        school: school._id,
        category: "student_fee",
        student: { $in: studentIds },
        occurredAt: { $lte: now },
      })
        .select("student amount")
        .lean()
        .exec();

      payments.forEach((item) => {
        const key = String(item.student);
        studentPaymentMap.set(key, (studentPaymentMap.get(key) || 0) + (Number(item.amount) || 0));
      });
    }

    const teacherMap = new Map(teacherDocs.map((doc) => [String(doc.user), doc]));
    const studentMap = new Map(studentDocs.map((doc) => [String(doc.user), doc]));
    const parentMap = new Map(parentDocs.map((doc) => [String(doc.user), doc]));

    return res.json(
      users.map((user) => {
        const userId = String(user._id);
        const teacherDoc = teacherMap.get(userId);
        const studentDoc = studentMap.get(userId);
        const parentDoc = parentMap.get(userId);

        let relatedLabel = null;
        let phone = user.phone || null;
        let parentName = null;
        let debtAmount = null;
        if (user.role === "teacher") {
          relatedLabel = teacherDoc?.subject?.name || null;
        } else if (user.role === "student") {
          relatedLabel = studentDoc?.class?.name || null;
          const linkedParentName = studentDoc?._id ? studentParentNameMap.get(String(studentDoc._id)) || null : null;
          parentName = linkedParentName || studentDoc?.parentName || null;
          const monthlyFee = Number(studentDoc?.monthlyFee) || 0;
          const dueStart = studentDoc?.createdAt ? new Date(studentDoc.createdAt) : null;
          const dueMonthCount = monthlyFee > 0 && dueStart ? countMonthsInclusive(dueStart, now) : 0;
          const expected = monthlyFee * dueMonthCount;
          const paid = studentDoc ? studentPaymentMap.get(String(studentDoc._id)) || 0 : 0;
          debtAmount = Math.max(expected - paid, 0);
        } else if (user.role === "parent") {
          relatedLabel = parentDoc?.student?.user?.name || null;
          phone = user.phone || parentDoc?.student?.parentPhone || null;
          parentName = user.name || null;
          const monthlyFee = Number(parentDoc?.student?.monthlyFee) || 0;
          const dueStart = parentDoc?.student?.createdAt ? new Date(parentDoc.student.createdAt) : null;
          const dueMonthCount = monthlyFee > 0 && dueStart ? countMonthsInclusive(dueStart, now) : 0;
          const expected = monthlyFee * dueMonthCount;
          const paid = parentDoc?.student ? studentPaymentMap.get(String(parentDoc.student._id)) || 0 : 0;
          debtAmount = Math.max(expected - paid, 0);
        } else if (user.role === "school_admin") {
          relatedLabel = "Maktab boshqaruvi";
        }

        return {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          photoUrl: user.photoUrl || null,
          phone,
          parentName,
          debtAmount,
          relatedLabel,
          createdAt: user.createdAt,
        };
      }),
    );
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to list users" });
  }
};

const getUserForDirector = async (req, res) => {
  try {
    const school = await ensureSchoolManagementUser(req.user);
    const { id } = req.params;
    const manageableRoles = getManageableSchoolUserRoles(req.user.role);

    const user = await User.findOne({
      _id: id,
      school: school._id,
      role: { $in: manageableRoles },
    })
      .lean()
      .exec();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let relatedLabel = null;
    let relatedId = null;
    let parentPhoneFallback = null;
    let debtAmount = null;

    if (user.role === "teacher") {
      const teacherDoc = await Teacher.findOne({ user: user._id, school: school._id }).populate("subject", "name").lean().exec();
      relatedLabel = teacherDoc?.subject?.name || null;
      relatedId = teacherDoc?.subject?._id ? String(teacherDoc.subject._id) : null;
    } else if (user.role === "student") {
      const studentDoc = await Student.findOne({ user: user._id, school: school._id }).populate("class", "name").lean().exec();
      relatedLabel = studentDoc?.class?.name || null;
      relatedId = studentDoc?.class?._id ? String(studentDoc.class._id) : null;
      if (studentDoc) {
        const monthlyFee = Number(studentDoc.monthlyFee) || 0;
        const dueStart = studentDoc.createdAt ? new Date(studentDoc.createdAt) : null;
        const dueMonthCount = monthlyFee > 0 && dueStart ? countMonthsInclusive(dueStart, new Date()) : 0;
        const expected = monthlyFee * dueMonthCount;
        const payments = await FinanceTransaction.find({
          school: school._id,
          category: "student_fee",
          student: studentDoc._id,
          occurredAt: { $lte: new Date() },
        })
          .select("amount")
          .lean()
          .exec();
        const paid = payments.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
        debtAmount = Math.max(expected - paid, 0);
      }
    } else if (user.role === "parent") {
      const parentDoc = await ParentModel.findOne({ user: user._id, school: school._id })
        .populate({
          path: "student",
          select: "parentPhone user",
          populate: {
            path: "user",
            select: "name",
          },
        })
        .lean()
        .exec();
      relatedLabel = parentDoc?.student?.user?.name || null;
      relatedId = parentDoc?.student?._id ? String(parentDoc.student._id) : null;
      parentPhoneFallback = parentDoc?.student?.parentPhone || null;
      if (parentDoc?.student?._id) {
        const studentDoc = await Student.findById(parentDoc.student._id).select("monthlyFee createdAt").lean().exec();
        if (studentDoc) {
          const monthlyFee = Number(studentDoc.monthlyFee) || 0;
          const dueStart = studentDoc.createdAt ? new Date(studentDoc.createdAt) : null;
          const dueMonthCount = monthlyFee > 0 && dueStart ? countMonthsInclusive(dueStart, new Date()) : 0;
          const expected = monthlyFee * dueMonthCount;
          const payments = await FinanceTransaction.find({
            school: school._id,
            category: "student_fee",
            student: studentDoc._id,
            occurredAt: { $lte: new Date() },
          })
            .select("amount")
            .lean()
            .exec();
          const paid = payments.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
          debtAmount = Math.max(expected - paid, 0);
        }
      }
    } else if (user.role === "school_admin") {
      relatedLabel = "Maktab boshqaruvi";
    }

    const resolvedPhone = user.role === "parent" ? user.phone || parentPhoneFallback || null : user.phone || null;

    return res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      photoUrl: user.photoUrl || null,
      phone: resolvedPhone,
      debtAmount,
      relatedLabel,
      relatedId,
      createdAt: user.createdAt,
    });
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to get user" });
  }
};

const updateUserForDirector = async (req, res) => {
  try {
    const school = await ensureSchoolManagementUser(req.user);
    const { id } = req.params;
    const {
      name,
      email,
      phone,
      password,
      classId,
      subjectId,
      studentId,
      academicYear,
      educationLanguage,
      admissionOrderDate,
      classAcceptedDate,
    } = req.body;
    const manageableRoles = getManageableSchoolUserRoles(req.user.role);

    const user = await User.findOne({
      _id: id,
      school: school._id,
      role: { $in: manageableRoles },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
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

    if (phone) {
      user.phone = phone;
    }

    if (password) {
      user.password = password;
    }

    if (
      user.role === "student" && (
        classId ||
        typeof academicYear !== "undefined" ||
        typeof educationLanguage !== "undefined" ||
        typeof admissionOrderDate !== "undefined" ||
        typeof classAcceptedDate !== "undefined"
      )
    ) {
      if (classId) {
        const cls = await ClassModel.findOne({ _id: classId, school: school._id }).lean().exec();
        if (!cls) {
          return res.status(400).json({ message: "Class not found in this school" });
        }
      }

      const studentPatch = {};
      if (classId) {
        studentPatch.class = classId;
      }
      if (typeof academicYear !== "undefined") {
        studentPatch.academicYear = academicYear;
      }
      if (typeof educationLanguage !== "undefined") {
        studentPatch.educationLanguage = educationLanguage;
      }
      if (typeof admissionOrderDate !== "undefined") {
        if (!admissionOrderDate) {
          studentPatch.admissionOrderDate = null;
        } else {
          const parsedAdmissionOrderDate = new Date(admissionOrderDate);
          if (Number.isNaN(parsedAdmissionOrderDate.getTime())) {
            return res.status(400).json({ message: "Invalid admissionOrderDate" });
          }
          studentPatch.admissionOrderDate = parsedAdmissionOrderDate;
        }
      }
      if (typeof classAcceptedDate !== "undefined") {
        if (!classAcceptedDate) {
          studentPatch.classAdmissionDate = null;
        } else {
          const parsedClassAcceptedDate = new Date(classAcceptedDate);
          if (Number.isNaN(parsedClassAcceptedDate.getTime())) {
            return res.status(400).json({ message: "Invalid classAcceptedDate" });
          }
          studentPatch.classAdmissionDate = parsedClassAcceptedDate;
        }
      }

      await Student.findOneAndUpdate(
        { user: user._id, school: school._id },
        studentPatch,
        { new: true },
      ).exec();
    }

    if (user.role === "teacher" && subjectId) {
      const subject = await Subject.findOne({ _id: subjectId, school: school._id }).lean().exec();
      if (!subject) {
        return res.status(400).json({ message: "Subject not found in this school" });
      }

      await Teacher.findOneAndUpdate(
        { user: user._id, school: school._id },
        { subject: subjectId },
        { new: true },
      ).exec();
    }

    if (user.role === "parent" && studentId) {
      const student = await Student.findOne({ _id: studentId, school: school._id }).lean().exec();
      if (!student) {
        return res.status(400).json({ message: "Student not found in this school" });
      }

      await ParentModel.findOneAndUpdate(
        { user: user._id, school: school._id },
        { student: studentId },
        { new: true },
      ).exec();
    }

    await user.save();

    return res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to update user" });
  }
};

const deleteUserForDirector = async (req, res) => {
  try {
    const school = await ensureSchoolManagementUser(req.user);
    const { id } = req.params;
    const manageableRoles = getManageableSchoolUserRoles(req.user.role);

    const user = await User.findOne({
      _id: id,
      school: school._id,
      role: { $in: manageableRoles },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role === "teacher") {
      const teacher = await Teacher.findOne({ user: user._id, school: school._id });
      if (teacher) {
        await ClassModel.updateMany({ classTeacher: teacher._id, school: school._id }, { $unset: { classTeacher: "" } });
        await Teacher.deleteOne({ _id: teacher._id });
      }
    }

    if (user.role === "student") {
      const student = await Student.findOne({ user: user._id, school: school._id });
      if (student) {
        const leftStatuses = ["inactive", "graduated"];
        if (!leftStatuses.includes(student.status)) {
          await StudentDepartureAudit.create({
            school: school._id,
            occurredAt: new Date(),
          });
        }
        const linkedParents = await ParentModel.find({ student: student._id, school: school._id }).select("user").lean().exec();
        const linkedParentUserIds = linkedParents.map((parent) => parent.user).filter(Boolean);

        await ParentModel.deleteMany({ student: student._id, school: school._id });
        if (linkedParentUserIds.length > 0) {
          await User.deleteMany({ _id: { $in: linkedParentUserIds } });
        }
        await Student.deleteOne({ _id: student._id });
      }
    }

    if (user.role === "parent") {
      await ParentModel.deleteMany({ user: user._id, school: school._id });
    }

    await User.deleteOne({ _id: user._id });

    return res.json({ success: true });
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to delete user" });
  }
};

const getOverview = async (req, res) => {
  try {
    const school = await ensureSchoolManagementUser(req.user);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - 7);
    const startOfMonth = new Date(startOfToday);
    startOfMonth.setDate(startOfMonth.getDate() - 30);
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const admissionRangeStartUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    admissionRangeStartUtc.setUTCDate(admissionRangeStartUtc.getUTCDate() - (ADMISSION_TIMELINE_DAY_COUNT - 1));

    const [classCount, subjectCount, teacherCount, studentCount, parentCount, schoolAdminCount] = await Promise.all([
      ClassModel.countDocuments({ school: school._id }),
      Subject.countDocuments({ school: school._id }),
      Teacher.countDocuments({ school: school._id }),
      Student.countDocuments({ school: school._id }),
      ParentModel.countDocuments({ school: school._id }),
      User.countDocuments({ school: school._id, role: "school_admin" }),
    ]);

    const [studentToday, studentWeek, studentMonth, teacherToday, teacherWeek, teacherMonth] =
      await Promise.all([
        Student.countDocuments({ school: school._id, createdAt: { $gte: startOfToday } }),
        Student.countDocuments({ school: school._id, createdAt: { $gte: startOfWeek } }),
        Student.countDocuments({ school: school._id, createdAt: { $gte: startOfMonth } }),
        Teacher.countDocuments({ school: school._id, createdAt: { $gte: startOfToday } }),
        Teacher.countDocuments({ school: school._id, createdAt: { $gte: startOfWeek } }),
        Teacher.countDocuments({ school: school._id, createdAt: { $gte: startOfMonth } }),
      ]);

    const [
      recentTeachers,
      recentStudents,
      recentParents,
      monthIncome,
      monthExpense,
      classesWithTeachers,
      studentsWithFees,
      studentFeeTransactions,
      subscriptionDoc,
      recentAdmissionsForTimeline,
      departedStudentsForTimeline,
      departureAuditsForTimeline,
    ] = await Promise.all([
      Teacher.find({ school: school._id }).populate("user", "name").sort({ createdAt: -1 }).limit(5).exec(),
      Student.find({ school: school._id }).populate("user", "name").sort({ createdAt: -1 }).limit(5).exec(),
      ParentModel.find({ school: school._id }).populate("user", "name").sort({ createdAt: -1 }).limit(5).exec(),
      FinanceTransaction.aggregate([
        {
          $match: {
            school: school._id,
            type: "income",
            occurredAt: { $gte: startOfCurrentMonth },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
          },
        },
      ]),
      FinanceTransaction.aggregate([
        {
          $match: {
            school: school._id,
            type: "expense",
            occurredAt: { $gte: startOfCurrentMonth },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
          },
        },
      ]),
      ClassModel.find({ school: school._id })
        .populate({
          path: "classTeacher",
          populate: { path: "user", select: "name" },
        })
        .lean()
        .exec(),
      Student.find({ school: school._id })
        .populate("user", "name")
        .select("_id monthlyFee createdAt user")
        .lean()
        .exec(),
      FinanceTransaction.find({
        school: school._id,
        category: "student_fee",
        occurredAt: { $gte: new Date(now.getFullYear(), 0, 1) },
      })
        .select("student amount occurredAt")
        .lean()
        .exec(),
      Subscription.findOne({ school: school._id }).lean().exec(),
      Student.find(
        { school: school._id, createdAt: { $gte: admissionRangeStartUtc } },
        { createdAt: 1 },
      )
        .lean()
        .exec(),
      Student.find({
        school: school._id,
        status: { $in: ["inactive", "graduated"] },
        $or: [
          { leftAt: { $gte: admissionRangeStartUtc } },
          { leftAt: null, updatedAt: { $gte: admissionRangeStartUtc } },
        ],
      })
        .select("leftAt updatedAt")
        .lean()
        .exec(),
      StudentDepartureAudit.find({
        school: school._id,
        occurredAt: { $gte: admissionRangeStartUtc },
      })
        .select("occurredAt")
        .lean()
        .exec(),
    ]);

    const admissionTimeline = buildAdmissionTimeline(
      admissionRangeStartUtc,
      recentAdmissionsForTimeline,
      departedStudentsForTimeline,
      departureAuditsForTimeline,
    );

    const recentActivities = [
      ...recentTeachers.map((t) => ({
        type: "teacher",
        title: t.user?.name || "O'qituvchi",
        description: "Yangi o'qituvchi qo'shildi",
        createdAt: t.createdAt,
      })),
      ...recentStudents.map((s) => ({
        type: "student",
        title: s.user?.name || "O'quvchi",
        description: "Yangi o'quvchi ro'yxatdan o'tdi",
        createdAt: s.createdAt,
      })),
      ...recentParents.map((p) => ({
        type: "parent",
        title: p.user?.name || "Ota-ona",
        description: "Yangi ota-ona akkaunti yaratildi",
        createdAt: p.createdAt,
      })),
    ]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 8);

    const alerts = [];
    if (classCount === 0) {
      alerts.push({
        level: "info",
        message: "Hozircha birorta ham sinf yaratilmagan. Avval 'Sinf va fanlar' bo'limidan sinf qo'shing.",
      });
    }
    if (teacherCount === 0) {
      alerts.push({
        level: "warning",
        message: "Maktabda hali o'qituvchilar ro'yxatdan o'tmagan. 'Foydalanuvchilar' bo'limidan qo'shishingiz mumkin.",
      });
    }
    if (studentCount > 0 && parentCount === 0) {
      alerts.push({
        level: "info",
        message: "O'quvchilar uchun ota-onalar akkauntlari hali yaratilmagan. Keyinchalik xabarnomalar uchun kerak bo'ladi.",
      });
    }

    if (req.user.role === "director" && schoolAdminCount === 0) {
      alerts.push({
        level: "warning",
        message: "Maktab admini hali yaratilmagan. Kundalik operatsion boshqaruv uchun school_admin qo'shish tavsiya etiladi.",
      });
    }

    const classSummaries = await buildClassSummaries(school._id, classesWithTeachers);
    const classScoreDown = classSummaries
      .filter((item) => item.monthlyTrend === "down")
      .sort((a, b) => (a.monthlyGrowth || 0) - (b.monthlyGrowth || 0))[0];

    if (classScoreDown) {
      alerts.push({
        level: "warning",
        message: `${classScoreDown.name} sinfida natija pasaygan. ${classScoreDown.monthlyTrendReason}`,
      });
    }

    const attendanceIssue = classSummaries
      .filter((item) => (item.absentCount || 0) + (item.lateCount || 0) > 0)
      .sort((a, b) => ((b.absentCount || 0) + (b.lateCount || 0)) - ((a.absentCount || 0) + (a.lateCount || 0)))[0];

    if (attendanceIssue) {
      alerts.push({
        level: "info",
        message: `${attendanceIssue.name} sinfida davomatga e'tibor kerak: ${attendanceIssue.absentCount || 0} ta kelmaganlik, ${attendanceIssue.lateCount || 0} ta kechikish qayd etilgan.`,
      });
    }

    const noDataClass = classSummaries
      .filter((item) => item.monthlyTrend === "no_data")
      .sort((a, b) => (a.studentCount || 0) - (b.studentCount || 0))[0];

    if (noDataClass) {
      alerts.push({
        level: "info",
        message: `${noDataClass.name} sinfi uchun hali yetarli baho yoki davomat ma'lumoti yo'q.`,
      });
    }

    const studentPaymentYearMap = new Map();
    studentFeeTransactions.forEach((item) => {
      const key = String(item.student);
      studentPaymentYearMap.set(key, (studentPaymentYearMap.get(key) || 0) + (Number(item.amount) || 0));
    });

    const debtorStudents = studentsWithFees
      .map((studentItem) => {
        const monthlyFee = Number(studentItem.monthlyFee) || 0;
        const dueStart = studentItem.createdAt > startOfYear ? studentItem.createdAt : startOfYear;
        const dueMonthCount = monthlyFee > 0 ? countMonthsInclusive(dueStart, now) : 0;
        const expectedThisYear = monthlyFee * dueMonthCount;
        const paidThisYear = studentPaymentYearMap.get(String(studentItem._id)) || 0;
        const debt = Math.max(expectedThisYear - paidThisYear, 0);

        return {
          name: studentItem.user?.name || "O'quvchi",
          debt,
        };
      })
      .filter((studentItem) => studentItem.debt > 0)
      .sort((a, b) => b.debt - a.debt);

    if (debtorStudents.length > 0) {
      const leadDebtor = debtorStudents[0];
      alerts.push({
        level: "warning",
        message: `${debtorStudents.length} ta o'quvchida qarzdorlik bor. Eng katta qarzdorlik: ${leadDebtor.name}.`,
      });
    }

    return res.json({
      classes: classCount,
      subjects: subjectCount,
      teachers: teacherCount,
      students: studentCount,
      parents: parentCount,
      studentStats: {
        today: studentToday,
        week: studentWeek,
        month: studentMonth,
      },
      teacherStats: {
        today: teacherToday,
        week: teacherWeek,
        month: teacherMonth,
      },
      finance: {
        monthIncome: monthIncome[0]?.total || 0,
        monthExpense: monthExpense[0]?.total || 0,
      },
      subscription: subscriptionDoc ? {
        startAt: subscriptionDoc.created_at || null,
        endAt: subscriptionDoc.endAt || null,
        daysLeft: subscriptionDoc.endAt ? Math.ceil((new Date(subscriptionDoc.endAt) - now) / (1000 * 60 * 60 * 24)) : null,
        isExpired: subscriptionDoc.endAt ? new Date(subscriptionDoc.endAt) < now : false,
      } : null,
      recentActivities,
      alerts: alerts.slice(0, 6),
      admissionTimeline,
    });
  } catch (err) {
    console.error("Error in director.getOverview:", err);
    return res.status(400).json({ message: err.message || "Failed to load director overview" });
  }
};

const getSubscriptionStatus = async (req, res) => {
  try {
    const school = await ensureSchoolManagementUser(req.user);
    const subscriptionDoc = await Subscription.findOne({ school: school._id }).lean().exec();
    const now = new Date();

    return res.json({
      subscription: subscriptionDoc ? {
        startAt: subscriptionDoc.created_at || null,
        endAt: subscriptionDoc.endAt || null,
        daysLeft: subscriptionDoc.endAt ? Math.ceil((new Date(subscriptionDoc.endAt) - now) / (1000 * 60 * 60 * 24)) : null,
        isExpired: subscriptionDoc.endAt ? new Date(subscriptionDoc.endAt) < now : false,
      } : null,
    });
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to load subscription status" });
  }
};

const createClass = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ message: "Class name is required" });
    }

    const school = await ensureSchoolManagementUser(req.user);

    const existing = await ClassModel.findOne({ name, school: school._id });
    if (existing) {
      return res.status(400).json({ message: "Class with this name already exists in this school" });
    }

    const cls = await ClassModel.create({ name, school: school._id });
    return res.status(201).json(cls);
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to create class" });
  }
};

const listClasses = async (req, res) => {
  try {
    const school = await ensureSchoolManagementUser(req.user);
    const classes = await ClassModel.find({ school: school._id })
      .populate({
        path: "classTeacher",
        populate: { path: "user", select: "name" },
      })
      .sort({ createdAt: -1 })
      .exec();
    const result = await buildClassSummaries(school._id, classes);

    return res.json(result);
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to list classes" });
  }
};

const getClassInsights = async (req, res) => {
  try {
    const school = await ensureSchoolManagementUser(req.user);
    const { classId, studentId } = req.query;

    const classes = await ClassModel.find({ school: school._id })
      .populate({
        path: "classTeacher",
        populate: { path: "user", select: "name" },
      })
      .sort({ name: 1 })
      .lean()
      .exec();

    const classSummaries = await buildClassSummaries(school._id, classes);

    if (!classId) {
      return res.json({
        classes: classSummaries,
        selectedClass: null,
        subjectRankings: [],
        studentRankings: [],
        selectedStudent: null,
      });
    }

    const selectedClass = classSummaries.find((cls) => String(cls._id) === String(classId));
    if (!selectedClass) {
      return res.status(404).json({ message: "Class not found" });
    }

    const students = await Student.find({ school: school._id, class: classId })
      .populate("user", "name email")
      .lean()
      .exec();

    const studentIds = students.map((student) => student._id);
    const grades = await Grade.find({ school: school._id, student: { $in: studentIds } })
      .populate("subject", "name")
      .populate({
        path: "student",
        populate: { path: "user", select: "name email" },
      })
      .sort({ date: -1 })
      .lean()
      .exec();

    const subjectStatsMap = new Map();
    const studentStatsMap = new Map();
    const studentSubjectStatsMap = new Map();

    students.forEach((student) => {
      studentStatsMap.set(String(student._id), {
        studentId: student._id,
        studentName: student.user?.name || "O'quvchi",
        email: student.user?.email || null,
        averageGrade: 0,
        gradesCount: 0,
      });
    });

    grades.forEach((gradeRecord) => {
      const subjectKey = String(gradeRecord.subject?._id || gradeRecord.subject);
      const studentKey = String(gradeRecord.student?._id || gradeRecord.student);
      const subjectName = gradeRecord.subject?.name || "Fan";
      const studentName = gradeRecord.student?.user?.name || "O'quvchi";
      const studentEmail = gradeRecord.student?.user?.email || null;

      if (!subjectStatsMap.has(subjectKey)) {
        subjectStatsMap.set(subjectKey, {
          subjectId: gradeRecord.subject?._id || null,
          subjectName,
          totalGrade: 0,
          gradesCount: 0,
        });
      }

      const subjectStats = subjectStatsMap.get(subjectKey);
      subjectStats.totalGrade += gradeRecord.grade;
      subjectStats.gradesCount += 1;

      if (!studentStatsMap.has(studentKey)) {
        studentStatsMap.set(studentKey, {
          studentId: gradeRecord.student?._id || null,
          studentName,
          email: studentEmail,
          averageGrade: 0,
          gradesCount: 0,
        });
      }

      const studentStats = studentStatsMap.get(studentKey);
      studentStats.averageGrade += gradeRecord.grade;
      studentStats.gradesCount += 1;

      const studentSubjectKey = `${studentKey}:${subjectKey}`;
      if (!studentSubjectStatsMap.has(studentSubjectKey)) {
        studentSubjectStatsMap.set(studentSubjectKey, {
          studentId: gradeRecord.student?._id || null,
          subjectId: gradeRecord.subject?._id || null,
          subjectName,
          studentName,
          totalGrade: 0,
          gradesCount: 0,
          bestGrade: gradeRecord.grade,
          lastGrade: gradeRecord.grade,
          lastDate: gradeRecord.date,
        });
      }

      const studentSubjectStats = studentSubjectStatsMap.get(studentSubjectKey);
      studentSubjectStats.totalGrade += gradeRecord.grade;
      studentSubjectStats.gradesCount += 1;
      studentSubjectStats.bestGrade = Math.max(studentSubjectStats.bestGrade, gradeRecord.grade);
      if (!studentSubjectStats.lastDate || new Date(gradeRecord.date) > new Date(studentSubjectStats.lastDate)) {
        studentSubjectStats.lastDate = gradeRecord.date;
        studentSubjectStats.lastGrade = gradeRecord.grade;
      }
    });

    const subjectBestStudentMap = new Map();
    Array.from(studentSubjectStatsMap.values()).forEach((item) => {
      const average = item.gradesCount > 0 ? item.totalGrade / item.gradesCount : 0;
      const subjectKey = String(item.subjectId);
      const current = subjectBestStudentMap.get(subjectKey);
      if (!current || average > current.averageGrade) {
        subjectBestStudentMap.set(subjectKey, {
          studentName: item.studentName,
          averageGrade: average,
        });
      }
    });

    const subjectRankings = Array.from(subjectStatsMap.values())
      .map((item) => ({
        subjectId: item.subjectId,
        subjectName: item.subjectName,
        averageGrade: item.gradesCount > 0 ? Number((item.totalGrade / item.gradesCount).toFixed(2)) : 0,
        gradesCount: item.gradesCount,
        bestStudentName: subjectBestStudentMap.get(String(item.subjectId))?.studentName || null,
      }))
      .sort((a, b) => b.averageGrade - a.averageGrade || b.gradesCount - a.gradesCount);

    const studentRankings = Array.from(studentStatsMap.values())
      .map((item) => ({
        studentId: item.studentId,
        studentName: item.studentName,
        email: item.email,
        averageGrade: item.gradesCount > 0 ? Number((item.averageGrade / item.gradesCount).toFixed(2)) : 0,
        gradesCount: item.gradesCount,
      }))
      .sort((a, b) => b.averageGrade - a.averageGrade || b.gradesCount - a.gradesCount || a.studentName.localeCompare(b.studentName));

    let selectedStudent = null;
    if (studentId) {
      const studentInClass = students.find((student) => String(student._id) === String(studentId));
      if (studentInClass) {
        selectedStudent = {
          studentId: studentInClass._id,
          studentName: studentInClass.user?.name || "O'quvchi",
          email: studentInClass.user?.email || null,
          subjectGrades: Array.from(studentSubjectStatsMap.values())
            .filter((item) => String(item.studentId) === String(studentId))
            .map((item) => ({
              subjectId: item.subjectId,
              subjectName: item.subjectName,
              averageGrade: item.gradesCount > 0 ? Number((item.totalGrade / item.gradesCount).toFixed(2)) : 0,
              gradesCount: item.gradesCount,
              bestGrade: item.bestGrade,
              lastGrade: item.lastGrade,
            }))
            .sort((a, b) => b.averageGrade - a.averageGrade || b.gradesCount - a.gradesCount),
        };
      }
    }

    return res.json({
      classes: classSummaries,
      selectedClass,
      subjectRankings,
      studentRankings,
      selectedStudent,
    });
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to load class insights" });
  }
};

const updateClass = async (req, res) => {
  try {
    const { id } = req.params;
    const { classTeacherId } = req.body;

    const school = await ensureSchoolManagementUser(req.user);

    const cls = await ClassModel.findOne({ _id: id, school: school._id });
    if (!cls) {
      return res.status(404).json({ message: "Class not found" });
    }

    if (classTeacherId) {
      const teacher = await Teacher.findOne({ _id: classTeacherId, school: school._id }).populate("user", "name");
      if (!teacher) {
        return res.status(400).json({ message: "Teacher not found in this school" });
      }
      cls.classTeacher = teacher._id;
      await cls.save();

      return res.json({
        _id: cls._id,
        name: cls.name,
        classTeacherId: teacher._id,
        classTeacherName: teacher.user?.name || null,
      });
    }

    // Agar classTeacherId yuborilmasa yoki bo'sh bo'lsa, sinf rahbarini olib tashlaymiz
    cls.classTeacher = null;
    await cls.save();

    return res.json({
      _id: cls._id,
      name: cls.name,
      classTeacherId: null,
      classTeacherName: null,
    });
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to update class" });
  }
};

const createSubject = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ message: "Subject name is required" });
    }

    const school = await ensureSchoolManagementUser(req.user);

    const existing = await Subject.findOne({ name, school: school._id });
    if (existing) {
      return res.status(400).json({ message: "Subject with this name already exists in this school" });
    }

    const subject = await Subject.create({ name, school: school._id });
    return res.status(201).json(subject);
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to create subject" });
  }
};

const listSubjects = async (req, res) => {
  try {
    const school = await ensureSchoolManagementUser(req.user);
    const subjects = await Subject.find({ school: school._id }).sort({ createdAt: -1 });
    return res.json(subjects);
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to list subjects" });
  }
};

const createTeacher = async (req, res) => {
  try {
    const { name, email, password, subjectId } = req.body;
    if (!name || !email || !password || !subjectId) {
      return res.status(400).json({ message: "name, email, password and subjectId are required" });
    }

    const school = await ensureSchoolManagementUser(req.user);

    const [existingUser, subject] = await Promise.all([
      User.findOne({ email }),
      Subject.findOne({ _id: subjectId, school: school._id }),
    ]);

    if (existingUser) {
      return res.status(400).json({ message: "Email already in use" });
    }
    if (!subject) {
      return res.status(400).json({ message: "Subject not found in this school" });
    }

    const createdUser = await User.create({
      name,
      email,
      password,
      role: "teacher",
      school: school._id,
    });

    const teacher = await Teacher.create({
      user: createdUser._id,
      subject: subject._id,
      school: school._id,
    });

    return res.status(201).json({
      user: {
        id: createdUser._id,
        name: createdUser.name,
        email: createdUser.email,
        role: createdUser.role,
      },
      teacher,
    });
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to create teacher" });
  }
};

const listTeachers = async (req, res) => {
  try {
    const school = await ensureSchoolManagementUser(req.user);
    const [teachers, allSchoolClasses, studentCountsPerClass] = await Promise.all([
      Teacher.find({ school: school._id })
        .populate("user", "name email")
        .populate("subject", "name")
        .sort({ createdAt: -1 })
        .lean()
        .exec(),
      ClassModel.find({ school: school._id }).select("_id name classTeacher").lean().exec(),
      Student.aggregate([
        { $match: { school: school._id } },
        { $group: { _id: "$class", count: { $sum: 1 } } },
      ]),
    ]);

    const studentCountMap = new Map(studentCountsPerClass.map((item) => [String(item._id), item.count]));
    const teacherClassesMap = new Map();

    allSchoolClasses.forEach((cls) => {
      if (cls.classTeacher) {
        const teacherId = String(cls.classTeacher);
        if (!teacherClassesMap.has(teacherId)) {
          teacherClassesMap.set(teacherId, []);
        }
        teacherClassesMap.get(teacherId).push({
          id: cls._id,
          name: cls.name,
          studentCount: studentCountMap.get(String(cls._id)) || 0,
        });
      }
    });

    const result = teachers.map((t) => ({
      id: t._id,
      userId: t.user?._id,
      name: t.user?.name,
      email: t.user?.email,
      subjectId: t.subject?._id,
      subjectName: t.subject?.name,
      classes: teacherClassesMap.get(String(t._id)) || [],
    }));

    return res.json(result);
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to list teachers" });
  }
};

const updateTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, subjectId } = req.body;

    const school = await ensureSchoolManagementUser(req.user);

    const teacher = await Teacher.findOne({ _id: id, school: school._id }).populate("user").exec();
    if (!teacher || !teacher.user) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    const user = teacher.user;

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

    if (subjectId) {
      const subject = await Subject.findOne({ _id: subjectId, school: school._id });
      if (!subject) {
        return res.status(400).json({ message: "Subject not found in this school" });
      }
      teacher.subject = subject._id;
    }

    await user.save();
    await teacher.save();

    return res.json({
      id: teacher._id,
      name: user.name,
      email: user.email,
      subjectId: teacher.subject,
    });
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to update teacher" });
  }
};

const deleteTeacher = async (req, res) => {
  try {
    const { id } = req.params;

    const school = await ensureSchoolManagementUser(req.user);

    const teacher = await Teacher.findOne({ _id: id, school: school._id }).populate("user").exec();
    if (!teacher || !teacher.user) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    const userId = teacher.user._id;

    await Teacher.deleteOne({ _id: teacher._id });
    await User.deleteOne({ _id: userId });

    return res.json({ success: true });
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to delete teacher" });
  }
};

const createStudent = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      parentName,
      password,
      classId,
      studentCode,
      birthDate,
      gender,
      nationality,
      birthCertSeries,
      birthCertNumber,
      status,
      admissionOrderNumber,
      admissionOrderDate,
      classAdmissionDate,
      academicYear,
      educationLanguage,
      parentPassport,
      parentPhone,
      region,
      district,
      address,
    } = req.body;
    if (!name || !email || !password || !classId) {
      return res.status(400).json({ message: "name, email, password and classId are required" });
    }

    const school = await ensureSchoolManagementUser(req.user);

    const [existingUser, cls] = await Promise.all([
      User.findOne({ email }),
      ClassModel.findOne({ _id: classId, school: school._id }),
    ]);

    if (existingUser) {
      return res.status(400).json({ message: "Email already in use" });
    }
    if (!cls) {
      return res.status(400).json({ message: "Class not found in this school" });
    }

    const createdUser = await User.create({
      name,
      email,
      phone: phone || null,
      password,
      role: "student",
      school: school._id,
    });

    const student = await Student.create({
      user: createdUser._id,
      class: cls._id,
      school: school._id,
      parentName: parentName || undefined,
      studentCode: studentCode || undefined,
      birthDate: birthDate ? new Date(birthDate) : undefined,
      gender: gender || undefined,
      nationality: nationality || undefined,
      birthCertSeries: birthCertSeries || undefined,
      birthCertNumber: birthCertNumber || undefined,
      status: status || "active",
      admissionOrderNumber: admissionOrderNumber || undefined,
      admissionOrderDate: admissionOrderDate ? new Date(admissionOrderDate) : undefined,
      classAdmissionDate: classAdmissionDate ? new Date(classAdmissionDate) : undefined,
      academicYear: academicYear || undefined,
      educationLanguage: educationLanguage || undefined,
      parentPassport: parentPassport || undefined,
      parentPhone: parentPhone || undefined,
      region: region || undefined,
      district: district || undefined,
      address: address || undefined,
    });

    return res.status(201).json({
      user: {
        id: createdUser._id,
        name: createdUser.name,
        email: createdUser.email,
        phone: createdUser.phone,
        role: createdUser.role,
      },
      student,
    });
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to create student" });
  }
};

const normalizeImportKey = (value) =>
  String(value || "")
    .trim()
    .replace(/^\uFEFF/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const normalizeImportValue = (value) => String(value || "").trim();

const parseCsvRows = (content) => {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];
    const next = content[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        i += 1;
      }
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell);
  rows.push(row);

  return rows.filter((r) => r.some((c) => normalizeImportValue(c)));
};

const parseOptionalImportDate = (value, fieldLabel, errors) => {
  const normalized = normalizeImportValue(value);
  if (!normalized) return undefined;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    errors.push(`${fieldLabel} noto'g'ri sana`);
    return undefined;
  }
  return parsed;
};

const normalizeImportedGender = (value) => {
  const normalized = normalizeImportKey(value);
  if (!normalized) return "";
  if (normalized === "male" || normalized === "erkak") return "male";
  if (normalized === "female" || normalized === "ayol") return "female";
  return String(value || "").trim();
};

const normalizeImportedStatus = (value) => {
  const normalized = normalizeImportKey(value);
  if (!normalized) return "";
  if (normalized === "active" || normalized === "oquvchi") return "active";
  if (normalized === "inactive" || normalized === "vaqtinchatoxtagan") return "inactive";
  if (normalized === "graduated" || normalized === "bitirgan") return "graduated";
  return String(value || "").trim();
};

const importStudents = async (req, res) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ message: "CSV fayl yuklanmagan" });
    }

    const school = await ensureSchoolManagementUser(req.user);
    const content = req.file.buffer.toString("utf8").replace(/^\uFEFF/, "");
    const parsedRows = parseCsvRows(content);

    if (parsedRows.length < 2) {
      return res.status(400).json({ message: "CSV faylda import qilinadigan qator topilmadi" });
    }

    const headers = parsedRows[0].map(normalizeImportKey);
    const dataRows = parsedRows.slice(1);
    const headerIndex = new Map(headers.map((header, index) => [header, index]));
    const valueOf = (row, ...keys) => {
      for (const key of keys) {
        const index = headerIndex.get(normalizeImportKey(key));
        if (typeof index === "number") {
          return normalizeImportValue(row[index]);
        }
      }
      return "";
    };

    const classes = await ClassModel.find({ school: school._id }).select("_id name").lean().exec();
    const classByName = new Map(classes.map((cls) => [String(cls.name || "").trim().toLowerCase(), cls]));
    const errors = [];
    const validRows = [];
    const emailsInFile = new Set();
    const allEmails = dataRows
      .map((row) => valueOf(row, "email").toLowerCase())
      .filter(Boolean);
    const existingUsers = allEmails.length
      ? await User.find({ email: { $in: allEmails } }).select("email").lean().exec()
      : [];
    const existingEmails = new Set(existingUsers.map((user) => String(user.email || "").toLowerCase()));

    dataRows.forEach((row, index) => {
      const rowNumber = index + 2;
      const rowErrors = [];
      const fullName = valueOf(row, "fullName", "name", "fish");
      const email = valueOf(row, "email").toLowerCase();
      const password = valueOf(row, "password", "parol");
      const className = valueOf(row, "className", "class", "sinf", "sinf kodi");
      const cls = classByName.get(className.trim().toLowerCase());
      const gender = normalizeImportedGender(valueOf(row, "gender", "jinsi"));
      const status = normalizeImportedStatus(valueOf(row, "status", "o'quvchi holati", "oquvchi holati"));
      const birthCertificateCombined = valueOf(row, "guvohnoma seriya va raqami");

      if (!fullName) rowErrors.push("fullName majburiy");
      if (!email) {
        rowErrors.push("email majburiy");
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        rowErrors.push("email formati noto'g'ri");
      } else if (emailsInFile.has(email)) {
        rowErrors.push("CSV ichida email takrorlangan");
      } else if (existingEmails.has(email)) {
        rowErrors.push("Email allaqachon mavjud");
      }
      if (!password) rowErrors.push("password majburiy");
      if (!className) {
        rowErrors.push("className majburiy");
      } else if (!cls) {
        rowErrors.push(`Sinf topilmadi: ${className}`);
      }
      if (gender && !["male", "female"].includes(gender)) {
        rowErrors.push("gender faqat male yoki female bo'lishi kerak");
      }
      if (status && !["active", "inactive", "graduated"].includes(status)) {
        rowErrors.push("status faqat active, inactive yoki graduated bo'lishi kerak");
      }

      const birthDate = parseOptionalImportDate(valueOf(row, "birthDate", "tug'ilgan sana", "tugilgan sana"), "Tug'ilgan sana", rowErrors);
      const admissionOrderDate = parseOptionalImportDate(valueOf(row, "admissionOrderDate", "qabul buyruq sanasi"), "Qabul buyruq sanasi", rowErrors);
      const classAdmissionDate = parseOptionalImportDate(valueOf(row, "classAcceptedDate", "classAdmissionDate", "sinfga qabul sanasi"), "Sinfga qabul sanasi", rowErrors);

      if (rowErrors.length > 0) {
        errors.push({ row: rowNumber, message: rowErrors.join("; ") });
        return;
      }

      emailsInFile.add(email);
      validRows.push({
        row: rowNumber,
        name: fullName,
        email,
        password,
        phone: valueOf(row, "phone", "shaxsiy telefon raqami") || undefined,
        classId: cls._id,
        student: {
          studentCode: valueOf(row, "studentCode", "id") || undefined,
          birthDate,
          gender: gender || undefined,
          nationality: valueOf(row, "nationality", "millati") || undefined,
          birthCertSeries: valueOf(row, "birthCertSeries", "guvohnoma seriyasi") || undefined,
          birthCertNumber: valueOf(row, "birthCertNumber", "guvohnoma raqami") || birthCertificateCombined || undefined,
          status: status || "active",
          parentName: valueOf(row, "parentName", "ota-ona yoki vasiy fish", "ota ona yoki vasiy fish") || undefined,
          parentPassport: valueOf(row, "parentPassport", "ota-ona yoki vasiy passporti", "ota ona yoki vasiy passporti") || undefined,
          parentPhone: valueOf(row, "parentPhone", "ota-ona yoki vasiy telefon raqami", "ota ona yoki vasiy telefon raqami") || undefined,
          region: valueOf(row, "region", "viloyat") || undefined,
          district: valueOf(row, "district", "tuman") || undefined,
          address: valueOf(row, "address", "to'liq manzil", "toliq manzil") || undefined,
          academicYear: valueOf(row, "academicYear", "o'quv yili", "oquv yili") || undefined,
          educationLanguage: valueOf(row, "educationLanguage", "ta'lim tili", "talim tili") || undefined,
          admissionOrderNumber: valueOf(row, "admissionOrderNumber", "qabul buyruq raqami") || undefined,
          admissionOrderDate,
          classAdmissionDate,
        },
      });
    });

    let created = 0;
    for (const row of validRows) {
      let createdUser = null;
      try {
        createdUser = await User.create({
          name: row.name,
          email: row.email,
          phone: row.phone || null,
          password: row.password,
          role: "student",
          school: school._id,
        });

        await Student.create({
          user: createdUser._id,
          class: row.classId,
          school: school._id,
          ...row.student,
        });
        created += 1;
      } catch (err) {
        if (createdUser?._id) {
          await User.deleteOne({ _id: createdUser._id });
        }
        errors.push({ row: row.row, message: err.message || "Qatorni saqlashda xatolik" });
      }
    }

    return res.json({
      created,
      failed: errors.length,
      errors,
    });
  } catch (err) {
    return res.status(400).json({ message: err.message || "O'quvchilarni import qilishda xatolik" });
  }
};

const listStudentsForDirector = async (req, res) => {
  try {
    const school = await ensureSchoolManagementUser(req.user);
    const students = await Student.find({ school: school._id })
      .populate("user", "name email phone photoUrl")
      .populate("class", "name")
      .sort({ createdAt: -1 })
      .exec();

    const result = students.map((s) => ({
      id: s._id,
      userId: s.user?._id,
      name: s.user?.name,
      email: s.user?.email,
      phone: s.user?.phone || "",
      photoUrl: s.user?.photoUrl || null,
      classId: s.class?._id,
      className: s.class?.name,
      studentCode: s.studentCode || "",
      birthDate: s.birthDate || null,
      gender: s.gender || "",
      nationality: s.nationality || "",
      birthCertSeries: s.birthCertSeries || "",
      birthCertNumber: s.birthCertNumber || "",
      status: s.status || "",
      admissionOrderNumber: s.admissionOrderNumber || "",
      academicYear: s.academicYear || "",
      educationLanguage: s.educationLanguage || "",
      admissionOrderDate: s.admissionOrderDate || null,
      classAcceptedDate: s.classAdmissionDate || null,
      parentName: s.parentName || "",
      parentPassport: s.parentPassport || "",
      parentPhone: s.parentPhone || "",
      region: s.region || "",
      district: s.district || "",
      address: s.address || "",
      createdAt: s.createdAt || null,
    }));

    return res.json(result);
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to list students" });
  }
};

const updateStudentForDirector = async (req, res) => {
  try {
    const school = await ensureSchoolManagementUser(req.user);
    const { id } = req.params;
    const { photoUrl, name, faceDescriptor } = req.body;

    const student = await Student.findOne({ _id: id, school: school._id }).populate("user").exec();
    if (!student || !student.user) {
      return res.status(404).json({ message: "Student not found" });
    }
    const user = student.user;
    if (typeof photoUrl !== "undefined") user.photoUrl = photoUrl || null;
    if (name && typeof name === "string" && name.trim()) user.name = name.trim();
    if (faceDescriptor !== undefined)
      user.faceDescriptor = Array.isArray(faceDescriptor) && faceDescriptor.length === 128 ? faceDescriptor : null;
    await user.save();
    return res.json({
      id: student._id,
      name: user.name,
      email: user.email,
      photoUrl: user.photoUrl || null,
    });
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to update student" });
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
    const school = await ensureSchoolManagementUser(req.user);
    const { descriptor, classId } = req.body;

    if (!descriptor || !Array.isArray(descriptor) || descriptor.length !== 128) {
      return res.status(400).json({ message: "descriptor (128 numbers) is required" });
    }

    let students;
    if (classId) {
      const cls = await ClassModel.findOne({ _id: classId, school: school._id });
      if (!cls) return res.status(400).json({ message: "Class not found" });
      students = await Student.find({ class: classId, school: school._id }).populate("user", "name faceDescriptor");
    } else {
      students = await Student.find({ school: school._id }).populate("user", "name faceDescriptor");
    }

    const withDescriptor = students.filter((s) => s.user && s.user.faceDescriptor && s.user.faceDescriptor.length === 128);
    if (withDescriptor.length === 0) {
      return res.status(400).json({ message: "Maktabda Face ID ro'yxatdan o'tkazilgan o'quvchi yo'q" });
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
      { student: best.student._id, date: today, school: school._id },
      {
        $set: {
          status: "present",
          school: school._id,
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

const createParent = async (req, res) => {
  try {
    const { name, email, phone, password, studentId } = req.body;
    if (!name || !email || !phone || !password || !studentId) {
      return res.status(400).json({ message: "name, email, phone, password and studentId are required" });
    }

    const school = await ensureSchoolManagementUser(req.user);

    const [existingUser, student] = await Promise.all([
      User.findOne({ email }),
      Student.findOne({ _id: studentId, school: school._id }).populate("user"),
    ]);

    if (existingUser) {
      return res.status(400).json({ message: "Email already in use" });
    }
    if (!student) {
      return res.status(400).json({ message: "Student not found in this school" });
    }

    const createdUser = await User.create({
      name,
      email,
      phone,
      password,
      role: "parent",
      school: school._id,
    });

    const parent = await ParentModel.create({
      user: createdUser._id,
      student: student._id,
      school: school._id,
    });

    await Student.updateOne(
      { _id: student._id, school: school._id },
      { $set: { parentPhone: phone } },
    );

    return res.status(201).json({
      user: {
        id: createdUser._id,
        name: createdUser.name,
        email: createdUser.email,
        phone: createdUser.phone,
        role: createdUser.role,
      },
      parent,
    });
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to create parent" });
  }
};

const createTimetableEntry = async (req, res) => {
  try {
    const { classId, subjectId, teacherId, dayOfWeek, startTime, endTime, room } = req.body;
    if (
      !classId ||
      !subjectId ||
      !teacherId ||
      typeof dayOfWeek !== "number" ||
      dayOfWeek < 0 ||
      dayOfWeek > 6 ||
      !startTime ||
      !endTime
    ) {
      return res.status(400).json({
        message:
          "classId, subjectId, teacherId, dayOfWeek (0-6), startTime va endTime majburiy maydonlardir",
      });
    }

    const school = await ensureSchoolManagementUser(req.user);

    const [cls, subject, teacher] = await Promise.all([
      ClassModel.findOne({ _id: classId, school: school._id }),
      Subject.findOne({ _id: subjectId, school: school._id }),
      Teacher.findOne({ _id: teacherId, school: school._id }),
    ]);

    if (!cls) {
      return res.status(400).json({ message: "Class not found in this school" });
    }
    if (!subject) {
      return res.status(400).json({ message: "Subject not found in this school" });
    }
    if (!teacher) {
      return res.status(400).json({ message: "Teacher not found in this school" });
    }

    const entry = await Timetable.create({
      class: cls._id,
      subject: subject._id,
      teacher: teacher._id,
      school: school._id,
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

const listTimetableForClass = async (req, res) => {
  try {
    const school = await ensureSchoolManagementUser(req.user);
    const { classId } = req.query;

    if (!classId) {
      return res.status(400).json({ message: "classId is required" });
    }

    const cls = await ClassModel.findOne({ _id: classId, school: school._id });
    if (!cls) {
      return res.status(400).json({ message: "Class not found in this school" });
    }

    const entries = await Timetable.find({ school: school._id, class: cls._id })
      .populate("subject", "name")
      .populate({
        path: "teacher",
        populate: { path: "user", select: "name" },
      })
      .sort({ dayOfWeek: 1, startTime: 1 })
      .exec();

    return res.json(
      entries.map((e) => ({
        id: e._id,
        subjectId: e.subject?._id || null,
        teacherId: e.teacher?._id || null,
        dayOfWeek: e.dayOfWeek,
        startTime: e.startTime,
        endTime: e.endTime,
        room: e.room,
        subjectName: e.subject?.name || "",
        teacherName: e.teacher?.user?.name || "",
      })),
    );
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to list timetable for class" });
  }
};

const updateTimetableEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const { classId, subjectId, teacherId, dayOfWeek, startTime, endTime, room } = req.body;

    if (
      !classId ||
      !subjectId ||
      !teacherId ||
      typeof dayOfWeek !== "number" ||
      dayOfWeek < 0 ||
      dayOfWeek > 6 ||
      !startTime ||
      !endTime
    ) {
      return res.status(400).json({
        message:
          "classId, subjectId, teacherId, dayOfWeek (0-6), startTime va endTime majburiy maydonlardir",
      });
    }

    const school = await ensureSchoolManagementUser(req.user);

    const [entry, cls, subject, teacher] = await Promise.all([
      Timetable.findOne({ _id: id, school: school._id }),
      ClassModel.findOne({ _id: classId, school: school._id }),
      Subject.findOne({ _id: subjectId, school: school._id }),
      Teacher.findOne({ _id: teacherId, school: school._id }),
    ]);

    if (!entry) {
      return res.status(404).json({ message: "Timetable entry not found" });
    }
    if (!cls) {
      return res.status(400).json({ message: "Class not found in this school" });
    }
    if (!subject) {
      return res.status(400).json({ message: "Subject not found in this school" });
    }
    if (!teacher) {
      return res.status(400).json({ message: "Teacher not found in this school" });
    }

    entry.class = cls._id;
    entry.subject = subject._id;
    entry.teacher = teacher._id;
    entry.dayOfWeek = dayOfWeek;
    entry.startTime = startTime;
    entry.endTime = endTime;
    entry.room = room || undefined;

    await entry.save();

    return res.json({ success: true, id: entry._id });
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to update timetable entry" });
  }
};

const deleteTimetableEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const school = await ensureSchoolManagementUser(req.user);

    const entry = await Timetable.findOne({ _id: id, school: school._id });
    if (!entry) {
      return res.status(404).json({ message: "Timetable entry not found" });
    }

    await Timetable.deleteOne({ _id: entry._id });
    return res.json({ success: true });
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to delete timetable entry" });
  }
};

const listAttendanceStatsForDirector = async (req, res) => {
  try {
    const school = await ensureSchoolManagementUser(req.user);
    const range = (req.query.range || "1w").toString();
    if (!["1d", "1w", "1m"].includes(range)) {
      return res.status(400).json({ message: "range must be 1d, 1w, or 1m" });
    }
    const payload = await getSchoolAttendanceStats(school._id, range);
    return res.json(payload);
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to load attendance stats" });
  }
};

module.exports = {
  createSchoolAdminForDirector,
  listUsersForDirector,
  getUserForDirector,
  updateUserForDirector,
  deleteUserForDirector,
  getOverview,
  getSubscriptionStatus,
  createClass,
  listClasses,
  getClassInsights,
  updateClass,
  createSubject,
  listSubjects,
  createTeacher,
  listTeachers,
  updateTeacher,
  deleteTeacher,
  createStudent,
  importStudents,
  listStudentsForDirector,
  updateStudentForDirector,
  createParent,
  setAttendanceByFace,
  createTimetableEntry,
  listTimetableForClass,
  updateTimetableEntry,
  deleteTimetableEntry,
  listAttendanceStatsForDirector,
};

