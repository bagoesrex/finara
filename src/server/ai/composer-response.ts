import "server-only";

import { buildComposerRouterPrompts } from "@/ai/composer-router";
import { aiComposerIntentSchema } from "@/lib/ai-composer";
import { resolveAiComposerIntent } from "@/lib/ai-composer-resolution";
import {
  getDateKeyInTimeZone,
  getMonthKeyInTimeZone,
} from "@/lib/transactions";
import { db } from "@/server/db/client";
import { getNvidiaConfig } from "./config";
import { executeFinanceReadIntent } from "./finance-tools";
import { requestNvidiaStructuredJson } from "./nvidia-client";
import { consumeAiPreviewQuota } from "./rate-limit";

export async function createAiComposerResponse(
  userId: string,
  text: string,
  now = new Date(),
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
  const referenceDate = getDateKeyInTimeZone(now);
  const prompts = buildComposerRouterPrompts({
    categories: categories.map(({ name, type }) => ({ name, type })),
    currentMonth: getMonthKeyInTimeZone(now),
    referenceDate,
    text,
  });

  await consumeAiPreviewQuota(userId);
  const intent = await requestNvidiaStructuredJson({
    apiKey,
    maxTokens: 384,
    model,
    outputSchema: aiComposerIntentSchema,
    systemPrompt: prompts.system,
    userPrompt: prompts.user,
  });

  return resolveAiComposerIntent(
    intent,
    { accounts, categories, referenceDate },
    (readIntent) => executeFinanceReadIntent(userId, readIntent, now),
  );
}
