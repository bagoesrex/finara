import { aiTransactionPreviewResponseSchema } from "./ai-transaction";
import { financeFetch, readApiData } from "./finance-query";

export async function fetchAiTransactionPreview(text: string) {
  const response = await financeFetch("/api/ai/transaction-previews", {
    method: "POST",
    body: JSON.stringify({ text }),
  });

  return aiTransactionPreviewResponseSchema.parse(await readApiData(response));
}
