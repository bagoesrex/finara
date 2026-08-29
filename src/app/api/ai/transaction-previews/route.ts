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
  try {
    const viewer = await getSessionViewer();
    if (!viewer) return unauthorizedResponse();
    assertTrustedMutationRequest(request);

    const parsed = parseAiTransactionInput(await readJsonBody(request));
    if (!parsed.success) return validationErrorResponse(parsed);

    return apiData(
      await createAiTransactionPreview(viewer.id, parsed.data.text),
    );
  } catch (error) {
    return handleFinanceApiError(error);
  }
}
