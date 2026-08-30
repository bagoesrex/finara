import { aiTransactionPreviewResponseSchema } from "./ai-transaction";
import { aiComposerResponseSchema } from "./ai-composer";
import { financeFetch, readApiData } from "./finance-query";

export async function fetchAiComposerResponse(text: string) {
  const response = await financeFetch("/api/ai/composer-responses", {
    method: "POST",
    body: JSON.stringify({ text }),
  });

  return aiComposerResponseSchema.parse(await readApiData(response));
}

export async function fetchAiTransactionPreview(text: string) {
  const response = await financeFetch("/api/ai/transaction-previews", {
    method: "POST",
    body: JSON.stringify({ text }),
  });

  return aiTransactionPreviewResponseSchema.parse(await readApiData(response));
}
