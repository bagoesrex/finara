import "server-only";

import { buildTransactionParserPrompts } from "@/ai/transaction-parser";
import { resolveAiTransactionPreview } from "@/lib/ai-transaction";
import { getDateKeyInTimeZone } from "@/lib/transactions";
import { db } from "@/server/db/client";
import { getNvidiaConfig } from "./config";
import { requestNvidiaTransactionExtraction } from "./nvidia-client";
import { consumeAiPreviewQuota } from "./rate-limit";

export async function createAiTransactionPreview(
  userId: string,
  text: string,
) {
  const { apiKey, model } = getNvidiaConfig();
  const [accounts, categories] = await db.$transaction([
    db.account.findMany({
      where: { userId },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: { id: true, name: true },
    }),
    db.category.findMany({
      where: { userId },
      orderBy: [{ type: "asc" }, { name: "asc" }, { id: "asc" }],
      select: { id: true, name: true, type: true },
    }),
  ]);
  const referenceDate = getDateKeyInTimeZone(new Date());
  const prompts = buildTransactionParserPrompts({
    categories: categories.map(({ name, type }) => ({ name, type })),
    referenceDate,
    text,
  });
  await consumeAiPreviewQuota(userId);
  const extraction = await requestNvidiaTransactionExtraction({
    apiKey,
    model,
    systemPrompt: prompts.system,
    userPrompt: prompts.user,
  });

  return resolveAiTransactionPreview(extraction, {
    accounts,
    categories,
    referenceDate,
  });
}
