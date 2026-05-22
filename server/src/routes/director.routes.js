const express = require("express");
const {
  createSchoolAdminForDirector,
  listUsersForDirector,
  getUserForDirector,
  updateUserForDirector,
  deleteUserForDirector,
  getOverview,
  createClass,
  listClasses,
  listBranches,
  createBranch,
  updateBranch,
  deleteBranch,
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
  getSubscriptionStatus,
  listAttendanceStatsForDirector,
} = require("../controllers/director.controller");
const {
  getFinanceOverview,
  createFinanceTransaction,
  recordStudentPayment,
  updateStudentMonthlyFee,
  recordSalaryPayment,
  updateStaffMonthlySalary,
  deleteFinanceTransaction,
} = require("../controllers/directorFinance.controller");
const { authRequired, requireRoles } = require("../middleware/auth.middleware");
const checkSubscription = require("../middleware/subscription.middleware");
const { attachSchoolPlan, requirePlanFeature } = require("../middleware/school-plan.middleware");
const { uploadStudentImport } = require("../middleware/upload.middleware");
const validators = require("../validation/request.validation");

const router = express.Router();

router.get(
  "/subscription/status",
  authRequired,
  requireRoles("director", "school_admin", "teacher", "student", "parent"),
  attachSchoolPlan,
  getSubscriptionStatus,
);

router.use(authRequired, requireRoles("director", "school_admin"), checkSubscription, attachSchoolPlan);

router.get("/overview", getOverview);
router.post("/school-admin", requireRoles("director"), validators.directorCreateSchoolAdmin, createSchoolAdminForDirector);
router.get("/users", validators.directorUsersQuery, listUsersForDirector);
router.get("/users/:id", validators.idParam, getUserForDirector);
router.patch("/users/:id", requireRoles("school_admin"), validators.directorManageUser, updateUserForDirector);
router.delete("/users/:id", requireRoles("school_admin"), validators.idParam, deleteUserForDirector);

router.post("/classes", requireRoles("school_admin"), validators.directorCreateClass, createClass);
router.get("/classes", listClasses);
router.get("/branches", requireRoles("director"), listBranches);
router.post("/branches", requireRoles("director"), validators.directorCreateBranch, createBranch);
router.patch("/branches/:id", requireRoles("director"), validators.directorUpdateBranch, updateBranch);
router.delete("/branches/:id", requireRoles("director"), validators.idParam, deleteBranch);
router.get(
  "/classes/insights",
  validators.directorClassInsightsQuery,
  requirePlanFeature("analytics"),
  getClassInsights,
);
router.patch("/classes/:id", requireRoles("school_admin"), validators.directorUpdateClass, updateClass);

router.post("/subjects", requireRoles("school_admin"), validators.directorCreateSubject, createSubject);
router.get("/subjects", listSubjects);

router.post("/teachers", requireRoles("school_admin"), validators.directorCreateTeacher, createTeacher);
router.get("/teachers", listTeachers);
router.patch("/teachers/:id", requireRoles("school_admin"), validators.directorUpdateTeacher, updateTeacher);
router.delete("/teachers/:id", requireRoles("school_admin"), validators.idParam, deleteTeacher);
router.post("/students", requireRoles("school_admin"), validators.directorCreateStudent, createStudent);
router.post("/students/import", requireRoles("school_admin"), uploadStudentImport, importStudents);
router.get("/students", listStudentsForDirector);
router.patch("/students/:id", requireRoles("school_admin"), validators.directorUpdateStudent, updateStudentForDirector);
router.post("/parents", requireRoles("school_admin"), validators.directorCreateParent, createParent);
router.post("/attendance/face", validators.faceAttendance, setAttendanceByFace);
router.get(
  "/attendance/stats",
  validators.teacherAttendanceStatsQuery,
  requirePlanFeature("attendanceReports"),
  listAttendanceStatsForDirector,
);

router.post("/timetable", requireRoles("school_admin"), validators.directorCreateTimetable, createTimetableEntry);
router.get("/timetable", validators.directorTimetableQuery, listTimetableForClass);
router.patch(
  "/timetable/:id",
  requireRoles("school_admin"),
  validators.idParam,
  validators.directorCreateTimetable,
  updateTimetableEntry,
);
router.delete("/timetable/:id", requireRoles("school_admin"), validators.idParam, deleteTimetableEntry);

router.get(
  "/finance/overview",
  requireRoles("director", "school_admin"),
  validators.directorFinanceOverviewQuery,
  requirePlanFeature("finance"),
  getFinanceOverview,
);
router.post(
  "/finance/transactions",
  requireRoles("school_admin"),
  validators.directorCreateFinanceTransaction,
  requirePlanFeature("finance"),
  createFinanceTransaction,
);
router.delete(
  "/finance/transactions/:id",
  requireRoles("school_admin"),
  validators.idParam,
  requirePlanFeature("finance"),
  deleteFinanceTransaction,
);
router.post(
  "/finance/student-payments",
  requireRoles("school_admin"),
  validators.directorRecordStudentPayment,
  requirePlanFeature("finance"),
  requirePlanFeature("payment"),
  recordStudentPayment,
);
router.patch(
  "/finance/students/:id/monthly-fee",
  requireRoles("school_admin"),
  validators.directorUpdateStudentMonthlyFee,
  requirePlanFeature("finance"),
  requirePlanFeature("payment"),
  updateStudentMonthlyFee,
);
router.post(
  "/finance/salary-payments",
  requireRoles("school_admin"),
  validators.directorRecordSalaryPayment,
  requirePlanFeature("finance"),
  recordSalaryPayment,
);
router.patch(
  "/finance/staff/:id/monthly-salary",
  requireRoles("school_admin"),
  validators.directorUpdateStaffMonthlySalary,
  requirePlanFeature("finance"),
  updateStaffMonthlySalary,
);

module.exports = router;

