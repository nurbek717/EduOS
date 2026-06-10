const fs = require("fs");
const path = require("path");
const multer = require("multer");

const isVercel = process.env.VERCEL || process.env.NODE_ENV === "production";
const uploadsRoot = isVercel ? "/tmp/uploads" : path.join(__dirname, "../../uploads");
const homeworkDir = path.join(uploadsRoot, "homework");
const submissionDir = path.join(uploadsRoot, "submissions");

try {
  if (!fs.existsSync(homeworkDir)) {
    fs.mkdirSync(homeworkDir, { recursive: true });
  }
  if (!fs.existsSync(submissionDir)) {
    fs.mkdirSync(submissionDir, { recursive: true });
  }
} catch (err) {
  console.warn("Upload directory creation failed (expected on some read-only hosts):", err.message);
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, homeworkDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    const safeExt = ext ? ext.slice(0, 10) : "";
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const allowed = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "image/png",
    "image/jpeg",
    "image/webp",
    "text/plain",
  ];

  if (allowed.includes(file.mimetype)) {
    cb(null, true);
    return;
  }

  cb(new Error("Unsupported file type"));
};

const uploadHomeworkAttachment = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
}).single("attachment");

const submissionStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, submissionDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    const safeExt = ext ? ext.slice(0, 10) : "";
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
  },
});

const uploadSubmissionAttachment = multer({
  storage: submissionStorage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
}).single("attachment");

const studentImportFileFilter = (_req, file, cb) => {
  const ext = path.extname(file.originalname || "").toLowerCase();
  const allowedMimeTypes = ["text/csv", "application/csv", "application/vnd.ms-excel", "text/plain"];

  if (ext === ".csv" || allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
    return;
  }

  cb(new Error("Faqat CSV fayl yuklash mumkin"));
};

const uploadStudentImport = multer({
  storage: multer.memoryStorage(),
  fileFilter: studentImportFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
}).single("file");

module.exports = {
  uploadHomeworkAttachment,
  uploadSubmissionAttachment,
  uploadStudentImport,
};
