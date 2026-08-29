import "server-only";

import type {
  ApiErrorCode,
  ApiErrorResponse,
  ApiSuccessResponse,
} from "@/lib/api";
import type { ContractParseResult } from "@/lib/transactions";
import {
  BudgetConflictError,
  BudgetNotFoundError,
  InvalidBudgetCategoryError,
} from "@/server/budgets/service";
import {
  IdempotencyConflictError,
  InvalidTransactionReferenceError,
  TransactionNotFoundError,
} from "@/server/transactions/service";

const MAX_JSON_BODY_BYTES = 16_384;
const noStoreHeaders = { "Cache-Control": "private, no-store" };

export class InvalidJsonBodyError extends Error {
  constructor() {
    super("Invalid JSON body.");
    this.name = "InvalidJsonBodyError";
  }
}

export class CrossOriginMutationError extends Error {
  constructor() {
    super("Cross-origin mutation rejected.");
    this.name = "CrossOriginMutationError";
  }
}

export class UnsupportedMediaTypeError extends Error {
  constructor() {
    super("JSON content type required.");
    this.name = "UnsupportedMediaTypeError";
  }
}

export class PayloadTooLargeError extends Error {
  constructor() {
    super("Request body is too large.");
    this.name = "PayloadTooLargeError";
  }
}

export function assertTrustedMutationRequest(request: Request) {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  const requestOrigin = new URL(request.url).origin;

  if (
    (origin && origin !== requestOrigin) ||
    (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none")
  ) {
    throw new CrossOriginMutationError();
  }
}

export async function readJsonBody(request: Request): Promise<unknown> {
  const mediaType = request.headers
    .get("content-type")
    ?.split(";", 1)[0]
    ?.trim()
    .toLowerCase();
  if (mediaType !== "application/json") {
    throw new UnsupportedMediaTypeError();
  }

  const declaredLength = Number(request.headers.get("content-length"));
  if (
    Number.isFinite(declaredLength) &&
    declaredLength > MAX_JSON_BODY_BYTES
  ) {
    throw new PayloadTooLargeError();
  }

  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_JSON_BODY_BYTES) {
    throw new PayloadTooLargeError();
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new InvalidJsonBodyError();
  }
}

export function toStrictQueryInput(searchParams: URLSearchParams) {
  const input: Record<string, string | string[]> = {};

  for (const key of new Set(searchParams.keys())) {
    const values = searchParams.getAll(key);
    input[key] = values.length === 1 ? values[0] : values;
  }

  return input;
}

export function apiData<T>(data: T, status = 200) {
  const body: ApiSuccessResponse<T> = { data };
  return Response.json(body, { status, headers: noStoreHeaders });
}

export function apiNoContent() {
  return new Response(null, { status: 204, headers: noStoreHeaders });
}

export function apiError(
  status: number,
  code: ApiErrorCode,
  message: string,
  fieldErrors?: Record<string, string>,
) {
  const body: ApiErrorResponse = {
    error: {
      code,
      message,
      ...(fieldErrors && Object.keys(fieldErrors).length > 0
        ? { fieldErrors }
        : {}),
    },
  };
  return Response.json(body, { status, headers: noStoreHeaders });
}

export function unauthorizedResponse() {
  return apiError(401, "UNAUTHORIZED", "Sesi tidak valid. Silakan masuk lagi.");
}

export function validationErrorResponse<T>(
  result: Extract<ContractParseResult<T>, { success: false }>,
) {
  return apiError(
    422,
    "VALIDATION_ERROR",
    result.formError ?? "Periksa kembali data yang dikirim.",
    result.fieldErrors,
  );
}

export function notFoundResponse() {
  return apiError(404, "NOT_FOUND", "Transaksi tidak ditemukan.");
}

export function budgetNotFoundResponse() {
  return apiError(404, "NOT_FOUND", "Budget tidak ditemukan.");
}

export function handleFinanceApiError(error: unknown) {
  if (error instanceof CrossOriginMutationError) {
    return apiError(403, "FORBIDDEN", "Permintaan tidak diizinkan.");
  }

  if (error instanceof UnsupportedMediaTypeError) {
    return apiError(
      415,
      "UNSUPPORTED_MEDIA_TYPE",
      "Gunakan format application/json.",
    );
  }

  if (error instanceof TransactionNotFoundError) {
    return notFoundResponse();
  }

  if (error instanceof BudgetNotFoundError) {
    return budgetNotFoundResponse();
  }

  if (error instanceof InvalidBudgetCategoryError) {
    return apiError(
      422,
      "VALIDATION_ERROR",
      "Kategori pengeluaran tidak tersedia.",
      { categoryId: "Pilihan ini tidak tersedia." },
    );
  }

  if (error instanceof BudgetConflictError) {
    return apiError(
      409,
      "BUDGET_CONFLICT",
      "Kategori ini sudah memiliki alokasi berbeda untuk bulan tersebut.",
    );
  }

  if (error instanceof InvalidTransactionReferenceError) {
    return apiError(
      422,
      "VALIDATION_ERROR",
      "Akun atau kategori tidak tersedia.",
      { [error.field]: "Pilihan ini tidak tersedia." },
    );
  }

  if (error instanceof IdempotencyConflictError) {
    return apiError(
      409,
      "IDEMPOTENCY_CONFLICT",
      "Permintaan ini sudah dipakai untuk transaksi yang berbeda.",
    );
  }

  if (error instanceof PayloadTooLargeError) {
    return apiError(413, "PAYLOAD_TOO_LARGE", "Data yang dikirim terlalu besar.");
  }

  if (error instanceof InvalidJsonBodyError) {
    return apiError(400, "INVALID_JSON", "Format data tidak valid.");
  }

  console.error(
    "Finance API request failed.",
    error instanceof Error ? error.name : "UnknownError",
  );
  return apiError(500, "INTERNAL_ERROR", "Terjadi kesalahan. Coba lagi.");
}
