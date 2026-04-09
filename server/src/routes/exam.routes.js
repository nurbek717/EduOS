const express = require("express");
const { authRequired, requireRoles } = require("../middleware/auth.middleware");
const validators = require("../validation/request.validation");
const {
  createExam,
  addQuestion,
  listExamQuestions,
  publishExam,
  deleteExam,
  listManagedExams,
  listStudentExams,
  listActiveExamsForStudent,
  startExamAttempt,
  getMyAttempt,
  submitExamAttempt,
  gradeTextAnswer,
  listAttemptAnswersForReview,
  listExamResults,
  getServerTime,
} = require("../controllers/exam.controller");

const router = express.Router();

router.use(authRequired);

router.get("/server-time", getServerTime);

router.get(
  "/manage",
  requireRoles("teacher", "school_admin", "director", "super_admin"),
  validators.examManageQuery,
  listManagedExams,
);
router.post(
  "/",
  requireRoles("school_admin", "super_admin"),
  validators.createExam,
  createExam,
);
router.post(
  "/:examId/questions",
  requireRoles("teacher"),
  validators.addExamQuestion,
  addQuestion,
);
router.get(
  "/:examId/questions",
  requireRoles("teacher"),
  validators.examIdParam,
  listExamQuestions,
);
router.patch(
  "/:examId/publish",
  requireRoles("school_admin", "super_admin"),
  validators.publishExam,
  publishExam,
);
router.delete(
  "/:examId",
  requireRoles("school_admin", "super_admin"),
  validators.examIdParam,
  deleteExam,
);
router.get(
  "/:examId/results",
  requireRoles("teacher", "school_admin", "director", "super_admin"),
  validators.examIdParam,
  listExamResults,
);
router.get(
  "/:examId/attempts/:attemptId/answers",
  requireRoles("teacher", "school_admin", "super_admin"),
  validators.examAttemptReviewParams,
  listAttemptAnswersForReview,
);
router.patch(
  "/answers/:answerId/manual-grade",
  requireRoles("teacher"),
  validators.gradeExamAnswer,
  gradeTextAnswer,
);

router.get(
  "/student",
  requireRoles("student"),
  listStudentExams,
);
router.get(
  "/active",
  requireRoles("student"),
  listActiveExamsForStudent,
);
router.post(
  "/:examId/start",
  requireRoles("student"),
  validators.examIdParam,
  startExamAttempt,
);
router.get(
  "/attempts/:attemptId",
  requireRoles("student"),
  validators.examAttemptIdParam,
  getMyAttempt,
);
router.post(
  "/attempts/:attemptId/submit",
  requireRoles("student"),
  validators.submitExamAttempt,
  submitExamAttempt,
);

module.exports = router;
