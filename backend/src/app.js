import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { sanitizeRequestBody } from "./utils/sanitize.js";
import apiRoutes from "./routes/index.js";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: env.clientUrl,
    }),
  );
  app.use(helmet());
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan("dev"));
  app.use(sanitizeRequestBody);
  app.use("/uploads/logos", express.static(path.resolve(process.cwd(), "backend", "storage", "logos")));

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api", apiRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
