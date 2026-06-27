export function sanitizeValue(value) {
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, innerValue]) => [key, sanitizeValue(innerValue)]));
  }

  if (typeof value === "string") {
    return value.replace(/\0/g, "").trim();
  }

  return value;
}

export function sanitizeRequestBody(req, _res, next) {
  if (req.body) {
    req.body = sanitizeValue(req.body);
  }
  next();
}

