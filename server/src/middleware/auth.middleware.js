const User = require("../models/User");
const { verifyToken } = require("../utils/jwt");

const authRequired = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const [, token] = header.split(" ");

    if (!token) {
      return res.status(401).json({ message: "Authentication required", requestId: req.id || null });
    }

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.sub).populate("school").exec();

    if (!user) {
      return res.status(401).json({ message: "User not found", requestId: req.id || null });
    }

    req.user = {
      id: user._id,
      role: user.role,
      schoolId: user.school ? user.school._id : null,
      school: user.school || null,
    };

    return next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token", requestId: req.id || null });
  }
};

const requireRoles = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required", requestId: req.id || null });
  }

  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: "Forbidden", requestId: req.id || null });
  }

  return next();
};

// Ensures user is scoped to a school when necessary.
const requireSchoolScope = (allowSuperAdmin = true) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required", requestId: req.id || null });
  }

  if (req.user.role === "super_admin" && allowSuperAdmin) {
    return next();
  }

  if (!req.user.schoolId) {
    return res.status(403).json({ message: "School scope required", requestId: req.id || null });
  }

  const paramSchoolId = req.params.schoolId || req.body.schoolId;
  if (paramSchoolId && req.user.schoolId.toString() !== paramSchoolId.toString()) {
    return res.status(403).json({ message: "Access denied for this school", requestId: req.id || null });
  }

  return next();
};

module.exports = {
  authRequired,
  requireRoles,
  requireSchoolScope,
};

