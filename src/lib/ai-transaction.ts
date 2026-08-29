import { z } from "zod";

import type { ContractParseResult, TransactionType } from "./transactions";
import {
  MAX_TRANSACTION_DESCRIPTION_LENGTH,
  TRANSACTION_TYPES,
} from "./transactions";

export const MAX_AI_TRANSACTION_INPUT_LENGTH = 280;

const POSTGRES_BIGINT_MAX = BigInt("9223372036854775807");
const calendarDatePattern = /^\d{4}-\d{2}-\d{2}$/;
const localTimePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const extractionMissingFields = ["type", "amount", "description"] as const;
const previewMissingFields = [
  ...extractionMissingFields,
  "account",
  "category",
] as const;

function isValidCalendarDate(value: string) {
  if (!calendarDatePattern.test(value)) return false;

  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

const positiveIdrStringSchema = z
  .string()
  .refine(
    (value) =>
      /^[1-9]\d*$/.test(value) && BigInt(value) <= POSTGRES_BIGINT_MAX,
  );

export const aiTransactionInputSchema = z
  .object({
    text: z
      .string({ error: "Tulis transaksi yang ingin dicatat." })
      .trim()
      .min(1, "Tulis transaksi yang ingin dicatat.")
      .max(
        MAX_AI_TRANSACTION_INPUT_LENGTH,
        `Teks maksimal ${MAX_AI_TRANSACTION_INPUT_LENGTH} karakter.`,
      ),
  })
  .strict();

export type AiTransactionInput = z.output<typeof aiTransactionInputSchema>;

export const aiTransactionExtractionSchema = z
  .object({
    intent: z.literal("CREATE_TRANSACTION"),
    type: z.enum(TRANSACTION_TYPES).nullable(),
    amount: positiveIdrStringSchema.nullable(),
    description: z
      .string()
      .trim()
      .min(1)
      .max(MAX_TRANSACTION_DESCRIPTION_LENGTH)
      .nullable(),
    categoryHint: z.string().trim().min(1).max(80).nullable(),
    transactionDate: z
      .string()
      .refine(isValidCalendarDate)
      .nullable(),
    transactionTime: z.string().regex(localTimePattern).nullable(),
    missingFields: z.array(z.enum(extractionMissingFields)).max(3),
  })
  .strict();

export type AiTransactionExtraction = z.output<
  typeof aiTransactionExtractionSchema
>;

const aiTransactionDraftSchema = z
  .object({
    accountId: z.uuid(),
    accountName: z.string().min(1),
    categoryId: z.uuid(),
    categoryName: z.string().min(1),
    type: z.enum(TRANSACTION_TYPES),
    amount: positiveIdrStringSchema,
    description: z.string().min(1).max(MAX_TRANSACTION_DESCRIPTION_LENGTH),
    transactionDate: z.string().refine(isValidCalendarDate),
    transactionTime: z.string().regex(localTimePattern).nullable(),
  })
  .strict();

const aiTransactionNeedsInputSchema = z
  .object({
    status: z.literal("needs_input"),
    message: z.string().min(1).max(160),
    missingFields: z.array(z.enum(previewMissingFields)).min(1).max(5),
  })
  .strict();

export const aiTransactionPreviewResponseSchema = z.discriminatedUnion(
  "status",
  [
    z
      .object({
        status: z.literal("ready"),
        draft: aiTransactionDraftSchema,
      })
      .strict(),
    aiTransactionNeedsInputSchema,
  ],
);

export type AiTransactionPreviewResponse = z.output<
  typeof aiTransactionPreviewResponseSchema
>;

type TransactionReferenceContext = {
  accounts: Array<{ id: string; name: string }>;
  categories: Array<{
    id: string;
    name: string;
    type: TransactionType;
  }>;
  referenceDate: string;
};

function toContractResult<T>(
  result: z.ZodSafeParseResult<T>,
): ContractParseResult<T> {
  if (result.success) return result;

  const fieldErrors: Record<string, string> = {};
  let formError: string | undefined;
  for (const issue of result.error.issues) {
    const field = issue.path[0];
    if (typeof field === "string") {
      fieldErrors[field] ??= issue.message;
    } else {
      formError ??= issue.message;
    }
  }
  return {
    success: false,
    fieldErrors,
    ...(formError ? { formError } : {}),
  };
}

export function parseAiTransactionInput(
  input: unknown,
): ContractParseResult<AiTransactionInput> {
  return toContractResult(aiTransactionInputSchema.safeParse(input));
}

function correctionFor(
  missingFields: Array<(typeof previewMissingFields)[number]>,
) {
  if (missingFields.includes("amount")) {
    return "Tambahkan nominal, misalnya 25rb.";
  }
  if (missingFields.includes("type")) {
    return "Sebutkan apakah ini pemasukan atau pengeluaran.";
  }
  if (missingFields.includes("description")) {
    return "Tambahkan keterangan singkat transaksi.";
  }
  if (missingFields.includes("account")) {
    return "Tambahkan akun terlebih dahulu sebelum mencatat transaksi.";
  }
  return "Kategori yang sesuai belum tersedia.";
}

export function resolveAiTransactionPreview(
  extraction: AiTransactionExtraction,
  context: TransactionReferenceContext,
): AiTransactionPreviewResponse {
  const missingFields = new Set<(typeof previewMissingFields)[number]>(
    extraction.missingFields,
  );
  if (!extraction.type) missingFields.add("type");
  if (!extraction.amount) missingFields.add("amount");
  if (!extraction.description) missingFields.add("description");

  const account = context.accounts[0];
  if (!account) missingFields.add("account");

  const compatibleCategories = extraction.type
    ? context.categories.filter(({ type }) => type === extraction.type)
    : [];
  const categoryHint = extraction.categoryHint?.toLocaleLowerCase("en-US");
  const category =
    compatibleCategories.find(
      ({ name }) => name.toLocaleLowerCase("en-US") === categoryHint,
    ) ??
    compatibleCategories.find(
      ({ name }) => name.toLocaleLowerCase("en-US") === "other",
    ) ??
    compatibleCategories[0];
  if (extraction.type && !category) missingFields.add("category");

  if (
    extraction.amount &&
    !Number.isSafeInteger(Number(extraction.amount))
  ) {
    missingFields.add("amount");
  }

  const orderedMissingFields = previewMissingFields.filter((field) =>
    missingFields.has(field),
  );
  if (orderedMissingFields.length > 0) {
    return {
      status: "needs_input",
      message: correctionFor(orderedMissingFields),
      missingFields: orderedMissingFields,
    };
  }

  return {
    status: "ready",
    draft: {
      accountId: account!.id,
      accountName: account!.name,
      categoryId: category!.id,
      categoryName: category!.name,
      type: extraction.type!,
      amount: extraction.amount!,
      description: extraction.description!,
      transactionDate: extraction.transactionDate ?? context.referenceDate,
      transactionTime: extraction.transactionTime,
    },
  };
}

export function adaptAiTransactionPreview(
  response: AiTransactionPreviewResponse,
) {
  if (response.status !== "ready") {
    throw new TypeError("AI transaction preview is not ready.");
  }

  const amount = Number(response.draft.amount);
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new RangeError("AI transaction amount is outside the safe client range.");
  }

  return {
    account: response.draft.accountName,
    accountId: response.draft.accountId,
    amount,
    category: response.draft.categoryName,
    categoryId: response.draft.categoryId,
    date: response.draft.transactionDate,
    description: response.draft.description,
    time: response.draft.transactionTime ?? "",
    type: response.draft.type,
  };
}
