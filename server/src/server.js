const http = require("http");
const app = require("./app");
const connectDb = require("./config/db");
const { seedSuperAdmin } = require("./config/seed");

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

process.on("unhandledRejection", (reason) => {
  // eslint-disable-next-line no-console
  console.error("Unhandled rejection:", reason);
});

process.on("uncaughtException", (err) => {
  // eslint-disable-next-line no-console
  console.error("Uncaught exception:", err);
  process.exit(1);
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend server listening on port ${PORT}`);
});

// Connect DB after HTTP server starts (and only when starting the server).
connectDb().then(() => {
  seedSuperAdmin().catch((err) => {
    // eslint-disable-next-line no-console
    console.error("Error seeding super admin", err);
  });
});

