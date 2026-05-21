// 1. ENV eng tepada
require("dotenv").config();

const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const crypto = require("crypto");
const path = require("path");

// DB connect/seed are intentionally not imported here (see note below).

const authRoutes = require("./routes/auth.routes");
const saasAuthRoutes = require("./modules/auth/auth.routes");
const tenantRoutes = require("./modules/tenants/tenant.routes");
const planRoutes = require("./modules/plans/plan.routes");
const subscriptionRoutes = require("./modules/subscriptions/subscription.routes");
const branchRoutes = require("./modules/branches/branch.routes");
const saasStudentRoutes = require("./modules/students/student.routes");
const saasTeacherRoutes = require("./modules/teachers/teacher.routes");
const analyticsRoutes = require("./modules/analytics/analytics.routes");
const schoolRoutes = require("./routes/school.routes");
const directorRoutes = require("./routes/director.routes");
const teacherRoutes = require("./routes/teacher.routes");
const studentRoutes = require("./routes/student.routes");
const parentRoutes = require("./routes/parent.routes");
const adminRoutes = require("./routes/admin.routes");
const ticketRoutes = require("./routes/ticket.routes");
const examRoutes = require("./routes/exam.routes");
const { sanitizeRequest } = require("./middleware/sanitize.middleware");

const { notFound, errorHandler } = require("./middleware/error.middleware");

const app = express();
app.disable("x-powered-by");

// Request id — helps trace errors across frontend/backend logs.
app.use((req, res, next) => {
  const incomingId = req.headers["x-request-id"];
  const requestId = typeof incomingId === "string" && incomingId.trim() ? incomingId : crypto.randomUUID();
  req.id = requestId;
  res.setHeader("x-request-id", requestId);
  next();
});


// NOTE: Do not connect to MongoDB on module import.
// CI uses `require("./src/app")` as a syntax smoke test; DB connection must happen in `src/server.js`.


// 3. SECURITY MIDDLEWARE

// Helmet — HTTP header himoyasi
app.use(helmet());


// 4. CORS (SECURE VERSION)

const isProduction = process.env.NODE_ENV === "production";

const defaultDevOrigins = [
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

const envOrigins = process.env.CORS_ORIGIN
  ?.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean) || [];

if (isProduction && envOrigins.length === 0) {
  throw new Error("CORS_ORIGIN must be set in production (comma-separated allowed origins)");
}

const allowedOrigins = new Set(
  [
    ...envOrigins,
    ...(!isProduction ? defaultDevOrigins : []),
  ]
);

const isDevLocalOrigin = (origin) => {
  if (isProduction || !origin) return false;
  return /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
};

app.use(
  cors({
    origin: function (origin, callback) {
      // In production, browser origin must be explicitly allow-listed.
      // Requests without origin are allowed only outside production.
      if (!origin) {
        return callback(null, !isProduction);
      }

      if (allowedOrigins.has(origin) || isDevLocalOrigin(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS ruxsat yo‘q: ${origin}`));
      }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-request-id"],
    credentials: true,
    optionsSuccessStatus: 204,
  })
);

// Rate limit — DDOS / brute force himoya
// In development we keep a higher ceiling because dashboards poll frequently.
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: isProduction ? 100 : 1000,
  skip: (req) => req.method === "OPTIONS",
  message: "Juda ko‘p so‘rov, keyinroq urinib ko‘ring"
});
app.use(limiter);


// 5. BODY PARSER
// Profile photo uploads are sent as base64 data URLs (JSON),
// which can exceed the default 5mb limit after base64 overhead.
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));
app.use(cookieParser());
app.use(sanitizeRequest);
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));


// 6. HEALTH CHECK
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    time: new Date().toISOString(),
  });
});


// 7. ROUTES
app.use("/api/auth", authRoutes);
app.use("/api/saas/auth", saasAuthRoutes);
app.use("/api/tenants", tenantRoutes);
app.use("/api/plans", planRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/branches", branchRoutes);
app.use("/api/students", saasStudentRoutes);
app.use("/api/teachers", saasTeacherRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/schools", schoolRoutes);
app.use("/api/director", directorRoutes);
app.use("/api/teacher", teacherRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/parent", parentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/exams", examRoutes);


// 8. ERROR HANDLING
app.use(notFound);
app.use(errorHandler);


module.exports = app;