const rateLimit = require("express-rate-limit");

const authLoginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    message: "Login urinishlari juda ko'p. 15 daqiqadan keyin qayta urinib ko'ring.",
  },
});

module.exports = {
  authLoginLimiter,
};
