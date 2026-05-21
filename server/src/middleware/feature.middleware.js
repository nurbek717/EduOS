const Plan = require("../modules/plans/plan.model");
const SaasSubscription = require("../modules/subscriptions/subscription.model");

const requireFeature = (featureKey) => async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const subscription = await SaasSubscription.findOne({ tenantId, status: "active" }).lean();
    if (!subscription) {
      return res.status(402).json({ message: "Active subscription required" });
    }

    const plan = await Plan.findById(subscription.planId).lean();
    if (!plan || !plan.features || plan.features[featureKey] !== true) {
      return res.status(403).json({ message: "Feature not enabled for this plan" });
    }

    return next();
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  requireFeature,
};
