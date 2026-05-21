const Plan = require("./plan.model");
const Tenant = require("../tenants/tenant.model");
const SaasSubscription = require("../subscriptions/subscription.model");

const listPlans = async () => Plan.find().lean();

const createPlan = async (payload) => Plan.create(payload);

const getPlanById = async (id) => Plan.findById(id).lean();

const deletePlanById = async (id) => {
  const tenantCount = await Tenant.countDocuments({ planId: id });
  const subscriptionCount = await SaasSubscription.countDocuments({ planId: id });

  if (tenantCount > 0 || subscriptionCount > 0) {
    const error = new Error("Plan is in use and cannot be deleted");
    error.statusCode = 409;
    throw error;
  }

  return Plan.findByIdAndDelete(id).lean();
};

module.exports = {
  listPlans,
  createPlan,
  getPlanById,
  deletePlanById,
};
