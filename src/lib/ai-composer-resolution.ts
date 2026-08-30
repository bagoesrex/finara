import type { AiComposerIntent, AiComposerResponse } from "./ai-composer";
import { resolveAiTransactionPreview } from "./ai-transaction";

export type AiFinanceReadIntent = Exclude<
  AiComposerIntent,
  { intent: "CREATE_TRANSACTION" | "UNSUPPORTED" }
>;

type FinanceReadResponse = Exclude<
  AiComposerResponse,
  { kind: "transaction_preview" }
>;

type ComposerReferenceContext = {
  accounts: Array<{ id: string; name: string }>;
  categories: Array<{
    id: string;
    name: string;
    type: "INCOME" | "EXPENSE";
  }>;
  referenceDate: string;
};

type FinanceReadExecutor = (
  intent: AiFinanceReadIntent,
) => Promise<FinanceReadResponse>;

export async function resolveAiComposerIntent(
  intent: AiComposerIntent,
  context: ComposerReferenceContext,
  executeFinanceRead: FinanceReadExecutor,
): Promise<AiComposerResponse> {
  switch (intent.intent) {
    case "CREATE_TRANSACTION":
      return {
        kind: "transaction_preview",
        preview: resolveAiTransactionPreview(intent, context),
      };
    case "GET_BALANCE":
    case "GET_SPENDING_SUMMARY":
    case "GET_BUDGET":
      return executeFinanceRead(intent);
    case "UNSUPPORTED":
      return {
        kind: "unsupported",
        message:
          "Saat ini Finara bisa mencatat transaksi dan menjawab ringkasan bulan ini.",
      };
  }
}
