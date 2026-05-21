const express = require("express");
const {
  listUsers,
  getStats,
  getUser,
  updateUser,
  deleteUser,
  listPlansForAdmin,
  createOrExtendSubscription,
  setSubscriptionEndAt,
  listSubscriptions,
  deleteSubscription,
} = require("../controllers/admin.controller");
const { authRequired, requireRoles } = require("../middleware/auth.middleware");
const validators = require("../validation/request.validation");

const router = express.Router();

router.use(authRequired, requireRoles("super_admin"));

router.get("/stats", validators.adminStatsQuery, getStats);
router.get("/users", validators.adminUsersQuery, listUsers);
router.get("/users/:id", validators.idParam, getUser);
router.patch("/users/:id", validators.adminUpdateUser, updateUser);
router.delete("/users/:id", validators.idParam, deleteUser);

router.get("/plans", listPlansForAdmin);
router.post("/subscriptions", validators.adminCreateSubscription, createOrExtendSubscription);
router.patch("/subscriptions/:id", validators.adminSetSubscriptionEndAt, setSubscriptionEndAt);
router.delete("/subscriptions/:id", validators.idParam, deleteSubscription);
router.get("/subscriptions", listSubscriptions);

module.exports = router;

