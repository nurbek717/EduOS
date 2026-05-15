const School = require("../models/School");
const User = require("../models/User");
const Student = require("../models/Student");
const Teacher = require("../models/Teacher");
const FinanceTransaction = require("../models/FinanceTransaction");

const INCOME_CATEGORIES = ["student_fee", "donation", "grant", "other_income"];
const EXPENSE_CATEGORIES = ["salary", "utilities", "maintenance", "supplies", "tax", "bonus", "other_expense"];
/** Manual kirim/chiqim formasi — o'quvchi to'lovi va maosh alohida formalar orqali kiritiladi */
const MANUAL_INCOME_CATEGORIES = ["donation", "grant", "other_income"];
const MANUAL_EXPENSE_CATEGORIES = ["utilities", "maintenance", "supplies", "tax", "bonus", "other_expense"];
const STAFF_ROLES = ["director", "school_admin", "teacher"];

const MONTH_LABELS = ["Yan", "Fev", "Mar", "Apr", "May", "Iyun", "Iyul", "Avg", "Sen", "Okt", "Noy", "Dek"];

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

const sumAmount = (items) => items.reduce((total, item) => total + (Number(item.amount) || 0), 0);

const BILLING_MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;

const getYearMonthKey = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const resolveBillingMonth = (item) => {
  if (typeof item.billingMonth === "string" && BILLING_MONTH_PATTERN.test(item.billingMonth)) {
    return item.billingMonth;
  }
  return getYearMonthKey(item.occurredAt);
};

const parseBillingMonth = (billingMonth) => {
  const match = billingMonth.match(BILLING_MONTH_PATTERN);
  if (!match) {
    return null;
  }
  return { year: Number(match[1]), monthIndex: Number(match[2]) - 1 };
};

const transactionMatchesBillingYear = (item, year) => {
  const parsed = parseBillingMonth(resolveBillingMonth(item));
  return Boolean(parsed && parsed.year === year);
};

const transactionMatchesBillingMonthKey = (item, monthKey) => {
  return resolveBillingMonth(item) === monthKey;
};

const countMonthsInclusive = (fromDate, toDate) => {
  const start = new Date(fromDate);
  const end = new Date(toDate);
  if (start > end) {
    return 0;
  }

  return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
};

const parseViewYear = (rawYear) => {
  const currentYear = new Date().getFullYear();
  const parsed = Number(rawYear);
  if (!Number.isFinite(parsed)) {
    return currentYear;
  }
  const year = Math.floor(parsed);
  if (year < currentYear - 10 || year > currentYear) {
    return currentYear;
  }
  return year;
};

const buildStudentPaymentGrid = (students, transactions, viewYear, now) => {
  const currentYear = now.getFullYear();
  const currentMonthIndex = now.getMonth();
  const startOfViewYear = new Date(viewYear, 0, 1);

  const paidByStudentMonth = new Map();
  transactions
    .filter((item) => item.category === "student_fee" && item.student)
    .filter((item) => transactionMatchesBillingYear(item, viewYear))
    .forEach((item) => {
      const parsed = parseBillingMonth(resolveBillingMonth(item));
      if (!parsed) {
        return;
      }
      const studentId = String(item.student);
      const key = `${studentId}:${parsed.monthIndex}`;
      paidByStudentMonth.set(key, (paidByStudentMonth.get(key) || 0) + (Number(item.amount) || 0));
    });

  const rows = students.map((student) => {
    const studentId = String(student._id);
    const monthlyFee = Number(student.monthlyFee) || 0;
    const enrolledAt = new Date(student.createdAt);

    const months = MONTH_LABELS.map((label, monthIndex) => {
      const monthEnd = new Date(viewYear, monthIndex + 1, 0, 23, 59, 59, 999);
      const enrolled = enrolledAt <= monthEnd;
      const isFutureMonth =
        viewYear > currentYear || (viewYear === currentYear && monthIndex > currentMonthIndex);
      const paid = enrolled ? paidByStudentMonth.get(`${studentId}:${monthIndex}`) || 0 : 0;
      const due = enrolled && !isFutureMonth ? monthlyFee : 0;

      let status = "na";
      if (!enrolled) {
        status = "na";
      } else if (isFutureMonth) {
        status = "future";
      } else if (due > 0 && paid >= due) {
        status = "paid";
      } else if (paid > 0) {
        status = "partial";
      } else if (due > 0) {
        status = "unpaid";
      }

      return { month: monthIndex + 1, label, paid, due, status };
    });

    const yearTotalPaid = months.reduce((total, month) => total + month.paid, 0);
    const dueStart = enrolledAt > startOfViewYear ? enrolledAt : startOfViewYear;
    const debtEnd =
      viewYear < currentYear ? new Date(viewYear, 11, 31, 23, 59, 59, 999) : now;
    const dueMonthCount = monthlyFee > 0 ? countMonthsInclusive(dueStart, debtEnd) : 0;
    const expectedYear = monthlyFee * dueMonthCount;
    const yearDebt = Math.max(expectedYear - yearTotalPaid, 0);

    return {
      id: student._id,
      name: student.user?.name || "O'quvchi",
      className: student.class?.name || null,
      monthlyFee,
      months,
      yearTotalPaid,
      yearDebt,
    };
  });

  return {
    year: viewYear,
    monthLabels: MONTH_LABELS,
    rows,
  };
};

const buildOverviewPayload = async (school, viewYear) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthIndex = now.getMonth();
  const startOfMonth = new Date(currentYear, currentMonthIndex, 1);
  const startOfYear = new Date(currentYear, 0, 1);
  const startOfFiveYearRange = new Date(currentYear - 4, 0, 1);

  const [students, staffUsers, teacherDocs, transactions, recentTransactions] = await Promise.all([
    Student.find({ school: school._id })
      .populate("user", "name email")
      .populate("class", "name")
      .sort({ createdAt: -1 })
      .exec(),
    User.find({ school: school._id, role: { $in: STAFF_ROLES } })
      .select("name email role monthlySalary")
      .sort({ role: 1, name: 1 })
      .lean()
      .exec(),
    Teacher.find({ school: school._id }).populate("subject", "name").lean().exec(),
    FinanceTransaction.find({
      school: school._id,
      occurredAt: { $gte: startOfFiveYearRange },
    })
      .sort({ occurredAt: -1 })
      .lean()
      .exec(),
    FinanceTransaction.find({ school: school._id })
      .populate({
        path: "student",
        populate: { path: "user", select: "name" },
      })
      .populate("staffUser", "name")
      .sort({ occurredAt: -1, createdAt: -1 })
      .limit(12)
      .lean()
      .exec(),
  ]);

  const teacherSubjectMap = new Map(
    teacherDocs.map((teacherDoc) => [String(teacherDoc.user), teacherDoc.subject?.name || null]),
  );

  const monthTransactions = transactions.filter((item) => new Date(item.occurredAt) >= startOfMonth);
  const yearTransactions = transactions.filter((item) => new Date(item.occurredAt) >= startOfYear);
  const currentMonthKey = getYearMonthKey(now);
  const studentFeeTransactions = transactions.filter((item) => item.category === "student_fee" && item.student);
  const salaryTransactions = transactions.filter((item) => item.category === "salary" && item.staffUser);
  const studentYearTransactions = studentFeeTransactions.filter((item) => transactionMatchesBillingYear(item, currentYear));
  const studentMonthTransactions = studentFeeTransactions.filter((item) =>
    transactionMatchesBillingMonthKey(item, currentMonthKey),
  );
  const salaryYearTransactions = salaryTransactions.filter((item) => transactionMatchesBillingYear(item, currentYear));
  const salaryMonthTransactions = salaryTransactions.filter((item) =>
    transactionMatchesBillingMonthKey(item, currentMonthKey),
  );

  const monthlyChart = MONTH_LABELS.map((label, monthIndex) => {
    const monthItems = yearTransactions.filter((item) => {
      const occurredAt = new Date(item.occurredAt);
      return occurredAt.getMonth() === monthIndex;
    });

    return {
      label,
      income: sumAmount(monthItems.filter((item) => item.type === "income")),
      expense: sumAmount(monthItems.filter((item) => item.type === "expense")),
    };
  });

  const yearlyChart = Array.from({ length: 5 }, (_, idx) => currentYear - 4 + idx).map((year) => {
    const yearItems = transactions.filter((item) => new Date(item.occurredAt).getFullYear() === year);
    return {
      label: String(year),
      income: sumAmount(yearItems.filter((item) => item.type === "income")),
      expense: sumAmount(yearItems.filter((item) => item.type === "expense")),
    };
  });

  const studentPaymentMonthMap = new Map();
  studentMonthTransactions.forEach((item) => {
    const key = String(item.student);
    studentPaymentMonthMap.set(key, (studentPaymentMonthMap.get(key) || 0) + (Number(item.amount) || 0));
  });

  const studentPaymentYearMap = new Map();
  studentYearTransactions.forEach((item) => {
    const key = String(item.student);
    studentPaymentYearMap.set(key, (studentPaymentYearMap.get(key) || 0) + (Number(item.amount) || 0));
  });

  const salaryPaymentMonthMap = new Map();
  salaryMonthTransactions.forEach((item) => {
    const key = String(item.staffUser);
    salaryPaymentMonthMap.set(key, (salaryPaymentMonthMap.get(key) || 0) + (Number(item.amount) || 0));
  });

  const salaryPaymentYearMap = new Map();
  salaryYearTransactions.forEach((item) => {
    const key = String(item.staffUser);
    salaryPaymentYearMap.set(key, (salaryPaymentYearMap.get(key) || 0) + (Number(item.amount) || 0));
  });

  const studentBalances = students.map((student) => {
    const studentId = String(student._id);
    const monthlyFee = Number(student.monthlyFee) || 0;
    const paidThisMonth = studentPaymentMonthMap.get(studentId) || 0;
    const paidThisYear = studentPaymentYearMap.get(studentId) || 0;
    const dueStart = student.createdAt > startOfYear ? student.createdAt : startOfYear;
    const dueMonthCount = monthlyFee > 0 ? countMonthsInclusive(dueStart, now) : 0;
    const expectedThisYear = monthlyFee * dueMonthCount;
    const yearDebt = Math.max(expectedThisYear - paidThisYear, 0);

    return {
      id: student._id,
      userId: student.user?._id || null,
      name: student.user?.name || "O'quvchi",
      email: student.user?.email || "",
      className: student.class?.name || null,
      monthlyFee,
      paidThisMonth,
      paidThisYear,
      yearDebt,
    };
  });

  const staffBalances = staffUsers.map((staffUser) => {
    const userId = String(staffUser._id);
    const monthlySalary = Number(staffUser.monthlySalary) || 0;
    const paidThisMonth = salaryPaymentMonthMap.get(userId) || 0;
    const paidThisYear = salaryPaymentYearMap.get(userId) || 0;

    return {
      userId: staffUser._id,
      name: staffUser.name,
      email: staffUser.email,
      role: staffUser.role,
      subjectName: staffUser.role === "teacher" ? teacherSubjectMap.get(userId) || null : null,
      monthlySalary,
      paidThisMonth,
      paidThisYear,
      remainingThisMonth: Math.max(monthlySalary - paidThisMonth, 0),
    };
  });

  return {
    summary: {
      monthIncome: sumAmount(monthTransactions.filter((item) => item.type === "income")),
      monthExpense: sumAmount(monthTransactions.filter((item) => item.type === "expense")),
      yearIncome: sumAmount(yearTransactions.filter((item) => item.type === "income")),
      yearExpense: sumAmount(yearTransactions.filter((item) => item.type === "expense")),
      studentPaidThisMonth: sumAmount(studentMonthTransactions),
      studentPaidThisYear: sumAmount(studentYearTransactions),
      totalStudentDebt: studentBalances.reduce((total, item) => total + item.yearDebt, 0),
      salaryPaidThisMonth: sumAmount(salaryMonthTransactions),
      salaryPendingThisMonth: staffBalances.reduce((total, item) => total + item.remainingThisMonth, 0),
    },
    charts: {
      monthly: monthlyChart,
      yearly: yearlyChart,
    },
    studentBalances,
    staffBalances,
    recentTransactions: recentTransactions.map((item) => ({
      id: item._id,
      type: item.type,
      category: item.category,
      amount: item.amount,
      description: item.description || null,
      occurredAt: item.occurredAt,
      billingMonth: item.billingMonth || resolveBillingMonth(item),
      studentName: item.student?.user?.name || null,
      staffName: item.staffUser?.name || null,
    })),
    categories: {
      income: MANUAL_INCOME_CATEGORIES,
      expense: MANUAL_EXPENSE_CATEGORIES,
    },
    currentMonthKey: getYearMonthKey(now),
    currentYear,
    studentPaymentGrid: buildStudentPaymentGrid(students, transactions, viewYear, now),
  };
};

const validateManualCategoryForType = (type, category) => {
  if (type === "income" && !MANUAL_INCOME_CATEGORIES.includes(category)) {
    throw new Error(
      "O'quvchi to'lovi faqat «O'quvchi to'lovi qo'shish» orqali kiritiladi. Boshqa kirim turini tanlang.",
    );
  }
  if (type === "expense" && !MANUAL_EXPENSE_CATEGORIES.includes(category)) {
    throw new Error(
      "Xodim maoshi faqat «Maosh to'lovi» orqali kiritiladi. Boshqa chiqim turini tanlang.",
    );
  }
};

const getFinanceOverview = async (req, res) => {
  try {
    const school = await ensureSchoolManagementUser(req.user);
    const viewYear = parseViewYear(req.query.year);
    const payload = await buildOverviewPayload(school, viewYear);
    return res.json(payload);
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to load finance overview" });
  }
};

const createFinanceTransaction = async (req, res) => {
  try {
    const school = await ensureSchoolManagementUser(req.user);
    const { type, category, amount, occurredAt, description } = req.body;
    validateManualCategoryForType(type, category);

    const transaction = await FinanceTransaction.create({
      school: school._id,
      type,
      category,
      amount,
      occurredAt,
      description: description || null,
      createdBy: req.user.id,
    });

    return res.status(201).json({
      id: transaction._id,
      type: transaction.type,
      category: transaction.category,
      amount: transaction.amount,
      occurredAt: transaction.occurredAt,
      description: transaction.description || null,
    });
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to create finance transaction" });
  }
};

const recordStudentPayment = async (req, res) => {
  try {
    const school = await ensureSchoolManagementUser(req.user);
    const { studentId, amount, occurredAt, billingMonth, description } = req.body;

    const student = await Student.findOne({ _id: studentId, school: school._id }).populate("user", "name").exec();
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const transaction = await FinanceTransaction.create({
      school: school._id,
      type: "income",
      category: "student_fee",
      amount,
      occurredAt,
      billingMonth,
      description: description || null,
      student: student._id,
      createdBy: req.user.id,
    });

    return res.status(201).json({
      id: transaction._id,
      studentId: student._id,
      studentName: student.user?.name || "O'quvchi",
      amount: transaction.amount,
      occurredAt: transaction.occurredAt,
      billingMonth: transaction.billingMonth,
    });
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to record student payment" });
  }
};

const updateStudentMonthlyFee = async (req, res) => {
  try {
    const school = await ensureSchoolManagementUser(req.user);
    const { id } = req.params;
    const { monthlyFee } = req.body;

    const student = await Student.findOne({ _id: id, school: school._id }).exec();
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    student.monthlyFee = monthlyFee;
    await student.save();

    return res.json({ id: student._id, monthlyFee: student.monthlyFee });
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to update student monthly fee" });
  }
};

const recordSalaryPayment = async (req, res) => {
  try {
    const school = await ensureSchoolManagementUser(req.user);
    const { staffUserId, amount, occurredAt, billingMonth, description } = req.body;

    const staffUser = await User.findOne({
      _id: staffUserId,
      school: school._id,
      role: { $in: STAFF_ROLES },
    }).exec();

    if (!staffUser) {
      return res.status(404).json({ message: "Staff user not found" });
    }

    const transaction = await FinanceTransaction.create({
      school: school._id,
      type: "expense",
      category: "salary",
      amount,
      occurredAt,
      billingMonth,
      description: description || null,
      staffUser: staffUser._id,
      createdBy: req.user.id,
    });

    return res.status(201).json({
      id: transaction._id,
      staffUserId: staffUser._id,
      staffName: staffUser.name,
      amount: transaction.amount,
      occurredAt: transaction.occurredAt,
      billingMonth: transaction.billingMonth,
    });
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to record salary payment" });
  }
};

const updateStaffMonthlySalary = async (req, res) => {
  try {
    const school = await ensureSchoolManagementUser(req.user);
    const { id } = req.params;
    const { monthlySalary } = req.body;

    const staffUser = await User.findOne({
      _id: id,
      school: school._id,
      role: { $in: STAFF_ROLES },
    }).exec();

    if (!staffUser) {
      return res.status(404).json({ message: "Staff user not found" });
    }

    staffUser.monthlySalary = monthlySalary;
    await staffUser.save();

    return res.json({ id: staffUser._id, monthlySalary: staffUser.monthlySalary });
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to update staff monthly salary" });
  }
};

const deleteFinanceTransaction = async (req, res) => {
  try {
    const school = await ensureSchoolManagementUser(req.user);
    const transaction = await FinanceTransaction.findOne({
      _id: req.params.id,
      school: school._id,
    }).exec();

    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    await FinanceTransaction.deleteOne({ _id: transaction._id });
    return res.json({ success: true });
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to delete finance transaction" });
  }
};

module.exports = {
  getFinanceOverview,
  createFinanceTransaction,
  recordStudentPayment,
  updateStudentMonthlyFee,
  recordSalaryPayment,
  updateStaffMonthlySalary,
  deleteFinanceTransaction,
};
