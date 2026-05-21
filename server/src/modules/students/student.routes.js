const express = require("express");
const { list, create, update, remove } = require("./student.controller");
const { tenantAuthRequired } = require("../../middleware/tenant-auth.middleware");
const { requireRoles } = require("../../guards/rbac.guard");
const { TENANT_ADMIN_ROLES, STAFF_ROLES } = require("../../config/saas-roles");
const { enforceActiveSubscription, enforceStudentLimit } = require("../../middleware/limits.middleware");

const router = express.Router();

router.get("/", tenantAuthRequired, requireRoles(...STAFF_ROLES), list);
router.post("/", tenantAuthRequired, requireRoles(...TENANT_ADMIN_ROLES), enforceActiveSubscription, enforceStudentLimit, create);
router.patch("/:id", tenantAuthRequired, requireRoles(...TENANT_ADMIN_ROLES), enforceActiveSubscription, update);
router.delete("/:id", tenantAuthRequired, requireRoles(...TENANT_ADMIN_ROLES), enforceActiveSubscription, remove);

module.exports = router;
