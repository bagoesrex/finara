import { isAccountId, parseUpdateAccountInput } from "@/lib/accounts";
import { renameAccount } from "@/server/accounts/service";
import { getSessionViewer } from "@/server/auth/session";
import {
  accountNotFoundResponse,
  apiData,
  assertTrustedMutationRequest,
  handleFinanceApiError,
  readJsonBody,
  unauthorizedResponse,
  validationErrorResponse,
} from "@/server/http/finance-api";

type AccountRouteContext = { params: Promise<{ id: string }> };

async function getAuthorizedAccountId(context: AccountRouteContext) {
  const viewer = await getSessionViewer();
  if (!viewer) return { response: unauthorizedResponse() } as const;

  const { id } = await context.params;
  if (!isAccountId(id)) return { response: accountNotFoundResponse() } as const;

  return { accountId: id, viewer } as const;
}

export async function PATCH(request: Request, context: AccountRouteContext) {
  try {
    const authorization = await getAuthorizedAccountId(context);
    if ("response" in authorization) return authorization.response;
    assertTrustedMutationRequest(request);

    const parsed = parseUpdateAccountInput(await readJsonBody(request));
    if (!parsed.success) return validationErrorResponse(parsed);

    return apiData(
      await renameAccount(
        authorization.viewer.id,
        authorization.accountId,
        parsed.data,
      ),
    );
  } catch (error) {
    return handleFinanceApiError(error);
  }
}
