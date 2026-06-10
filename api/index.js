const app = require("../server/src/app");
const connectDb = require("../server/src/config/db");

let initialized = false;

module.exports = async (req, res) => {
  if (!initialized) {
    try {
      await connectDb();
      initialized = true;
    } catch (err) {
      console.error("Init error:", err.message);
      return res.status(500).json({ error: "Database connection failed" });
    }
  }
  return app(req, res);
};
