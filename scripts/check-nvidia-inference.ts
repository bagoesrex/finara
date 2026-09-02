import assert from "node:assert/strict";
import { buildComposerRouterPrompts } from "../src/ai/composer-router";
import { aiComposerIntentSchema } from "../src/lib/ai-composer";
import { getNvidiaConfig } from "../src/server/ai/config";
import { requestNvidiaStructuredJson } from "../src/server/ai/nvidia-client";

const promptContext = {
  categories: [
    { name: "Food & Drink", type: "EXPENSE" as const },
    { name: "Other", type: "EXPENSE" as const },
    { name: "Salary", type: "INCOME" as const },
  ],
  currentMonth: "2026-08",
  referenceDate: "2026-08-30",
};

async function routeWithNvidia(text: string) {
  const prompts = buildComposerRouterPrompts({ ...promptContext, text });
  return requestNvidiaStructuredJson({
    ...getNvidiaConfig(),
    maxTokens: 384,
    outputSchema: aiComposerIntentSchema,
    systemPrompt: prompts.system,
    userPrompt: prompts.user,
  });
}

async function checkNvidiaInference() {
  const balanceIntent = await routeWithNvidia("saldo saya?");
  assert.deepEqual(balanceIntent, { intent: "GET_BALANCE" });

  const extraction = await routeWithNvidia("makan ayam 25rb");
  if (extraction.intent !== "CREATE_TRANSACTION") {
    assert.fail(`Expected CREATE_TRANSACTION, received ${extraction.intent}.`);
  }
  assert.equal(extraction.type, "EXPENSE");
  assert.equal(extraction.amount, "25000");
  assert.equal(extraction.categoryHint, "Food & Drink");
  assert.equal(extraction.transactionDate, "2026-08-30");
  console.info("NVIDIA composer inference verified.");
}

checkNvidiaInference().catch((error: unknown) => {
  console.error("NVIDIA composer inference check failed.");
  console.error(error instanceof Error ? error.name : "UnknownError");
  process.exitCode = 1;
});
