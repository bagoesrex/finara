import {
  isTransactionId,
  parseUpdateTransactionInput,
} from "@/lib/transactions";
import { getSessionViewer } from "@/server/auth/session";
import {
  apiData,
  apiNoContent,
  assertTrustedMutationRequest,
  handleFinanceApiError,
  notFoundResponse,
  readJsonBody,
  unauthorizedResponse,
  validationErrorResponse,
} from "@/server/http/finance-api";
import {
  getTransaction,
  softDeleteTransaction,
  updateTransaction,
} from "@/server/transactions/service";

type TransactionRouteContext = { params: Promise<{ id: string }> };

async function getAuthorizedTransactionId(context: TransactionRouteContext) {
  const viewer = await getSessionViewer();
  if (!viewer) return { response: unauthorizedResponse() } as const;

  const { id } = await context.params;
  if (!isTransactionId(id)) return { response: notFoundResponse() } as const;

  return { viewer, transactionId: id } as const;
}

export async function GET(_request: Request, context: TransactionRouteContext) {
  try {
    const authorization = await getAuthorizedTransactionId(context);
    if ("response" in authorization) return authorization.response;

    return apiData(
      await getTransaction(
        authorization.viewer.id,
        authorization.transactionId,
      ),
    );
  } catch (error) {
    return handleFinanceApiError(error);
  }
}

export async function PATCH(
  request: Request,
  context: TransactionRouteContext,
) {
  try {
    const authorization = await getAuthorizedTransactionId(context);
    if ("response" in authorization) return authorization.response;
    assertTrustedMutationRequest(request);

    const parsed = parseUpdateTransactionInput(await readJsonBody(request));
    if (!parsed.success) return validationErrorResponse(parsed);

    return apiData(
      await updateTransaction(
        authorization.viewer.id,
        authorization.transactionId,
        parsed.data,
      ),
    );
  } catch (error) {
    return handleFinanceApiError(error);
  }
}

export async function DELETE(
  _request: Request,
  context: TransactionRouteContext,
) {
  try {
    const authorization = await getAuthorizedTransactionId(context);
    if ("response" in authorization) return authorization.response;
    assertTrustedMutationRequest(_request);

    await softDeleteTransaction(
      authorization.viewer.id,
      authorization.transactionId,
    );
    return apiNoContent();
  } catch (error) {
    return handleFinanceApiError(error);
  }
}
