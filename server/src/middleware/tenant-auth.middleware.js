const { verifyTenantToken } = require("../utils/tenant-jwt");

const tenantAuthRequired = (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const [, token] = header.split(" ");

    if (!token) {
      return res.status(401).json({ message: "Authentication required", requestId: req.id || null });
    }

    const decoded = verifyTenantToken(token);

    req.user = {
      id: decoded.userId,
      role: decoded.role,
      tenantId: decoded.tenantId || null,
    };

    const requestedTenantId = req.headers["x-tenant-id"];
    if (decoded.role === "super_admin" && requestedTenantId) {
      req.tenantId = requestedTenantId;
    } else {
      req.tenantId = decoded.tenantId || null;
    }

    if (!req.tenantId && decoded.role !== "super_admin") {
      return res.status(403).json({ message: "Tenant scope required", requestId: req.id || null });
    }

    return next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token", requestId: req.id || null });
  }
};

const requireTenantContext = (req, res, next) => {
  if (!req.tenantId && (!req.user || req.user.role !== "super_admin")) {
    return res.status(403).json({ message: "Tenant scope required", requestId: req.id || null });
  }
  return next();
};

module.exports = {
  tenantAuthRequired,
  requireTenantContext,
};
