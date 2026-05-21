const Plan = require("../modules/plans/plan.model");
const SaasSubscription = require("../modules/subscriptions/subscription.model");
const Branch = require("../modules/branches/branch.model");
const Student = require("../modules/students/student.model");

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const enforceActiveSubscription = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId || !WRITE_METHODS.has(req.method)) {
      return next();
    }

    const subscription = await SaasSubscription.findOne({ tenantId }).lean();
    if (!subscription) {
      return res.status(402).json({ message: "Subscription required", subscriptionMissing: true });
    }

    const now = new Date();
    const expiresAt = subscription.expiresAt ? new Date(subscription.expiresAt) : null;

    if (subscription.status === "expired" || (expiresAt && expiresAt.getTime() < now.getTime())) {
      return res.status(402).json({
        message: "Subscription expired. Read-only mode.",
        subscriptionExpired: true,
        expiresAt: subscription.expiresAt || null,
      });
    }

    return next();
  } catch (err) {
    return next(err);
  }
};

const resolvePlan = async (tenantId) => {
  const subscription = await SaasSubscription.findOne({ tenantId, status: "active" }).lean();
  if (!subscription) return null;
  return Plan.findById(subscription.planId).lean();
};

const enforceBranchLimit = async (req, res, next) => {
  try {
    if (req.method !== "POST") return next();
    const tenantId = req.tenantId;
    const plan = await resolvePlan(tenantId);
    if (!plan) {
      return res.status(402).json({ message: "Active subscription required" });
    }

    if (plan.maxBranches !== -1) {
      const count = await Branch.countDocuments({ tenantId });
      if (count >= plan.maxBranches) {
        return res.status(403).json({ message: "Branch limit reached" });
      }
    }

    return next();
  } catch (err) {
    return next(err);
  }
};

const enforceStudentLimit = async (req, res, next) => {
  try {
    if (req.method !== "POST") return next();
    const tenantId = req.tenantId;
    const plan = await resolvePlan(tenantId);
    if (!plan) {
      return res.status(402).json({ message: "Active subscription required" });
    }

    if (plan.maxStudents !== -1) {
      const count = await Student.countDocuments({ tenantId });
      if (count >= plan.maxStudents) {
        return res.status(403).json({ message: "Student limit reached" });
      }
    }

    return next();
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  enforceActiveSubscription,
  enforceBranchLimit,
  enforceStudentLimit,
};
