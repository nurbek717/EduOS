const express = require("express");
const { overview } = require("./analytics.controller");
const { tenantAuthRequired } = require("../../middleware/tenant-auth.middleware");
const { requireRoles } = require("../../guards/rbac.guard");
const { STAFF_ROLES } = require("../../config/saas-roles");
const { requireFeature } = require("../../middleware/feature.middleware");

const router = express.Router();

router.get("/overview", tenantAuthRequired, requireRoles(...STAFF_ROLES), requireFeature("analytics"), overview);

module.exports = router;
