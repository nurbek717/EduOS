const SaasSubscription = require("./subscription.model");
const Plan = require("../plans/plan.model");

const getCurrentSubscription = async (tenantId) => SaasSubscription.findOne({ tenantId }).lean();

const createCheckout = async (tenantId, planId) => {
  const plan = await Plan.findById(planId).lean();
  if (!plan) {
    throw new Error("Plan not found");
  }

  return {
    status: "pending",
    planId: plan._id,
    amount: plan.price,
  };
};

const activateSubscription = async ({ tenantId, planId, startsAt, expiresAt }) => {
  return SaasSubscription.findOneAndUpdate(
    { tenantId },
    { tenantId, planId, startsAt, expiresAt, status: "active" },
    { upsert: true, new: true },
  );
};

module.exports = {
  getCurrentSubscription,
  createCheckout,
  activateSubscription,
};
