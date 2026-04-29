const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DAY_QUERY_VALUES = new Set(["today", "sun", "mon", "tue", "wed", "thu", "fri", "sat"]);
const ATTENDANCE_STATUS_VALUES = new Set(["present", "absent", "late"]);

function createValidationError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date);
}

function assertNoUnknownKeys(input, schema, pathLabel) {
  Object.keys(input).forEach((key) => {
    if (!Object.prototype.hasOwnProperty.call(schema, key)) {
      throw createValidationError(`${pathLabel}.${key} is not allowed`);
    }
  });
}

function normalizeString(value, fieldPath, options = {}) {
  if (typeof value !== "string") {
    throw createValidationError(`${fieldPath} must be a string`);
  }

  const normalized = options.trim === false ? value : value.trim();

  if (options.emptyToNull && normalized === "") {
    return null;
  }

  if (options.minLength && normalized.length < options.minLength) {
    throw createValidationError(`${fieldPath} must be at least ${options.minLength} characters`);
  }

  if (options.maxLength && normalized.length > options.maxLength) {
    throw createValidationError(`${fieldPath} must be at most ${options.maxLength} characters`);
  }

  if (options.nonEmpty && normalized.length === 0) {
    throw createValidationError(`${fieldPath} cannot be empty`);
  }

  if (options.pattern && !options.pattern.test(normalized)) {
    throw createValidationError(options.patternMessage || `${fieldPath} is invalid`);
  }

  return normalized;
}

function normalizeValue(value, definition, fieldPath) {
  if (value === undefined) {
    if (definition.required) {
      throw createValidationError(`${fieldPath} is required`);
    }
    return undefined;
  }

  if (value === null) {
    if (definition.nullable) {
      return null;
    }
    throw createValidationError(`${fieldPath} cannot be null`);
  }

  switch (definition.type) {
    case "string":
      return normalizeString(value, fieldPath, definition);
    case "email": {
      const normalized = normalizeString(value, fieldPath, {
        ...definition,
        nonEmpty: true,
      }).toLowerCase();
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(normalized)) {
        throw createValidationError(`${fieldPath} must be a valid email`);
      }
      return normalized;
    }
    case "password":
      return normalizeString(value, fieldPath, {
        ...definition,
        nonEmpty: true,
        minLength: definition.minLength || 8,
      });
    case "objectId": {
      const normalized = normalizeString(value, fieldPath, {
        ...definition,
        nonEmpty: true,
      });
      if (!OBJECT_ID_PATTERN.test(normalized)) {
        throw createValidationError(`${fieldPath} must be a valid ObjectId`);
      }
      return normalized;
    }
    case "integer": {
      if (typeof value !== "number" || !Number.isInteger(value)) {
        throw createValidationError(`${fieldPath} must be an integer`);
      }
      if (definition.min !== undefined && value < definition.min) {
        throw createValidationError(`${fieldPath} must be at least ${definition.min}`);
      }
      if (definition.max !== undefined && value > definition.max) {
        throw createValidationError(`${fieldPath} must be at most ${definition.max}`);
      }
      return value;
    }
    case "integerString": {
      const normalized = normalizeString(value, fieldPath, {
        ...definition,
        nonEmpty: true,
      });
      if (!/^-?\d+$/.test(normalized)) {
        throw createValidationError(`${fieldPath} must be an integer`);
      }
      const parsed = Number.parseInt(normalized, 10);
      if (definition.min !== undefined && parsed < definition.min) {
        throw createValidationError(`${fieldPath} must be at least ${definition.min}`);
      }
      if (definition.max !== undefined && parsed > definition.max) {
        throw createValidationError(`${fieldPath} must be at most ${definition.max}`);
      }
      return parsed;
    }
    case "number": {
      if (typeof value !== "number" || !Number.isFinite(value)) {
        throw createValidationError(`${fieldPath} must be a finite number`);
      }
      if (definition.min !== undefined && value < definition.min) {
        throw createValidationError(`${fieldPath} must be at least ${definition.min}`);
      }
      if (definition.max !== undefined && value > definition.max) {
        throw createValidationError(`${fieldPath} must be at most ${definition.max}`);
      }
      return value;
    }
    case "boolean": {
      if (typeof value !== "boolean") {
        throw createValidationError(`${fieldPath} must be a boolean`);
      }
      return value;
    }
    case "enum": {
      const normalized = normalizeString(value, fieldPath, {
        ...definition,
        nonEmpty: true,
      });
      if (!definition.values.includes(normalized)) {
        throw createValidationError(`${fieldPath} must be one of: ${definition.values.join(", ")}`);
      }
      return normalized;
    }
    case "dayQuery": {
      const normalized = normalizeString(value, fieldPath, {
        ...definition,
        nonEmpty: true,
      }).toLowerCase();
      if (!DAY_QUERY_VALUES.has(normalized)) {
        throw createValidationError(`${fieldPath} must be one of: today, sun, mon, tue, wed, thu, fri, sat`);
      }
      return normalized;
    }
    case "time": {
      const normalized = normalizeString(value, fieldPath, {
        ...definition,
        nonEmpty: true,
      });
      if (!TIME_PATTERN.test(normalized)) {
        throw createValidationError(`${fieldPath} must be in HH:mm format`);
      }
      return normalized;
    }
    case "dateString": {
      const normalized = normalizeString(value, fieldPath, {
        ...definition,
        nonEmpty: true,
      });
      if (Number.isNaN(Date.parse(normalized))) {
        throw createValidationError(`${fieldPath} must be a valid date`);
      }
      return normalized;
    }
    case "descriptor": {
      if (!Array.isArray(value) || value.length !== 128) {
        throw createValidationError(`${fieldPath} must be an array of 128 numbers`);
      }
      const normalized = value.map((entry, index) => {
        if (typeof entry !== "number" || !Number.isFinite(entry)) {
          throw createValidationError(`${fieldPath}[${index}] must be a finite number`);
        }
        return entry;
      });
      return normalized;
    }
    case "array": {
      if (!Array.isArray(value)) {
        throw createValidationError(`${fieldPath} must be an array`);
      }
      if (definition.minLength !== undefined && value.length < definition.minLength) {
        throw createValidationError(`${fieldPath} must contain at least ${definition.minLength} item(s)`);
      }
      return value.map((entry, index) => normalizeValue(entry, definition.element, `${fieldPath}[${index}]`));
    }
    case "object": {
      if (!isPlainObject(value)) {
        throw createValidationError(`${fieldPath} must be an object`);
      }
      return validateShape(value, definition.schema, fieldPath);
    }
    case "attendanceStatus": {
      const normalized = normalizeString(value, fieldPath, {
        ...definition,
        nonEmpty: true,
      }).toLowerCase();
      if (!ATTENDANCE_STATUS_VALUES.has(normalized)) {
        throw createValidationError(`${fieldPath} must be one of: present, absent, late`);
      }
      return normalized;
    }
    default:
      throw createValidationError(`Unsupported validation type for ${fieldPath}`);
  }
}

function validateShape(input, schema, pathLabel) {
  if (!isPlainObject(input)) {
    throw createValidationError(`${pathLabel} must be an object`);
  }

  assertNoUnknownKeys(input, schema, pathLabel);

  return Object.entries(schema).reduce((acc, [key, definition]) => {
    const normalized = normalizeValue(input[key], definition, `${pathLabel}.${key}`);
    if (normalized !== undefined) {
      acc[key] = normalized;
    }
    return acc;
  }, {});
}

function requireAtLeastOne(keys, sourceName = "body") {
  return ({ [sourceName]: source }) => {
    const hasAny = keys.some((key) => source[key] !== undefined);
    if (!hasAny) {
      throw createValidationError(`At least one of ${keys.join(", ")} is required`);
    }
  };
}

function requireAllOrNone(keys, sourceName = "body") {
  return ({ [sourceName]: source }) => {
    const presentCount = keys.filter((key) => source[key] !== undefined).length;
    if (presentCount > 0 && presentCount !== keys.length) {
      throw createValidationError(`Fields ${keys.join(", ")} must be provided together`);
    }
  };
}

function validateRequest(config) {
  return (req, res, next) => {
    try {
      const validated = {};

      if (config.params) {
        req.params = validateShape(req.params || {}, config.params, "params");
        validated.params = req.params;
      }

      if (config.query) {
        req.query = validateShape(req.query || {}, config.query, "query");
        validated.query = req.query;
      }

      if (config.body) {
        req.body = validateShape(req.body || {}, config.body, "body");
        validated.body = req.body;
      }

      if (config.rules) {
        config.rules.forEach((rule) => rule(validated));
      }

      next();
    } catch (error) {
      return res.status(error.statusCode || 400).json({
        message: error.message || "Invalid request data",
        requestId: req.id || null,
      });
    }
  };
}

module.exports = {
  validateRequest,
  requireAtLeastOne,
  requireAllOrNone,
};
