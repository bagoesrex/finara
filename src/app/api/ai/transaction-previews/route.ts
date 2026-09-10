import { parseAiTransactionInput } from "@/lib/ai-transaction";
import { createAiTransactionPreview } from "@/server/ai/transaction-preview";
import { getSessionViewer } from "@/server/auth/session";
import {
  apiData,
  assertTrustedMutationRequest,
  handleFinanceApiError,
  readJsonBody,
  unauthorizedResponse,
  validationErrorResponse,
} from "@/server/http/finance-api";

export async function POST(request: Request) {
  const startedAt = Date.now();
  try {
    const viewer = await getSessionViewer();
    if (!viewer) {
      console.warn("[finara-ai] transaction-previews-unauthorized");
      return unauthorizedResponse();
    }
    assertTrustedMutationRequest(request);

    const parsed = parseAiTransactionInput(await readJsonBody(request));
    if (!parsed.success) {
      console.warn("[finara-ai] transaction-previews-invalid-input");
      return validationErrorResponse(parsed);
    }

    const data = await createAiTransactionPreview(
      viewer.id,
      parsed.data.text,
    );
    console.info(
      "[finara-ai] transaction-previews-success",
      JSON.stringify({
        textLength: parsed.data.text.length,
        durationMs: Date.now() - startedAt,
      }),
    );
    return apiData(data);
  } catch (error) {
    console.warn(
      "[finara-ai] transaction-previews-failed",
      JSON.stringify({
        errorName: error instanceof Error ? error.name : "UnknownError",
        durationMs: Date.now() - startedAt,
      }),
    );
    return handleFinanceApiError(error);
  }
}
