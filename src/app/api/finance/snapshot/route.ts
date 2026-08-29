import {
  getMonthKeyInTimeZone,
  parseFinanceSnapshotInput,
} from "@/lib/transactions";
import { getSessionViewer } from "@/server/auth/session";
import {
  apiData,
  handleFinanceApiError,
  toStrictQueryInput,
  unauthorizedResponse,
  validationErrorResponse,
} from "@/server/http/finance-api";
import { getFinanceSnapshot } from "@/server/transactions/service";

export async function GET(request: Request) {
  try {
    const viewer = await getSessionViewer();
    if (!viewer) return unauthorizedResponse();

    const query = toStrictQueryInput(new URL(request.url).searchParams);
    const parsed = parseFinanceSnapshotInput(query);
    if (!parsed.success) return validationErrorResponse(parsed);

    const month = parsed.data.month ?? getMonthKeyInTimeZone(new Date());

    return apiData(await getFinanceSnapshot(viewer.id, month));
  } catch (error) {
    return handleFinanceApiError(error);
  }
}
