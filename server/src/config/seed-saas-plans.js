require("dotenv").config();

const connectDb = require("./db");
const Plan = require("../modules/plans/plan.model");

const DEFAULT_PLANS = [
  {
    name: "Standard",
    maxStudents: 500,
    maxBranches: 1,
    features: {
      analytics: false,
      ai: false,
      payment: false,
      attendanceReports: false,
      finance: false,
    },
    price: 0,
  },
  {
    name: "Pro",
    maxStudents: 1000,
    maxBranches: 10,
    features: {
      analytics: true,
      ai: false,
      payment: true,
      attendanceReports: true,
      finance: true,
    },
    price: 0,
  },
  {
    name: "Enterprise",
    maxStudents: -1,
    maxBranches: -1,
    features: {
      analytics: true,
      ai: true,
      payment: true,
      attendanceReports: true,
      finance: true,
    },
    price: 0,
  },
];

const seedPlans = async () => {
  await connectDb();

  for (const plan of DEFAULT_PLANS) {
    await Plan.findOneAndUpdate(
      { name: plan.name },
      { $set: plan },
      { upsert: true, new: true },
    );
  }

  // eslint-disable-next-line no-console
  console.log("SaaS plans seeded");
  process.exit(0);
};

seedPlans().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Failed to seed SaaS plans", err);
  process.exit(1);
});
