const express = require("express");
const {
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
  listAttendanceStatsForTeacher,
} = require("../controllers/teacher.controller");
const {
  listTeacherThreads,
  listTeacherThreadMessages,
  sendTeacherThreadMessage,
} = require("../controllers/parentTeacherChat.controller");
const { authRequired, requireRoles } = require("../middleware/auth.middleware");
const { uploadHomeworkAttachment } = require("../middleware/upload.middleware");
const validators = require("../validation/request.validation");

const router = express.Router();

router.use(authRequired, requireRoles("teacher"));

router.get("/classes", listClassesForTeacher);
router.get("/students", validators.teacherStudentsQuery, listStudents);
router.post("/students", validators.teacherCreateStudent, createStudentForTeacher);
router.patch("/students/:id", validators.teacherUpdateStudent, updateStudentForTeacher);
router.delete("/students/:id", validators.idParam, deleteStudentForTeacher);

router.post("/grades", validators.teacherCreateGrade, createGrade);
router.get("/grades", validators.teacherGradesQuery, listGradesForClass);
router.patch("/grades/:id", validators.teacherUpdateGrade, updateGradeForTeacher);
router.delete("/grades/:id", validators.idParam, deleteGradeForTeacher);

router.post("/attendance", validators.teacherAttendance, setAttendanceForClass);
router.post("/attendance/face", validators.faceAttendance, setAttendanceByFace);
router.get("/attendance/stats", validators.teacherAttendanceStatsQuery, listAttendanceStatsForTeacher);

router.get("/homework", validators.teacherHomeworkQuery, listHomeworkForTeacher);
router.post("/homework", uploadHomeworkAttachment, validators.teacherHomework, createHomework);
router.patch("/homework/:id", uploadHomeworkAttachment, validators.teacherUpdateHomework, updateHomeworkForTeacher);
router.delete("/homework/:id", validators.idParam, deleteHomeworkForTeacher);
router.patch(
  "/homework/submissions/:id/grade",
  validators.teacherGradeHomeworkSubmission,
  gradeHomeworkSubmissionForTeacher,
);

router.get("/timetable", validators.teacherTimetableQuery, listTimetableForTeacher);

router.get("/chat/threads", listTeacherThreads);
router.get("/chat/threads/:threadId/messages", listTeacherThreadMessages);
router.post("/chat/threads/:threadId/messages", sendTeacherThreadMessage);

module.exports = router;

