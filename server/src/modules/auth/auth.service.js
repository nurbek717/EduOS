const TenantUser = require("./user.model");
const { generateTenantToken } = require("../../utils/tenant-jwt");

const authenticateUser = async (email, password) => {
  const user = await TenantUser.findOne({ email }).exec();
  if (!user) return null;

  const isMatch = await user.comparePassword(password);
  if (!isMatch) return null;

  const token = generateTenantToken(user);
  return {
    token,
    user: {
      id: user._id,
      fullname: user.fullname,
      role: user.role,
      tenantId: user.tenantId,
      email: user.email,
    },
  };
};

const getUserById = async (id) => {
  const user = await TenantUser.findById(id).lean();
  if (!user) return null;
  return {
    id: user._id,
    fullname: user.fullname,
    role: user.role,
    tenantId: user.tenantId,
    email: user.email,
  };
};

module.exports = {
  authenticateUser,
  getUserById,
};
