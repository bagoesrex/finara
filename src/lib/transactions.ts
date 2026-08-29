import { z } from "zod";

export const TRANSACTION_TYPES = ["INCOME", "EXPENSE"] as const;
export const MAX_TRANSACTION_DESCRIPTION_LENGTH = 120;
export const MAX_TRANSACTION_SEARCH_LENGTH = 80;
export const MAX_TRANSACTION_PAGE_SIZE = 50;

const POSTGRES_BIGINT_MAX = BigInt("9223372036854775807");
const calendarDatePattern = /^\d{4}-\d{2}-\d{2}$/;
const monthKeyPattern = /^(?!0000)\d{4}-(0[1-9]|1[0-2])$/;
const localTimePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export type TransactionDto = {
  id: string;
  accountId: string;
  accountName: string;
  categoryId: string;
  categoryName: string;
  type: TransactionType;
  amount: string;
  description: string;
  transactionDate: string;
  transactionTime: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TransactionPageDto = {
  items: TransactionDto[];
  nextCursor: string | null;
};

export type FinanceSnapshotDto = {
  monthKey: string;
  monthLabel: string;
  availableBalance: string;
  monthlyExpense: string;
  monthlyIncome: string;
  accounts: Array<{
    id: string;
    name: string;
    type: "CASH" | "BANK" | "EWALLET";
    currentBalance: string;
  }>;
  categories: Array<{
    id: string;
    name: string;
    type: TransactionType;
  }>;
};

export const transactionDtoSchema = z
  .object({
    id: z.uuid(),
    accountId: z.uuid(),
    accountName: z.string(),
    categoryId: z.uuid(),
    categoryName: z.string(),
    type: z.enum(TRANSACTION_TYPES),
    amount: z.string().regex(/^\d+$/),
    description: z.string(),
    transactionDate: z.string().refine(isValidCalendarDate),
    transactionTime: z.string().regex(localTimePattern).nullable(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .strict();

export const transactionPageDtoSchema = z
  .object({
    items: z.array(transactionDtoSchema),
    nextCursor: z.uuid().nullable(),
  })
  .strict();

export const financeSnapshotDtoSchema = z
  .object({
    monthKey: z.string().regex(monthKeyPattern),
    monthLabel: z.string(),
    availableBalance: z.string().regex(/^-?\d+$/),
    monthlyExpense: z.string().regex(/^\d+$/),
    monthlyIncome: z.string().regex(/^\d+$/),
    accounts: z.array(
      z
        .object({
          id: z.uuid(),
          name: z.string(),
          type: z.enum(["CASH", "BANK", "EWALLET"]),
          currentBalance: z.string().regex(/^-?\d+$/),
        })
        .strict(),
    ),
    categories: z.array(
      z
        .object({
          id: z.uuid(),
          name: z.string(),
          type: z.enum(TRANSACTION_TYPES),
        })
        .strict(),
    ),
  })
  .strict();

type ContractFieldErrors = Record<string, string>;

export type ContractParseResult<T> =
  | { success: true; data: T }
  | {
      success: false;
      fieldErrors: ContractFieldErrors;
      formError?: string;
    };

function isValidCalendarDate(value: string) {
  if (!calendarDatePattern.test(value)) return false;

  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

const transactionMutationShape = {
  accountId: z.uuid({ error: "Pilih akun yang valid." }),
  categoryId: z.uuid({ error: "Pilih kategori yang valid." }),
  type: z.enum(TRANSACTION_TYPES, {
    error: "Pilih jenis transaksi yang valid.",
  }),
  amount: z
    .string({ error: "Masukkan nominal Rupiah utuh." })
    .trim()
    .regex(/^\d+$/, "Masukkan nominal Rupiah utuh.")
    .transform((value) => BigInt(value))
    .refine((value) => value > BigInt(0), "Nominal harus lebih dari nol.")
    .refine(
      (value) => value <= POSTGRES_BIGINT_MAX,
      "Nominal terlalu besar.",
    ),
  description: z
    .string({ error: "Masukkan deskripsi transaksi." })
    .trim()
    .min(1, "Masukkan deskripsi transaksi.")
    .max(
      MAX_TRANSACTION_DESCRIPTION_LENGTH,
      `Deskripsi maksimal ${MAX_TRANSACTION_DESCRIPTION_LENGTH} karakter.`,
    ),
  transactionDate: z
    .string({ error: "Pilih tanggal yang valid." })
    .refine(isValidCalendarDate, "Pilih tanggal yang valid."),
  transactionTime: z
    .string()
    .regex(localTimePattern, "Pilih waktu yang valid.")
    .nullable()
    .optional()
    .transform((value) => value ?? null),
};

export const createTransactionInputSchema = z
  .object({
    ...transactionMutationShape,
    clientRequestId: z.uuid({ version: "v4", error: "Request ID tidak valid." }),
  })
  .strict();

export const updateTransactionInputSchema = z
  .object(transactionMutationShape)
  .strict();

export type ValidatedCreateTransactionInput = z.output<
  typeof createTransactionInputSchema
>;
export type ValidatedUpdateTransactionInput = z.output<
  typeof updateTransactionInputSchema
>;

const listTransactionsInputSchema = z
  .object({
    cursor: z.uuid({ error: "Cursor tidak valid." }).optional(),
    limit: z
      .union([z.string(), z.number()])
      .optional()
      .transform((value) => (value === undefined ? 20 : Number(value)))
      .refine(Number.isInteger, "Limit harus berupa bilangan bulat.")
      .refine(
        (value) => value >= 1 && value <= MAX_TRANSACTION_PAGE_SIZE,
        `Limit harus antara 1 dan ${MAX_TRANSACTION_PAGE_SIZE}.`,
      ),
    month: z
      .string()
      .regex(monthKeyPattern, "Bulan tidak valid.")
      .optional(),
    search: z
      .string()
      .trim()
      .max(
        MAX_TRANSACTION_SEARCH_LENGTH,
        `Pencarian maksimal ${MAX_TRANSACTION_SEARCH_LENGTH} karakter.`,
      )
      .optional()
      .transform((value) => value || undefined),
    type: z.enum(TRANSACTION_TYPES).optional(),
  })
  .strict();

const financeSnapshotInputSchema = z
  .object({
    month: z
      .string()
      .regex(monthKeyPattern, "Bulan tidak valid.")
      .optional(),
  })
  .strict();

export type ValidatedListTransactionsInput = z.output<
  typeof listTransactionsInputSchema
>;
export type ValidatedFinanceSnapshotInput = z.output<
  typeof financeSnapshotInputSchema
>;

function toContractResult<T>(result: z.ZodSafeParseResult<T>): ContractParseResult<T> {
  if (result.success) {
    return { success: true, data: result.data };
  }

  const fieldErrors: ContractFieldErrors = {};
  let formError: string | undefined;

  for (const issue of result.error.issues) {
    const field = issue.path[0];

    if (typeof field === "string" && !fieldErrors[field]) {
      fieldErrors[field] = issue.message;
    } else if (!formError) {
      formError = issue.message;
    }
  }

  return {
    success: false,
    fieldErrors,
    formError,
  };
}

export function parseCreateTransactionInput(
  input: unknown,
): ContractParseResult<ValidatedCreateTransactionInput> {
  return toContractResult(createTransactionInputSchema.safeParse(input));
}

export function parseUpdateTransactionInput(
  input: unknown,
): ContractParseResult<ValidatedUpdateTransactionInput> {
  return toContractResult(updateTransactionInputSchema.safeParse(input));
}

export function parseListTransactionsInput(
  input: unknown,
): ContractParseResult<ValidatedListTransactionsInput> {
  return toContractResult(listTransactionsInputSchema.safeParse(input));
}

export function parseFinanceSnapshotInput(
  input: unknown,
): ContractParseResult<ValidatedFinanceSnapshotInput> {
  return toContractResult(financeSnapshotInputSchema.safeParse(input));
}

export function parseMonthKey(
  input: unknown,
): ContractParseResult<string> {
  return toContractResult(
    z.string().regex(monthKeyPattern, "Bulan tidak valid.").safeParse(input),
  );
}

export function getMonthDateRange(monthKey: string) {
  const start = new Date(`${monthKey}-01T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);

  return { start, end };
}

export function getMonthKeyInTimeZone(
  date: Date,
  timeZone = "Asia/Jakarta",
) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    timeZone,
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;

  if (!year || !month) {
    throw new RangeError("Unable to derive the calendar month.");
  }

  return `${year}-${month}`;
}

export function getMillisecondsUntilNextJakartaMonth(date: Date) {
  const [year, month] = getMonthKeyInTimeZone(date).split("-").map(Number);
  const jakartaOffsetMilliseconds = 7 * 60 * 60 * 1_000;
  const nextMonthStart =
    Date.UTC(year, month, 1) - jakartaOffsetMilliseconds;

  return Math.max(0, nextMonthStart - date.getTime());
}

export function getDateKeyInTimeZone(
  date: Date,
  timeZone = "Asia/Jakarta",
) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone,
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new RangeError("Unable to derive the calendar date.");
  }

  return `${year}-${month}-${day}`;
}

export function isTransactionId(value: string) {
  return z.uuid().safeParse(value).success;
}
