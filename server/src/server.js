const http = require("http");
const app = require("./app");
const connectDb = require("./config/db");
const { seedSuperAdmin, seedSaasSuperAdmin } = require("./config/seed");
const { seedSchoolPlans } = require("./config/seed-school-plans");

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
  process.exit(1);
});

server.listen(PORT, () => {
  console.log(`Backend server listening on port ${PORT}`);
});

// Connect DB after HTTP server starts (and only when starting the server).
connectDb().then(() => {
  seedSuperAdmin().catch((err) => {
    console.error("Error seeding super admin", err);
  });
  seedSaasSuperAdmin().catch((err) => {
    console.error("Error seeding SaaS super admin", err);
  });
  seedSchoolPlans().catch((err) => {
    console.error("Error seeding school plans", err);
  });
});

