import { connectDatabase } from "./config/db.js";
import { env } from "./config/env.js";
import { createApp } from "./app.js";
import { scheduleResumeRetentionCleanup } from "./services/resumeRetentionService.js";
import { scheduleIdentityVerificationRetentionCleanup } from "./services/identityVerificationRetentionService.js";

async function bootstrap() {
  await connectDatabase();
  scheduleResumeRetentionCleanup();
  scheduleIdentityVerificationRetentionCleanup();
  const app = createApp();
  app.listen(env.port, () => {
    console.log(`Backend API running on http://localhost:${env.port}`);
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
