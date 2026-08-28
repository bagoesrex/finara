export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "INVALID_JSON"
  | "PAYLOAD_TOO_LARGE"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "IDEMPOTENCY_CONFLICT"
  | "INTERNAL_ERROR";

export type ApiErrorResponse = {
  error: {
    code: ApiErrorCode;
    message: string;
    fieldErrors?: Record<string, string>;
  };
};

export type ApiSuccessResponse<T> = { data: T };
