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
  try {
    const viewer = await getSessionViewer();
    if (!viewer) return unauthorizedResponse();
    assertTrustedMutationRequest(request);

    const parsed = parseAiComposerInput(await readJsonBody(request));
    if (!parsed.success) return validationErrorResponse(parsed);

    return apiData(await createAiComposerResponse(viewer.id, parsed.data.text));
  } catch (error) {
    return handleFinanceApiError(error);
  }
}
