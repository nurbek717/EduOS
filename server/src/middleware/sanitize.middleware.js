const DANGEROUS_KEY_PATTERN = /(^\$)|\./;

// These fields should not be modified by sanitization, otherwise auth may break.
const SKIP_SANITIZE_KEYS = new Set(["password", "refreshToken", "faceDescriptor", "descriptor"]);

function sanitizeString(value) {
  return value
    .replace(/\u0000/g, "")
    .replace(/javascript:/gi, "");
}

function sanitizeValue(value, keyName) {
  if (keyName && SKIP_SANITIZE_KEYS.has(keyName)) return value;

  if (Array.isArray(value)) {
    return value.map((v) => sanitizeValue(v));
  }

  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.entries(value).reduce((acc, [key, nestedValue]) => {
      if (DANGEROUS_KEY_PATTERN.test(key)) {
        return acc;
      }

      acc[key] = sanitizeValue(nestedValue, key);
      return acc;
    }, {});
  }

  if (typeof value === "string") {
    return sanitizeString(value);
  }

  return value;
}

function sanitizeRequest(req, _res, next) {
  if (req.body) {
    req.body = sanitizeValue(req.body);
  }

  if (req.query) {
    req.query = sanitizeValue(req.query);
  }

  if (req.params) {
    req.params = sanitizeValue(req.params);
  }

  next();
}

module.exports = {
  sanitizeRequest,
};
