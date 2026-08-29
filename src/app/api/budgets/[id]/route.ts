import { isBudgetId, parseUpdateBudgetInput } from "@/lib/budgets";
import { getSessionViewer } from "@/server/auth/session";
import { updateBudget } from "@/server/budgets/service";
import {
  apiData,
  assertTrustedMutationRequest,
  budgetNotFoundResponse,
  handleFinanceApiError,
  readJsonBody,
  unauthorizedResponse,
  validationErrorResponse,
} from "@/server/http/finance-api";

type BudgetRouteContext = { params: Promise<{ id: string }> };

async function getAuthorizedBudgetId(context: BudgetRouteContext) {
  const viewer = await getSessionViewer();
  if (!viewer) return { response: unauthorizedResponse() } as const;

  const { id } = await context.params;
  if (!isBudgetId(id)) return { response: budgetNotFoundResponse() } as const;

  return { viewer, budgetId: id } as const;
}

export async function PATCH(request: Request, context: BudgetRouteContext) {
  try {
    const authorization = await getAuthorizedBudgetId(context);
    if ("response" in authorization) return authorization.response;
    assertTrustedMutationRequest(request);

    const parsed = parseUpdateBudgetInput(await readJsonBody(request));
    if (!parsed.success) return validationErrorResponse(parsed);

    return apiData(
      await updateBudget(
        authorization.viewer.id,
        authorization.budgetId,
        parsed.data,
      ),
    );
  } catch (error) {
    return handleFinanceApiError(error);
  }
}
