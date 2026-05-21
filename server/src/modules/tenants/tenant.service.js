const Tenant = require("./tenant.model");
const Plan = require("../plans/plan.model");
const SaasSubscription = require("../subscriptions/subscription.model");
const TenantUser = require("../auth/user.model");
const Branch = require("../branches/branch.model");
const Student = require("../students/student.model");
const Teacher = require("../teachers/teacher.model");

const createTenant = async ({ name, slug, owner, planId }) => {
  const existing = await Tenant.findOne({ slug }).lean();
  if (existing) {
    throw new Error("Tenant slug already exists");
  }

  const plan = await Plan.findById(planId).lean();
  if (!plan) {
    throw new Error("Plan not found");
  }

  const tenant = await Tenant.create({ name, slug, planId, status: "active" });

  const ownerUser = await TenantUser.create({
    tenantId: tenant._id,
    fullname: owner.fullname,
    email: owner.email,
    password: owner.password,
    role: "school_owner",
  });

  tenant.ownerId = ownerUser._id;
  await tenant.save();

  const startsAt = new Date();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  await SaasSubscription.create({
    tenantId: tenant._id,
    planId,
    startsAt,
    expiresAt,
    status: "active",
  });

  return {
    tenant,
    ownerUser,
  };
};

const getTenantById = async (id) => Tenant.findById(id).lean();

const listTenants = async () => Tenant.find().lean();

const deleteTenantById = async (id) => {
  const tenant = await Tenant.findById(id).lean();
  if (!tenant) return null;

  await Promise.all([
    TenantUser.deleteMany({ tenantId: id }),
    Branch.deleteMany({ tenantId: id }),
    Student.deleteMany({ tenantId: id }),
    Teacher.deleteMany({ tenantId: id }),
    SaasSubscription.deleteMany({ tenantId: id }),
  ]);

  await Tenant.findByIdAndDelete(id);
  return tenant;
};

module.exports = {
  createTenant,
  getTenantById,
  listTenants,
  deleteTenantById,
};
