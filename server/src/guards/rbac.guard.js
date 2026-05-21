const requireRoles = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required", requestId: req.id || null });
  }

  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: "Forbidden", requestId: req.id || null });
  }

  return next();
};

module.exports = {
  requireRoles,
};
