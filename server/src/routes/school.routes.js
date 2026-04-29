const express = require("express");
const { createSchool, listSchools, assignDirector, deleteSchool } = require("../controllers/school.controller");
const { authRequired, requireRoles } = require("../middleware/auth.middleware");
const validators = require("../validation/request.validation");

const router = express.Router();

// Super admin only
router.post("/", authRequired, requireRoles("super_admin"), validators.createSchool, createSchool);
router.get("/", authRequired, requireRoles("super_admin"), listSchools);
router.patch("/:id/director", authRequired, requireRoles("super_admin"), validators.idParam, assignDirector);
router.delete("/:id", authRequired, requireRoles("super_admin"), validators.idParam, deleteSchool);

module.exports = router;

