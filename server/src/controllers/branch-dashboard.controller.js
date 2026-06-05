const User = require("../models/User");
const School = require("../models/School");
const ClassModel = require("../models/Class");
const Student = require("../models/Student");
const Teacher = require("../models/Teacher");
const Attendance = require("../models/Attendance");
const FinanceTransaction = require("../models/FinanceTransaction");
const Branch = require("../models/Branch");
const { resolveSchoolPlan } = require("../utils/schoolPlan");

const ensureSchool = async (user) => {
  if (!user.schoolId) throw new Error("School manager is not linked to a school");
  const school = await School.findById(user.schoolId);
  if (!school) throw new Error("School not found");
  return school;
};

const assertBranchAccess = async (user, branchId) => {
  const branch = await Branch.findOne({ _id: branchId, school: user.schoolId }).lean();
  if (!branch) throw Object.assign(new Error("Branch not found"), { statusCode: 404 });
  if (user.role === "director") return branch;
  if (user.role === "school_admin") {
    if (String(branch.managerUser) !== String(user._id)) {
      throw Object.assign(new Error("You do not have access to this branch"), { statusCode: 403 });
    }
    return branch;
  }
  throw Object.assign(new Error("Access denied"), { statusCode: 403 });
};

const getBranchUsers = async (branchId, schoolId) => {
  const userDocs = await User.find({ branchId, school: schoolId }).select("_id").lean();
  const userIds = userDocs.map((u) => u._id);
  return userIds;
};

const getBranchStudentIds = async (userIds, schoolId) => {
  const students = await Student.find({ user: { $in: userIds }, school: schoolId }).select("_id").lean();
  return students.map((s) => s._id);
};

const getMonthStr = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const getMonthlySnapshots = async (studentIds, schoolId, monthsBack = 6) => {
  const now = new Date();
  const snapshots = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStr = getMonthStr(d);
    snapshots.push({ month: monthStr, label: `${d.getMonth() + 1}/${d.getFullYear()}` });
  }
  return snapshots;
};

const getOverview = async (req, res) => {
  try {
    const school = await ensureSchool(req.user);
    const branch = await assertBranchAccess(req.user, req.params.id);
    const userIds = await getBranchUsers(branch._id, school._id);
    const studentIds = await getBranchStudentIds(userIds, school._id);

    const students = await Student.find({ user: { $in: userIds }, school: school._id }).lean();
    const totalStudents = students.length;
    const activeStudents = students.filter((s) => s.status === "active" || s.status === "").length;
    const teachers = await Teacher.find({ user: { $in: userIds }, school: school._id }).lean();
    const classes = await ClassModel.find({ branch: branch._id, school: school._id }).lean();
    const now = new Date();
    const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const newStudents = students.filter((s) => s.createdAt && new Date(s.createdAt) >= monthAgo).length;

    const attendanceDocs = await Attendance.find({
      student: { $in: studentIds },
      school: school._id,
    }).lean();
    const totalAtt = attendanceDocs.length;
    const presentAtt = attendanceDocs.filter((a) => a.status === "present" || a.status === "late").length;
    const monthlyAttendancePercent = totalAtt > 0 ? Math.round((presentAtt / totalAtt) * 100) : 0;

    const nowMonth = getMonthStr(now);
    const financeDocs = await FinanceTransaction.find({
      student: { $in: studentIds },
      school: school._id,
      type: "income",
      billingMonth: nowMonth,
    }).lean();
    const monthlyRevenue = financeDocs.reduce((sum, t) => sum + t.amount, 0);

    const months = await getMonthlySnapshots(studentIds, school._id);
    const studentGrowth = [];
    const revenueGrowth = [];
    const attendanceTrend = [];

    for (const m of months) {
      const monthStart = new Date(m.month + "-01");
      const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
      const monthStudents = students.filter((s) => s.createdAt && new Date(s.createdAt) <= monthEnd).length;
      studentGrowth.push({ month: m.label, count: monthStudents });

      const monthFinance = await FinanceTransaction.find({
        student: { $in: studentIds },
        school: school._id,
        type: "income",
        billingMonth: m.month,
      }).lean();
      revenueGrowth.push({ month: m.label, amount: monthFinance.reduce((sum, t) => sum + t.amount, 0) });

      const monthAtt = attendanceDocs.filter((a) => {
        if (!a.date) return false;
        const d = new Date(a.date);
        return d >= monthStart && d <= monthEnd;
      });
      const monthPresent = monthAtt.filter((a) => a.status === "present" || a.status === "late").length;
      attendanceTrend.push({
        month: m.label,
        percent: monthAtt.length > 0 ? Math.round((monthPresent / monthAtt.length) * 100) : 0,
      });
    }

    return res.json({
      kpis: {
        totalStudents,
        activeStudents,
        totalTeachers: teachers.length,
        totalGroups: classes.length,
        monthlyAttendancePercent,
        monthlyRevenue,
        newStudentsThisMonth: newStudents,
      },
      charts: { studentGrowth, revenueGrowth, attendanceTrend },
    });
  } catch (err) {
    return res.status(err.statusCode || 400).json({ message: err.message || "Failed to load branch overview" });
  }
};

const getFinance = async (req, res) => {
  try {
    const school = await ensureSchool(req.user);
    const branch = await assertBranchAccess(req.user, req.params.id);
    const userIds = await getBranchUsers(branch._id, school._id);
    const studentIds = await getBranchStudentIds(userIds, school._id);

    const now = new Date();
    const nowMonth = getMonthStr(now);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const allIncome = await FinanceTransaction.find({
      student: { $in: studentIds },
      school: school._id,
      type: "income",
    }).lean();

    const daily = allIncome.filter((t) => t.date && new Date(t.date).toDateString() === now.toDateString())
      .reduce((sum, t) => sum + t.amount, 0);
    const weekly = allIncome.filter((t) => t.date && new Date(t.date) >= weekAgo)
      .reduce((sum, t) => sum + t.amount, 0);
    const monthly = allIncome.filter((t) => t.billingMonth === nowMonth)
      .reduce((sum, t) => sum + t.amount, 0);
    const annual = allIncome.filter((t) => t.date && new Date(t.date) >= yearStart)
      .reduce((sum, t) => sum + t.amount, 0);

    const students = await Student.find({ user: { $in: userIds }, school: school._id }).lean();
    const paidStudentIds = new Set(allIncome.filter((t) => t.billingMonth === nowMonth).map((t) => String(t.student)));
    const totalWithFee = students.filter((s) => s.monthlyFee > 0).length;
    const paidCount = students.filter((s) => paidStudentIds.has(String(s._id))).length;
    const debtors = totalWithFee - paidCount;
    const debtAmount = students
      .filter((s) => s.monthlyFee > 0 && !paidStudentIds.has(String(s._id)))
      .reduce((sum, s) => sum + (s.monthlyFee || 0), 0);

    const classes = await ClassModel.find({ branch: branch._id, school: school._id }).lean();
    const courseRevenue = [];
    for (const cls of classes) {
      const clsStudents = await Student.find({ class: cls._id, school: school._id }).select("_id").lean();
      const clsIds = clsStudents.map((s) => s._id);
      const revenue = allIncome
        .filter((t) => clsIds.includes(String(t.student)) && t.billingMonth === nowMonth)
        .reduce((sum, t) => sum + t.amount, 0);
      courseRevenue.push({ courseName: cls.name, amount: revenue });
    }
    courseRevenue.sort((a, b) => b.amount - a.amount);
    const topCourse = courseRevenue.length > 0 ? courseRevenue[0] : null;

    return res.json({
      revenue: { daily, weekly, monthly, annual },
      payments: { paidStudents: paidCount, debtors, debtAmount },
      courseRevenue,
      topCourse,
    });
  } catch (err) {
    return res.status(err.statusCode || 400).json({ message: err.message || "Failed to load branch finance" });
  }
};

const getStudents = async (req, res) => {
  try {
    const school = await ensureSchool(req.user);
    const branch = await assertBranchAccess(req.user, req.params.id);
    const userIds = await getBranchUsers(branch._id, school._id);

    const allStudents = await Student.find({ user: { $in: userIds }, school: school._id }).populate("user", "name").lean();
    const total = allStudents.length;
    const active = allStudents.filter((s) => s.status === "active" || s.status === "").length;
    const now = new Date();
    const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const newStudents = allStudents.filter((s) => s.createdAt && new Date(s.createdAt) >= monthAgo).length;
    const graduated = allStudents.filter((s) => s.status === "graduated").length;
    const dropped = allStudents.filter((s) => s.status === "departed" || s.status === "inactive").length;

    const studentIds = allStudents.map((s) => s._id);
    const classes = await ClassModel.find({ branch: branch._id, school: school._id }).lean();

    const classAttendance = await Promise.all(
      classes.map(async (cls) => {
        const clsStudents = await Student.find({ class: cls._id, school: school._id }).select("_id").lean();
        const clsIds = clsStudents.map((s) => s._id);
        const att = await Attendance.find({ student: { $in: clsIds }, school: school._id }).lean();
        const total = att.length;
        const present = att.filter((a) => a.status === "present" || a.status === "late").length;
        return { className: cls.name, percent: total > 0 ? Math.round((present / total) * 100) : 0 };
      }),
    );
    classAttendance.sort((a, b) => b.percent - a.percent);
    const topGroups = classAttendance.slice(0, 3);
    const lowestGroups = classAttendance.slice(-3).reverse();

    const ages = allStudents
      .map((s) => (s.birthDate ? new Date().getFullYear() - new Date(s.birthDate).getFullYear() : null))
      .filter((a) => a !== null);
    const ageDistribution = [];
    const ageRanges = [
      { label: "0-6", min: 0, max: 6 },
      { label: "7-10", min: 7, max: 10 },
      { label: "11-14", min: 11, max: 14 },
      { label: "15-18", min: 15, max: 18 },
      { label: "19+", min: 19, max: 999 },
    ];
    for (const range of ageRanges) {
      ageDistribution.push({ age: range.label, count: ages.filter((a) => a >= range.min && a <= range.max).length });
    }

    const months = await getMonthlySnapshots(studentIds, school._id);
    const growthTrend = [];
    for (const m of months) {
      const monthEnd = new Date(m.month + "-01");
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      growthTrend.push({ month: m.label, count: allStudents.filter((s) => s.createdAt && new Date(s.createdAt) <= monthEnd).length });
    }

    return res.json({
      stats: { total, active, new: newStudents, graduated, dropped },
      attendance: { averagePercent: classAttendance.length > 0 ? Math.round(classAttendance.reduce((s, g) => s + g.percent, 0) / classAttendance.length) : 0, topGroups, lowestGroups },
      ageDistribution,
      growthTrend,
    });
  } catch (err) {
    return res.status(err.statusCode || 400).json({ message: err.message || "Failed to load branch students" });
  }
};

const getTeachers = async (req, res) => {
  try {
    const school = await ensureSchool(req.user);
    const branch = await assertBranchAccess(req.user, req.params.id);
    const userIds = await getBranchUsers(branch._id, school._id);

    const teachers = await Teacher.find({ user: { $in: userIds }, school: school._id })
      .populate("user", "name")
      .populate("subject", "name")
      .lean();
    const total = teachers.length;
    const active = teachers.filter((t) => t.status !== "inactive").length;

    const classes = await ClassModel.find({ branch: branch._id, school: school._id }).lean();
    const workload = teachers.map((t) => {
      const teacherClasses = classes.filter((c) => String(c.classTeacher) === String(t._id));
      const studentCount = teacherClasses.reduce((sum, c) => sum + (c.studentCount || 0), 0);
      return {
        teacherName: t.user?.name || "Noma'lum",
        groupCount: teacherClasses.length,
        studentCount,
        subject: t.subject?.name || null,
      };
    });
    workload.sort((a, b) => b.groupCount - a.groupCount);
    const topTeachers = workload.slice(0, 5);

    return res.json({
      stats: { total, active },
      workload,
      topTeachers,
      performanceSummary: {
        averageRating: 0,
        totalGroups: classes.length,
      },
    });
  } catch (err) {
    return res.status(err.statusCode || 400).json({ message: err.message || "Failed to load branch teachers" });
  }
};

const getPremiumInsights = async (req, res) => {
  try {
    const school = await ensureSchool(req.user);
    const branch = await assertBranchAccess(req.user, req.params.id);
    const userIds = await getBranchUsers(branch._id, school._id);
    const studentIds = await getBranchStudentIds(userIds, school._id);

    const now = new Date();
    const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, now.getDate());
    const nowMonth = getMonthStr(now);
    const prevMonth = getMonthStr(new Date(now.getFullYear(), now.getMonth() - 1, 1));

    const students = await Student.find({ user: { $in: userIds }, school: school._id }).lean();
    const classes = await ClassModel.find({ branch: branch._id, school: school._id }).lean();

    const allIncome = await FinanceTransaction.find({
      student: { $in: studentIds },
      school: school._id,
      type: "income",
    }).lean();
    const nowIncome = allIncome.filter((t) => t.billingMonth === nowMonth).reduce((sum, t) => sum + t.amount, 0);
    const prevIncome = allIncome.filter((t) => t.billingMonth === prevMonth).reduce((sum, t) => sum + t.amount, 0);

    const attendanceDocs = await Attendance.find({
      student: { $in: studentIds },
      school: school._id,
    }).lean();
    const nowAtt = attendanceDocs.filter((a) => a.date && new Date(a.date) >= monthAgo);
    const prevAtt = attendanceDocs.filter((a) => a.date && new Date(a.date) >= twoMonthsAgo && new Date(a.date) < monthAgo);

    const insights = [];

    const nowAttRate = nowAtt.length > 0
      ? Math.round((nowAtt.filter((a) => a.status === "present" || a.status === "late").length / nowAtt.length) * 100)
      : 0;
    const prevAttRate = prevAtt.length > 0
      ? Math.round((prevAtt.filter((a) => a.status === "present" || a.status === "late").length / prevAtt.length) * 100)
      : 0;
    if (prevAttRate - nowAttRate >= 5) {
      insights.push(`Davomat ${prevAttRate - nowAttRate}% ga kamaydi. Sababini tahlil qilish tavsiya etiladi.`);
    } else if (nowAttRate - prevAttRate >= 5) {
      insights.push(`Davomat ${nowAttRate - prevAttRate}% ga yaxshilandi.`);
    }

    if (prevIncome > 0) {
      const incomeChange = Math.round(((nowIncome - prevIncome) / prevIncome) * 100);
      if (incomeChange >= 10) {
        insights.push(`Daromad ${incomeChange}% ga oshdi. Asosiy omil: joriy oydagi to'lovlar.`);
      } else if (incomeChange <= -10) {
        insights.push(`Daromad ${Math.abs(incomeChange)}% ga kamaydi. To'lov intizomini kuchaytirish tavsiya etiladi.`);
      }
    }

    const newStudents = students.filter((s) => s.createdAt && new Date(s.createdAt) >= monthAgo).length;
    if (newStudents > 0) {
      insights.push(`Yangi o'quvchilar: ${newStudents} ta — filial o'sishda.`);
    }

    const growingCourses = classes.filter((c) => c.studentCount > 10);
    if (growingCourses.length > 0) {
      insights.push(`${growingCourses.map((c) => c.name).join(", ")} guruhlari eng ko'p o'quvchili guruhlar.`);
    }

    if (insights.length === 0) {
      insights.push("Barcha ko'rsatkichlar me'yorida. Filial barqaror rivojlanmoqda.");
    }

    return res.json({ insights });
  } catch (err) {
    return res.status(err.statusCode || 400).json({ message: err.message || "Failed to generate insights" });
  }
};

const getPremiumForecast = async (req, res) => {
  try {
    const school = await ensureSchool(req.user);
    const branch = await assertBranchAccess(req.user, req.params.id);
    const userIds = await getBranchUsers(branch._id, school._id);
    const studentIds = await getBranchStudentIds(userIds, school._id);

    const now = new Date();
    const nowMonth = getMonthStr(now);
    const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

    const students = await Student.find({ user: { $in: userIds }, school: school._id }).lean();
    const pastMonthNew = students.filter((s) => s.createdAt && new Date(s.createdAt) >= monthAgo).length;
    const expectedNewStudents = Math.max(Math.round(pastMonthNew * 1.1), 1);

    const allIncome = await FinanceTransaction.find({
      student: { $in: studentIds },
      school: school._id,
      type: "income",
      billingMonth: nowMonth,
    }).lean();
    const monthlyRevenue = allIncome.reduce((sum, t) => sum + t.amount, 0);
    const expectedRevenue = Math.round(monthlyRevenue * 1.08);

    const attendanceDocs = await Attendance.find({
      student: { $in: studentIds },
      school: school._id,
    }).lean();
    const totalAtt = attendanceDocs.length;
    const presentAtt = attendanceDocs.filter((a) => a.status === "present" || a.status === "late").length;
    const currentAttPercent = totalAtt > 0 ? Math.round((presentAtt / totalAtt) * 100) : 0;
    const expectedAttendance = Math.min(currentAttPercent + 2, 98);

    return res.json({
      expectedNewStudents,
      expectedRevenue,
      expectedAttendancePercent: expectedAttendance,
    });
  } catch (err) {
    return res.status(err.statusCode || 400).json({ message: err.message || "Failed to generate forecast" });
  }
};

const getPremiumAlerts = async (req, res) => {
  try {
    const school = await ensureSchool(req.user);
    const branch = await assertBranchAccess(req.user, req.params.id);
    const userIds = await getBranchUsers(branch._id, school._id);
    const studentIds = await getBranchStudentIds(userIds, school._id);

    const now = new Date();
    const nowMonth = getMonthStr(now);
    const alerts = [];

    const students = await Student.find({ user: { $in: userIds }, school: school._id }).lean();
    const attendanceDocs = await Attendance.find({
      student: { $in: studentIds },
      school: school._id,
    }).lean();
    const totalAtt = attendanceDocs.length;
    const presentAtt = attendanceDocs.filter((a) => a.status === "present" || a.status === "late").length;
    const attendanceRate = totalAtt > 0 ? Math.round((presentAtt / totalAtt) * 100) : 0;
    if (attendanceRate < 80 && attendanceRate > 0) {
      alerts.push({
        type: "warning",
        message: `Davomat ${attendanceRate}% — tavsiya etilgan me'yordan (80%) past`,
        metric: "attendance",
        value: attendanceRate,
      });
    }

    const allIncome = await FinanceTransaction.find({
      student: { $in: studentIds },
      school: school._id,
      type: "income",
      billingMonth: nowMonth,
    }).lean();
    const paidStudentIds = new Set(allIncome.map((t) => String(t.student)));
    const totalWithFee = students.filter((s) => s.monthlyFee > 0).length;
    const debtors = totalWithFee - students.filter((s) => paidStudentIds.has(String(s._id))).length;
    if (totalWithFee > 0) {
      const debtRatio = Math.round((debtors / totalWithFee) * 100);
      if (debtRatio > 30) {
        alerts.push({
          type: "danger",
          message: `Qarzdorlar nisbati ${debtRatio}% — yuqori xavf`,
          metric: "debt",
          value: debtRatio,
        });
      }
    }

    const classes = await ClassModel.find({ branch: branch._id, school: school._id }).lean();
    for (const cls of classes) {
      const clsStudents = await Student.find({ class: cls._id, school: school._id }).select("_id").lean();
      if (clsStudents.length >= 20) {
        alerts.push({
          type: "warning",
          message: `"${cls.name}" guruhida ${clsStudents.length} ta o'quvchi — sig'im chegarasiga yaqin`,
          metric: "capacity",
          value: clsStudents.length,
        });
      }
    }

    if (alerts.length === 0) {
      alerts.push({
        type: "success",
        message: "Barcha ko'rsatkichlar me'yorida. Filial barqaror.",
        metric: "ok",
        value: 100,
      });
    }

    return res.json({ alerts });
  } catch (err) {
    return res.status(err.statusCode || 400).json({ message: err.message || "Failed to load alerts" });
  }
};

module.exports = {
  getOverview,
  getFinance,
  getStudents,
  getTeachers,
  getPremiumInsights,
  getPremiumForecast,
  getPremiumAlerts,
};
