import assert from "node:assert/strict";
import { AiPreviewRateLimitExceededError } from "../src/server/ai/rate-limit";
import { handleFinanceApiError } from "../src/server/http/finance-api";

async function checkAiRateLimitResponse() {
  const response = handleFinanceApiError(
    new AiPreviewRateLimitExceededError(37),
  );

  assert.equal(response.status, 429);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.headers.get("retry-after"), "37");
  assert.deepEqual(await response.json(), {
    error: {
      code: "AI_RATE_LIMITED",
      message: "Terlalu banyak permintaan AI. Coba lagi sebentar.",
    },
  });
}

checkAiRateLimitResponse()
  .then(() => {
    console.info("AI preview rate-limit response verified.");
  })
  .catch((error: unknown) => {
    console.error("AI preview rate-limit response verification failed.");
    console.error(error);
    process.exitCode = 1;
  });
