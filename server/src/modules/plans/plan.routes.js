const express = require("express");
const { list, create, remove } = require("./plan.controller");
const { tenantAuthRequired } = require("../../middleware/tenant-auth.middleware");
const { requireRoles } = require("../../guards/rbac.guard");

const router = express.Router();

router.get("/", list);
router.post("/", tenantAuthRequired, requireRoles("super_admin"), create);
router.delete("/:id", tenantAuthRequired, requireRoles("super_admin"), remove);

module.exports = router;
