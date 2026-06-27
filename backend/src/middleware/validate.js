import { ApiError } from "../utils/apiError.js";

export function validate(schema, source = "body") {
  return (req, _res, next) => {
    const parsed = schema.safeParse(req[source]);

    if (!parsed.success) {
      return next(
        new ApiError(
          400,
          "Validation failed",
          parsed.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        ),
      );
    }

    req[source] = parsed.data;
    return next();
  };
}

