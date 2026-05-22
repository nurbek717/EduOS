const Plan = require("../modules/plans/plan.model");

/** Super admin obuna formasida ko'rinadigan rejalar (tartib muhim). */
const ADMIN_SUBSCRIPTION_PLAN_NAMES = ["Bepul", "Standard", "Pro", "Premium"];

const DEFAULT_PLANS = [
  {
    name: "Bepul",
    maxStudents: -1,
    maxBranches: -1,
    price: 0,
    features: {
      analytics: true,
      ai: true,
      payment: true,
      attendanceReports: true,
      finance: true,
    },
  },
  {
    name: "Standard",
    maxStudents: 500,
    maxBranches: 1,
    price: 1_500_000,
    features: {
      analytics: false,
      ai: false,
      payment: true,
      attendanceReports: true,
      finance: true,
    },
  },
  {
    name: "Pro",
    maxStudents: 1000,
    maxBranches: 5,
    price: 3_000_000,
    features: {
      analytics: true,
      ai: false,
      payment: true,
      attendanceReports: true,
      finance: true,
    },
  },
  {
    name: "Premium",
    maxStudents: -1,
    maxBranches: -1,
    price: 6_000_000,
    features: {
      analytics: true,
      ai: true,
      payment: true,
      attendanceReports: true,
      finance: true,
    },
  },
];

const seedSchoolPlans = async () => {
  for (const plan of DEFAULT_PLANS) {
    await Plan.findOneAndUpdate({ name: plan.name }, { $set: plan }, { upsert: true, new: true });
  }
  // eslint-disable-next-line no-console
  console.log("School subscription plans seeded (Bepul, Standard, Pro, Premium)");
};

module.exports = { seedSchoolPlans, DEFAULT_PLANS, ADMIN_SUBSCRIPTION_PLAN_NAMES };
