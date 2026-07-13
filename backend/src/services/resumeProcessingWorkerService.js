import { fork } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { ApiError } from "../utils/apiError.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORKER_PATH = path.resolve(__dirname, "../workers/resumeExtractionWorker.js");
const RESUME_WORKER_TIMEOUT_MS = 30000;

export function extractResumeProfileInWorker(payload) {
  return new Promise((resolve, reject) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const worker = fork(WORKER_PATH, [], {
      execArgv: ["--max-old-space-size=512"],
      env: {
        ...process.env,
        RESUME_WORKER: "true",
      },
      stdio: ["ignore", "ignore", "ignore", "ipc"],
    });

    const timeout = setTimeout(() => {
      worker.kill("SIGKILL");
      reject(new ApiError(504, "Resume processing timed out."));
    }, RESUME_WORKER_TIMEOUT_MS);

    worker.on("message", (message) => {
      if (!message || message.id !== id) {
        return;
      }

      clearTimeout(timeout);
      worker.kill();

      if (message.ok) {
        resolve(message.profile);
        return;
      }

      reject(new ApiError(422, message.message || "Resume extraction failed."));
    });

    worker.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    worker.on("exit", (code) => {
      if (code && code !== 0) {
        clearTimeout(timeout);
        reject(new ApiError(422, "Resume extraction worker failed."));
      }
    });

    worker.send({ id, type: "extract-resume", payload });
  });
}
