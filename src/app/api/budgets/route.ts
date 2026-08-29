import {
  parseCreateBudgetInput,
  parseListBudgetsInput,
} from "@/lib/budgets";
import { getSessionViewer } from "@/server/auth/session";
import { createBudget, getBudgetOverview } from "@/server/budgets/service";
import {
  apiData,
  assertTrustedMutationRequest,
  handleFinanceApiError,
  readJsonBody,
  unauthorizedResponse,
  validationErrorResponse,
} from "@/server/http/finance-api";

export async function GET(request: Request) {
  try {
    const viewer = await getSessionViewer();
    if (!viewer) return unauthorizedResponse();

    const query = Object.fromEntries(new URL(request.url).searchParams.entries());
    const parsed = parseListBudgetsInput(query);
    if (!parsed.success) return validationErrorResponse(parsed);

    return apiData(await getBudgetOverview(viewer.id, parsed.data.month));
  } catch (error) {
    return handleFinanceApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const viewer = await getSessionViewer();
    if (!viewer) return unauthorizedResponse();
    assertTrustedMutationRequest(request);

    const parsed = parseCreateBudgetInput(await readJsonBody(request));
    if (!parsed.success) return validationErrorResponse(parsed);

    return apiData(await createBudget(viewer.id, parsed.data), 201);
  } catch (error) {
    return handleFinanceApiError(error);
  }
}
