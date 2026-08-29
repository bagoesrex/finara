import {
  parseCreateTransactionInput,
  parseListTransactionsInput,
} from "@/lib/transactions";
import { getSessionViewer } from "@/server/auth/session";
import {
  apiData,
  assertTrustedMutationRequest,
  handleFinanceApiError,
  readJsonBody,
  toStrictQueryInput,
  unauthorizedResponse,
  validationErrorResponse,
} from "@/server/http/finance-api";
import {
  createTransaction,
  listTransactions,
} from "@/server/transactions/service";

export async function GET(request: Request) {
  try {
    const viewer = await getSessionViewer();
    if (!viewer) return unauthorizedResponse();

    const query = toStrictQueryInput(new URL(request.url).searchParams);
    const parsed = parseListTransactionsInput(query);
    if (!parsed.success) return validationErrorResponse(parsed);

    return apiData(await listTransactions(viewer.id, parsed.data));
  } catch (error) {
    return handleFinanceApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const viewer = await getSessionViewer();
    if (!viewer) return unauthorizedResponse();
    assertTrustedMutationRequest(request);

    const parsed = parseCreateTransactionInput(await readJsonBody(request));
    if (!parsed.success) return validationErrorResponse(parsed);

    return apiData(await createTransaction(viewer.id, parsed.data), 201);
  } catch (error) {
    return handleFinanceApiError(error);
  }
}
