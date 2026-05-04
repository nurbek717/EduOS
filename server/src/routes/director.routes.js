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
const { uploadStudentImport } = require("../middleware/upload.middleware");
const validators = require("../validation/request.validation");

const router = express.Router();

router.get("/subscription/status", authRequired, requireRoles("director", "school_admin", "teacher"), getSubscriptionStatus);

router.use(authRequired, requireRoles("director", "school_admin"), checkSubscription);

router.get("/overview", getOverview);
router.post("/school-admin", requireRoles("director"), validators.directorCreateSchoolAdmin, createSchoolAdminForDirector);
router.get("/users", validators.directorUsersQuery, listUsersForDirector);
router.get("/users/:id", validators.idParam, getUserForDirector);
router.patch("/users/:id", requireRoles("school_admin"), validators.directorManageUser, updateUserForDirector);
router.delete("/users/:id", requireRoles("school_admin"), validators.idParam, deleteUserForDirector);

router.post("/classes", requireRoles("school_admin"), validators.directorCreateClass, createClass);
router.get("/classes", listClasses);
router.get("/classes/insights", validators.directorClassInsightsQuery, getClassInsights);
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

router.get("/finance/overview", requireRoles("director", "school_admin"), getFinanceOverview);
router.post("/finance/transactions", requireRoles("school_admin"), validators.directorCreateFinanceTransaction, createFinanceTransaction);
router.delete("/finance/transactions/:id", requireRoles("school_admin"), validators.idParam, deleteFinanceTransaction);
router.post("/finance/student-payments", requireRoles("school_admin"), validators.directorRecordStudentPayment, recordStudentPayment);
router.patch("/finance/students/:id/monthly-fee", requireRoles("school_admin"), validators.directorUpdateStudentMonthlyFee, updateStudentMonthlyFee);
router.post("/finance/salary-payments", requireRoles("school_admin"), validators.directorRecordSalaryPayment, recordSalaryPayment);
router.patch("/finance/staff/:id/monthly-salary", requireRoles("school_admin"), validators.directorUpdateStaffMonthlySalary, updateStaffMonthlySalary);

module.exports = router;

