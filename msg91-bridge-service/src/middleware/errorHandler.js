export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

export function errorHandler(error, _req, res, _next) {
  const statusCode = Number(error.statusCode ?? 500);

  if (statusCode >= 500) {
    console.error("[server error]", error);
  }

  res.status(statusCode).json({
    success: false,
    message: error.publicMessage ?? error.message ?? "Internal server error",
  });
}
