const Subscription = require("../models/Subscription");
const Plan = require("../modules/plans/plan.model");
const ClassModel = require("../models/Class");
const Student = require("../models/Student");

const DEFAULT_FEATURES = {
  analytics: true,
  ai: true,
  payment: true,
  attendanceReports: true,
  finance: true,
};

const DEFAULT_LIMITS = {
  maxStudents: -1,
  maxBranches: -1,
  planName: "Bepul",
};

const normalizeFeatures = (features) => ({
  analytics: Boolean(features?.analytics),
  ai: Boolean(features?.ai),
  payment: Boolean(features?.payment),
  attendanceReports: features?.attendanceReports !== false,
  finance: Boolean(features?.finance),
});

const resolveSchoolPlan = async (schoolId) => {
  if (!schoolId) {
    return {
      plan: null,
      subscription: null,
      planName: DEFAULT_LIMITS.planName,
      features: { ...DEFAULT_FEATURES },
      maxStudents: DEFAULT_LIMITS.maxStudents,
      maxBranches: DEFAULT_LIMITS.maxBranches,
      isExpired: false,
      daysLeft: null,
      endAt: null,
      startAt: null,
    };
  }

  const subscriptionDoc = await Subscription.findOne({ school: schoolId }).lean().exec();
  const now = new Date();

  if (!subscriptionDoc) {
    return {
      plan: null,
      subscription: null,
      planName: DEFAULT_LIMITS.planName,
      features: { ...DEFAULT_FEATURES },
      maxStudents: DEFAULT_LIMITS.maxStudents,
      maxBranches: DEFAULT_LIMITS.maxBranches,
      isExpired: false,
      daysLeft: null,
      endAt: null,
      startAt: null,
    };
  }

  let plan = null;
  if (subscriptionDoc.plan) {
    plan = await Plan.findById(subscriptionDoc.plan).lean().exec();
  }
  if (!plan && subscriptionDoc.planName) {
    plan = await Plan.findOne({ name: subscriptionDoc.planName }).lean().exec();
  }

  const planName = (subscriptionDoc.planName || plan?.name || DEFAULT_LIMITS.planName).trim();
  const features = normalizeFeatures(plan?.features || DEFAULT_FEATURES);
  const maxStudents = plan?.maxStudents ?? DEFAULT_LIMITS.maxStudents;
  const maxBranches = plan?.maxBranches ?? DEFAULT_LIMITS.maxBranches;
  const endAt = subscriptionDoc.endAt || null;
  const isExpired = endAt ? new Date(endAt).getTime() < now.getTime() : false;
  const daysLeft = endAt
    ? Math.ceil((new Date(endAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return {
    plan,
    subscription: subscriptionDoc,
    planName,
    features,
    maxStudents,
    maxBranches,
    isExpired,
    daysLeft,
    endAt,
    startAt: subscriptionDoc.created_at || null,
  };
};

const mapSubscriptionStatusPayload = async (schoolId) => {
  const resolved = await resolveSchoolPlan(schoolId);
  if (!resolved.subscription) {
    return null;
  }

  return {
    startAt: resolved.startAt,
    endAt: resolved.endAt,
    daysLeft: resolved.daysLeft,
    isExpired: resolved.isExpired,
    planName: resolved.planName,
    features: resolved.features,
    limits: {
      maxStudents: resolved.maxStudents,
      maxBranches: resolved.maxBranches,
    },
  };
};

const assertCanAddStudents = async (schoolId, additionalCount = 1) => {
  const plan = await resolveSchoolPlan(schoolId);
  if (plan.maxStudents === -1) {
    return plan;
  }

  const current = await Student.countDocuments({ school: schoolId }).exec();
  if (current + additionalCount > plan.maxStudents) {
    const error = new Error(
      `O'quvchi limiti tugadi. "${plan.planName}" tarifida maksimal ${plan.maxStudents} ta o'quvchi.`,
    );
    error.code = "STUDENT_LIMIT";
    error.statusCode = 403;
    error.meta = { current, max: plan.maxStudents, planName: plan.planName };
    throw error;
  }

  return plan;
};

const assertCanAddClass = async (schoolId) => {
  const plan = await resolveSchoolPlan(schoolId);
  if (plan.maxBranches === -1) {
    return plan;
  }

  const current = await ClassModel.countDocuments({ school: schoolId }).exec();
  if (current >= plan.maxBranches) {
    const error = new Error(
      `Sinf limiti tugadi. "${plan.planName}" tarifida maksimal ${plan.maxBranches} ta sinf.`,
    );
    error.code = "CLASS_LIMIT";
    error.statusCode = 403;
    error.meta = { current, max: plan.maxBranches, planName: plan.planName };
    throw error;
  }

  return plan;
};

const featureDeniedMessage = (featureKey, planName) => {
  const labels = {
    finance: "Moliya bo'limi",
    analytics: "Kengaytirilgan tahlil",
    payment: "O'quvchi to'lovlari",
    attendanceReports: "Davomat hisobotlari",
    ai: "AI funksiyalar",
  };
  const label = labels[featureKey] || featureKey;
  return `${label} "${planName}" tarifida yo'q. Pro yoki Enterprise tarifiga o'ting.`;
};

module.exports = {
  DEFAULT_FEATURES,
  normalizeFeatures,
  resolveSchoolPlan,
  mapSubscriptionStatusPayload,
  assertCanAddStudents,
  assertCanAddClass,
  featureDeniedMessage,
};
