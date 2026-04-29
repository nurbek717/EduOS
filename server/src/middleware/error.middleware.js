const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.statusCode || err.status || (res.statusCode && res.statusCode !== 200 ? res.statusCode : 500);
  const isProduction = process.env.NODE_ENV === "production";

  // Log rich error only on server side.
  if (statusCode >= 500) {
    // eslint-disable-next-line no-console
    console.error("Request failed", {
      requestId: req.id,
      statusCode,
      message: err.message,
      stack: err.stack,
    });
  }

  res.status(statusCode).json({
    message: isProduction ? "Server error" : err.message || "Server error",
    requestId: req.id || null,
  });
};

module.exports = {
  notFound,
  errorHandler,
};

