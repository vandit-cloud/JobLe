export function notFoundHandler(_req, res) {
  res.status(404).json({
    message: "Resource not found",
  });
}

export function errorHandler(error, _req, res, _next) {
  const statusCode = error.statusCode || 500;
  const payload = {
    message: error.message || "Internal server error",
  };

  if (error.details) {
    payload.details = error.details;
  }

  res.status(statusCode).json(payload);
}

