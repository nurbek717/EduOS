const express = require("express");
const { myGrades, myAttendance, myHomework, submitHomework, myTimetable, getProfile, updateProfile } = require("../controllers/student.controller");
const { authRequired, requireRoles } = require("../middleware/auth.middleware");
const { uploadSubmissionAttachment } = require("../middleware/upload.middleware");
const validators = require("../validation/request.validation");

const router = express.Router();

router.use(authRequired, requireRoles("student"));

router.get("/grades", myGrades);
router.get("/attendance", myAttendance);
router.get("/homework", myHomework);
router.post("/homework/:id/submit", uploadSubmissionAttachment, validators.studentSubmitHomework, submitHomework);
router.get("/timetable", myTimetable);
router.get("/profile", getProfile);
router.patch("/profile", validators.studentProfileUpdate, updateProfile);

module.exports = router;

