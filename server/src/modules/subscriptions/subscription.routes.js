const express = require("express");
const { current, checkout, paymeWebhook, clickWebhook } = require("./subscription.controller");
const { tenantAuthRequired } = require("../../middleware/tenant-auth.middleware");

const router = express.Router();

router.get("/current", tenantAuthRequired, current);
router.post("/checkout", tenantAuthRequired, checkout);
router.post("/webhook/payme", paymeWebhook);
router.post("/webhook/click", clickWebhook);

module.exports = router;
