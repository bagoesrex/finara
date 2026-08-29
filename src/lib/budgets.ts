import { z } from "zod";

import type { ContractParseResult } from "./transactions";

export const BUDGET_STATUSES = [
  "UNUSED",
  "ON_TRACK",
  "NEAR_LIMIT",
  "LIMIT_REACHED",
  "OVER",
] as const;

const POSTGRES_BIGINT_MAX = BigInt("9223372036854775807");
const monthKeyPattern = /^\d{4}-(0[1-9]|1[0-2])$/;
const unsignedMoneyPattern = /^\d+$/;
const signedMoneyPattern = /^-?\d+$/;

export type BudgetStatus = (typeof BUDGET_STATUSES)[number];

export const budgetDtoSchema = z
  .object({
    id: z.uuid(),
    categoryId: z.uuid(),
    categoryName: z.string(),
    monthKey: z.string().regex(monthKeyPattern),
    amount: z.string().regex(unsignedMoneyPattern),
    spentAmount: z.string().regex(unsignedMoneyPattern),
    remainingAmount: z.string().regex(signedMoneyPattern),
    progressBasisPoints: z.number().int().min(0).max(10_000),
    status: z.enum(BUDGET_STATUSES),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .strict();

export const budgetOverviewDtoSchema = z
  .object({
    monthKey: z.string().regex(monthKeyPattern),
    monthLabel: z.string(),
    allocatedAmount: z.string().regex(unsignedMoneyPattern),
    spentAmount: z.string().regex(unsignedMoneyPattern),
    remainingAmount: z.string().regex(signedMoneyPattern),
    progressBasisPoints: z.number().int().min(0).max(10_000),
    budgets: z.array(budgetDtoSchema),
  })
  .strict();

export type BudgetDto = z.output<typeof budgetDtoSchema>;
export type BudgetOverviewDto = z.output<typeof budgetOverviewDtoSchema>;

const amountSchema = z
  .string({ error: "Masukkan alokasi Rupiah utuh." })
  .trim()
  .regex(unsignedMoneyPattern, "Masukkan alokasi Rupiah utuh.")
  .transform((value) => BigInt(value))
  .refine((value) => value > BigInt(0), "Alokasi harus lebih dari nol.")
  .refine(
    (value) => value <= POSTGRES_BIGINT_MAX,
    "Alokasi terlalu besar.",
  );

const monthSchema = z
  .string({ error: "Pilih bulan yang valid." })
  .regex(monthKeyPattern, "Pilih bulan yang valid.");

const createBudgetInputSchema = z
  .object({
    amount: amountSchema,
    categoryId: z.uuid({ error: "Pilih kategori yang valid." }),
    month: monthSchema,
  })
  .strict();

const updateBudgetInputSchema = z
  .object({ amount: amountSchema })
  .strict();

const listBudgetsInputSchema = z
  .object({ month: monthSchema })
  .strict();

export type ValidatedCreateBudgetInput = z.output<
  typeof createBudgetInputSchema
>;
export type ValidatedUpdateBudgetInput = z.output<
  typeof updateBudgetInputSchema
>;

function toContractResult<T>(
  result: z.ZodSafeParseResult<T>,
): ContractParseResult<T> {
  if (result.success) return { success: true, data: result.data };

  const fieldErrors: Record<string, string> = {};
  let formError: string | undefined;

  for (const issue of result.error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !fieldErrors[field]) {
      fieldErrors[field] = issue.message;
    } else if (!formError) {
      formError = issue.message;
    }
  }

  return { success: false, fieldErrors, formError };
}

export function parseCreateBudgetInput(
  input: unknown,
): ContractParseResult<ValidatedCreateBudgetInput> {
  return toContractResult(createBudgetInputSchema.safeParse(input));
}

export function parseUpdateBudgetInput(
  input: unknown,
): ContractParseResult<ValidatedUpdateBudgetInput> {
  return toContractResult(updateBudgetInputSchema.safeParse(input));
}

export function parseListBudgetsInput(
  input: unknown,
): ContractParseResult<{ month: string }> {
  return toContractResult(listBudgetsInputSchema.safeParse(input));
}

export function isBudgetId(value: string) {
  return z.uuid().safeParse(value).success;
}
