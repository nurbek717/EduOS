const express = require("express");
const {
  childGrades,
  childAttendance,
  childHomework,
  childExamResults,
  myChildren,
} = require("../controllers/parent.controller");
const {
  listParentChatTargets,
  listParentThreads,
  createOrGetParentThread,
  listParentThreadMessages,
  sendParentThreadMessage,
} = require("../controllers/parentTeacherChat.controller");
const { authRequired, requireRoles } = require("../middleware/auth.middleware");

const router = express.Router();

router.use(authRequired, requireRoles("parent"));

router.get("/children", myChildren);
router.get("/grades", childGrades);
router.get("/attendance", childAttendance);
router.get("/homework", childHomework);
router.get("/exams", childExamResults);

router.get("/chat/targets", listParentChatTargets);
router.get("/chat/threads", listParentThreads);
router.post("/chat/threads", createOrGetParentThread);
router.get("/chat/threads/:threadId/messages", listParentThreadMessages);
router.post("/chat/threads/:threadId/messages", sendParentThreadMessage);

module.exports = router;

