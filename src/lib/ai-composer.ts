import { z } from "zod";

import {
  aiTransactionExtractionSchema,
  aiTransactionPreviewResponseSchema,
  MAX_AI_TRANSACTION_INPUT_LENGTH,
  parseAiTransactionInput,
} from "./ai-transaction";

export const MAX_AI_COMPOSER_INPUT_LENGTH = MAX_AI_TRANSACTION_INPUT_LENGTH;

const categoryHintSchema = z.string().trim().min(1).max(80).nullable();

export const aiComposerIntentSchema = z.discriminatedUnion("intent", [
  aiTransactionExtractionSchema,
  z.object({ intent: z.literal("GET_BALANCE") }).strict(),
  z
    .object({
      intent: z.literal("GET_SPENDING_SUMMARY"),
      transactionType: z.enum(["INCOME", "EXPENSE"]),
      categoryHint: categoryHintSchema,
      ranking: z.enum(["NONE", "TOP_CATEGORY"]),
    })
    .strict(),
  z
    .object({
      intent: z.literal("GET_BUDGET"),
      categoryHint: categoryHintSchema,
    })
    .strict(),
  z.object({ intent: z.literal("UNSUPPORTED") }).strict(),
]);

export type AiComposerIntent = z.output<typeof aiComposerIntentSchema>;

const aiFinanceAnswerSchema = z
  .object({
    kind: z.literal("finance_answer"),
    label: z.string().trim().min(1).max(80),
    value: z.string().trim().min(1).max(80),
    detail: z.string().trim().min(1).max(160).nullable(),
  })
  .strict();

export type AiFinanceAnswer = z.output<typeof aiFinanceAnswerSchema>;

export const aiComposerResponseSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("transaction_preview"),
      preview: aiTransactionPreviewResponseSchema,
    })
    .strict(),
  aiFinanceAnswerSchema,
  z
    .object({
      kind: z.literal("unsupported"),
      message: z.string().trim().min(1).max(160),
    })
    .strict(),
]);

export type AiComposerResponse = z.output<typeof aiComposerResponseSchema>;

export function parseAiComposerInput(input: unknown) {
  return parseAiTransactionInput(input);
}
