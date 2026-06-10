const app = require("../server/src/app");
const connectDb = require("../server/src/config/db");
const { seedSuperAdmin, seedSaasSuperAdmin } = require("../server/src/config/seed");
const { seedSchoolPlans } = require("../server/src/config/seed-school-plans");

let initialized = false;

module.exports = async (req, res) => {
  if (!initialized) {
    try {
      await connectDb();
      
      // Auto-seed on startup for Vercel
      await Promise.allSettled([
        seedSuperAdmin(),
        seedSaasSuperAdmin(),
        seedSchoolPlans()
      ]);
      
      initialized = true;
    } catch (err) {
      console.error("Initialization error:", err.stack || err.message);
      return res.status(500).json({ 
        error: "Server initialization failed", 
        message: err.message,
        hint: "Check MONGODB_URI and other environment variables in Vercel dashboard."
      });
    }
  }

  try {
    return await app(req, res);
  } catch (err) {
    console.error("App execution error:", err.stack || err.message);
    res.status(500).json({ 
      error: "Internal Server Error", 
      message: err.message 
    });
  }
};
