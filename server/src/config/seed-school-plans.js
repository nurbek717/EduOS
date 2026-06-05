const Plan = require("../modules/plans/plan.model");

/** Super admin obuna formasida ko'rinadigan rejalar (tartib muhim). */
const ADMIN_SUBSCRIPTION_PLAN_NAMES = ["Bepul", "Standard", "Pro", "Premium"];

const DEFAULT_PLANS = [
  {
    name: "Bepul",
    maxStudents: 200,
    maxBranches: 1,
    price: 0,
    features: {
      analytics: false,
      ai: false,
      payment: false,
      attendanceReports: true,
      finance: false,
    },
  },
  {
    name: "Standard",
    maxStudents: 500,
    maxBranches: 3,
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
    maxStudents: 2000,
    maxBranches: 10,
    price: 3_500_000,
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
    price: 7_000_000,
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
