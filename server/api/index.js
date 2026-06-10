const app = require("../src/app");
const connectDb = require("../src/config/db");

let initialized = false;

module.exports = async (req, res) => {
  if (!initialized) {
    try {
      await connectDb();
      initialized = true;
      console.log("MongoDB connected for serverless");
    } catch (err) {
      console.error("DB init error:", err);
    }
  }
  return app(req, res);
};
