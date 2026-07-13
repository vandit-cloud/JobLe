import { extractResumeProfile } from "../services/aiService.js";

process.on("message", async (message) => {
  if (!message || message.type !== "extract-resume") {
    return;
  }

  try {
    const profile = await extractResumeProfile(message.payload);
    process.send?.({ id: message.id, ok: true, profile });
  } catch (error) {
    process.send?.({
      id: message.id,
      ok: false,
      message: error?.message || "Resume extraction failed",
    });
  }
});
