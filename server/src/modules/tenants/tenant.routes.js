const express = require("express");
const { create, getById, list, remove } = require("./tenant.controller");
const { tenantAuthRequired } = require("../../middleware/tenant-auth.middleware");
const { requireRoles } = require("../../guards/rbac.guard");

const router = express.Router();

router.post("/", tenantAuthRequired, requireRoles("super_admin"), create);
router.get("/", tenantAuthRequired, requireRoles("super_admin"), list);
router.get("/:id", tenantAuthRequired, requireRoles("super_admin"), getById);
router.delete("/:id", tenantAuthRequired, requireRoles("super_admin"), remove);

module.exports = router;
