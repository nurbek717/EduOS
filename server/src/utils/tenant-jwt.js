const jwt = require("jsonwebtoken");

const buildPayload = (user) => ({
  userId: user._id.toString(),
  tenantId: user.tenantId ? user.tenantId.toString() : null,
  role: user.role,
  type: "access",
});

const generateTenantToken = (user) => {
  const payload = buildPayload(user);
  const secret = process.env.JWT_SECRET || "dev-secret";
  const expiresIn = process.env.JWT_ACCESS_EXPIRES_IN || "1d";
  return jwt.sign(payload, secret, { expiresIn });
};

const verifyTenantToken = (token) => {
  const secret = process.env.JWT_SECRET || "dev-secret";
  const decoded = jwt.verify(token, secret);
  if (decoded.type !== "access") {
    throw new Error("Invalid token type");
  }
  return decoded;
};

module.exports = {
  generateTenantToken,
  verifyTenantToken,
};
