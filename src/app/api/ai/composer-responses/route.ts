import { parseAiComposerInput } from "@/lib/ai-composer";
import { createAiComposerResponse } from "@/server/ai/composer-response";
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
      console.warn("[finara-ai] composer-responses-unauthorized");
      return unauthorizedResponse();
    }
    assertTrustedMutationRequest(request);

    const parsed = parseAiComposerInput(await readJsonBody(request));
    if (!parsed.success) {
      console.warn("[finara-ai] composer-responses-invalid-input");
      return validationErrorResponse(parsed);
    }

    const data = await createAiComposerResponse(viewer.id, parsed.data.text);
    console.info(
      "[finara-ai] composer-responses-success",
      JSON.stringify({
        textLength: parsed.data.text.length,
        durationMs: Date.now() - startedAt,
      }),
    );
    return apiData(data);
  } catch (error) {
    console.warn(
      "[finara-ai] composer-responses-failed",
      JSON.stringify({
        errorName: error instanceof Error ? error.name : "UnknownError",
        durationMs: Date.now() - startedAt,
      }),
    );
    return handleFinanceApiError(error);
  }
}
