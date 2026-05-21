const express = require("express");
const { login, me } = require("./auth.controller");
const { tenantAuthRequired } = require("../../middleware/tenant-auth.middleware");

const router = express.Router();

router.post("/login", login);
router.get("/me", tenantAuthRequired, me);

module.exports = router;
