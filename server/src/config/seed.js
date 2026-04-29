const User = require("../models/User");

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

module.exports = {
  seedSuperAdmin,
};

