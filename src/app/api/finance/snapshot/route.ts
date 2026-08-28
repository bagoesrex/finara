import {
  getMonthKeyInTimeZone,
  parseMonthKey,
} from "@/lib/transactions";
import { getSessionViewer } from "@/server/auth/session";
import {
  apiData,
  handleFinanceApiError,
  unauthorizedResponse,
  validationErrorResponse,
} from "@/server/http/finance-api";
import { getFinanceSnapshot } from "@/server/transactions/service";

export async function GET(request: Request) {
  try {
    const viewer = await getSessionViewer();
    if (!viewer) return unauthorizedResponse();

    const month =
      new URL(request.url).searchParams.get("month") ??
      getMonthKeyInTimeZone(new Date());
    const parsed = parseMonthKey(month);
    if (!parsed.success) return validationErrorResponse(parsed);

    return apiData(await getFinanceSnapshot(viewer.id, parsed.data));
  } catch (error) {
    return handleFinanceApiError(error);
  }
}
