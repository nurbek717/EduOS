const jwt = require("jsonwebtoken");

const buildPayload = (user, type) => ({
  sub: user._id.toString(),
  role: user.role,
  schoolId: user.school ? user.school.toString() : null,
  type,
});

const generateAccessToken = (user) => {
  const payload = buildPayload(user, "access");
  const secret = process.env.JWT_SECRET || "dev-secret";
  const expiresIn = process.env.JWT_ACCESS_EXPIRES_IN || process.env.JWT_EXPIRES_IN || "15m";
  const allowNever = process.env.JWT_ALLOW_NEVER === "true";

  if (allowNever && (!expiresIn || expiresIn === "never")) {
    return jwt.sign(payload, secret);
  }

  return jwt.sign(payload, secret, { expiresIn });
};

const generateRefreshToken = (user) => {
  const payload = buildPayload(user, "refresh");
  const secret = process.env.JWT_SECRET || "dev-secret";
  const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN || "7d";
  return jwt.sign(payload, secret, { expiresIn });
};

// Backwards compatibility: old code may still call generateToken
const generateToken = generateAccessToken;

const verifyToken = (token, expectedType = "access") => {
  const secret = process.env.JWT_SECRET || "dev-secret";
  const decoded = jwt.verify(token, secret);
  if (expectedType && decoded.type !== expectedType) {
    throw new Error("Invalid token type");
  }
  return decoded;
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateToken,
  verifyToken,
};

