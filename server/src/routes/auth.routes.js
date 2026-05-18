const express = require("express");
const { login, refresh, me, updateProfile } = require("../controllers/auth.controller");
const { authRequired } = require("../middleware/auth.middleware");
const { authLoginLimiter } = require("../middleware/rate-limit.middleware");
const validators = require("../validation/request.validation");

const router = express.Router();

router.post("/login", authLoginLimiter, validators.login, login);
router.post("/refresh", refresh);
router.get("/me", authRequired, me);
router.patch("/profile", authRequired, validators.authProfileUpdate, updateProfile);

module.exports = router;

