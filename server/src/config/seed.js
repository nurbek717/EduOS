const User = require("../models/User");
const TenantUser = require("../modules/auth/user.model");

const seedSuperAdmin = async () => {
  const email = process.env.SUPER_ADMIN_EMAIL;
  const name = process.env.SUPER_ADMIN_NAME || "Platform Owner";
  const password = process.env.SUPER_ADMIN_PASSWORD;

  if (!email || !password) {
    // eslint-disable-next-line no-console
    console.warn("SUPER_ADMIN_EMAIL or SUPER_ADMIN_PASSWORD is not set. Skipping super admin seeding.");
    return;
  }

  const existing = await User.findOne({ email });
  if (existing) {
    // eslint-disable-next-line no-console
    console.log("Super admin already exists");
    return;
  }

  const user = new User({
    name,
    email,
    password,
    role: "super_admin",
    school: null,
  });

  await user.save();
  // eslint-disable-next-line no-console
  console.log(`Super admin created with email: ${email}`);
};

const seedSaasSuperAdmin = async () => {
  const email = process.env.SAAS_SUPER_ADMIN_EMAIL || process.env.SUPER_ADMIN_EMAIL;
  const name = process.env.SAAS_SUPER_ADMIN_NAME || "SaaS Owner";
  const password = process.env.SAAS_SUPER_ADMIN_PASSWORD || process.env.SUPER_ADMIN_PASSWORD;

  if (!email || !password) {
    // eslint-disable-next-line no-console
    console.warn("SAAS_SUPER_ADMIN_EMAIL or SAAS_SUPER_ADMIN_PASSWORD is not set. Skipping SaaS admin seeding.");
    return;
  }

  const existing = await TenantUser.findOne({ email, role: "super_admin" }).exec();
  if (existing) {
    // eslint-disable-next-line no-console
    console.log("SaaS super admin already exists");
    return;
  }

  const user = new TenantUser({
    fullname: name,
    email,
    password,
    role: "super_admin",
    tenantId: null,
  });

  await user.save();
  // eslint-disable-next-line no-console
  console.log(`SaaS super admin created with email: ${email}`);
};

module.exports = {
  seedSuperAdmin,
  seedSaasSuperAdmin,
};

