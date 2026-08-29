import assert from "node:assert/strict";
import "dotenv/config";

import { buildTransactionParserPrompts } from "../src/ai/transaction-parser";
import { getNvidiaConfig } from "../src/server/ai/config";
import { requestNvidiaTransactionExtraction } from "../src/server/ai/nvidia-client";

async function checkNvidiaInference() {
  const config = getNvidiaConfig();
  const prompts = buildTransactionParserPrompts({
    categories: [
      { name: "Food & Drink", type: "EXPENSE" },
      { name: "Other", type: "EXPENSE" },
      { name: "Salary", type: "INCOME" },
    ],
    referenceDate: "2026-08-30",
    text: "makan ayam 25rb",
  });
  const extraction = await requestNvidiaTransactionExtraction({
    ...config,
    systemPrompt: prompts.system,
    userPrompt: prompts.user,
  });

  assert.equal(extraction.intent, "CREATE_TRANSACTION");
  assert.equal(extraction.type, "EXPENSE");
  assert.equal(extraction.amount, "25000");
  assert.equal(extraction.categoryHint, "Food & Drink");
  assert.equal(extraction.transactionDate, "2026-08-30");
  console.info("NVIDIA transaction inference verified.");
}

checkNvidiaInference().catch((error: unknown) => {
  console.error("NVIDIA transaction inference check failed.");
  console.error(error instanceof Error ? error.name : "UnknownError");
  process.exitCode = 1;
});
