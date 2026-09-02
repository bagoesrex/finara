import { describe, expect, it } from "bun:test";

import type { AiComposerIntent } from "@/lib/ai-composer";
import {
  evaluateTransactionCase,
  transactionEvaluationDatasetV1,
} from "./transaction-evaluation";

const validIntent = {
  intent: "CREATE_TRANSACTION",
  type: "EXPENSE",
  amount: "22000",
  description: "Grab",
  categoryHint: "Transport",
  transactionDate: "2026-08-30",
  transactionTime: "08:00",
  missingFields: [],
} satisfies AiComposerIntent;

describe("transaction parsing evaluation", () => {
  it("versions every transaction phrase required by the PRD", () => {
    expect(transactionEvaluationDatasetV1.version).toBe("1.0.0");
    expect(transactionEvaluationDatasetV1.referenceDate).toBe("2026-08-30");
    expect(
      transactionEvaluationDatasetV1.cases.map(({ text }) => text),
    ).toEqual([
      "makan 25rb",
      "gaji masuk 5jt",
      "kemarin beli bensin 50 ribu",
      "bayar wifi 350k",
      "grab 22rb tadi pagi",
    ]);

    const ids = transactionEvaluationDatasetV1.cases.map(({ id }) => id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("accepts the expected fields and a time inside the documented morning window", () => {
    const grabCase = transactionEvaluationDatasetV1.cases.find(
      ({ id }) => id === "prd-grab-morning",
    );
    expect(grabCase).toBeDefined();

    expect(evaluateTransactionCase(grabCase!, validIntent)).toEqual([]);
  });

  it("reports each persisted-field mismatch without requiring an exact description", () => {
    const grabCase = transactionEvaluationDatasetV1.cases.find(
      ({ id }) => id === "prd-grab-morning",
    );
    expect(grabCase).toBeDefined();
    const mismatchedIntent = {
      intent: "CREATE_TRANSACTION",
      type: "INCOME",
      amount: "2200",
      description: "Ride",
      categoryHint: "Salary",
      transactionDate: "2026-08-29",
      transactionTime: null,
      missingFields: ["description"],
    } satisfies AiComposerIntent;

    expect(
      evaluateTransactionCase(grabCase!, mismatchedIntent).map(
        ({ field }) => field,
      ),
    ).toEqual([
      "type",
      "amount",
      "description",
      "categoryHint",
      "transactionDate",
      "transactionTime",
      "missingFields",
    ]);
  });

  it("reports a non-transaction route as an intent mismatch", () => {
    expect(
      evaluateTransactionCase(
        transactionEvaluationDatasetV1.cases[0],
        { intent: "UNSUPPORTED" },
      ),
    ).toEqual([
      {
        field: "intent",
        expected: "CREATE_TRANSACTION",
        actual: "UNSUPPORTED",
      },
    ]);
  });

  it("rejects an invented time when the phrase has no time cue", () => {
    const foodCase = transactionEvaluationDatasetV1.cases.find(
      ({ id }) => id === "prd-food-shorthand",
    );
    expect(foodCase).toBeDefined();
    const inventedTimeIntent = {
      ...validIntent,
      amount: "25000",
      description: "Makan",
      categoryHint: "Food & Drink",
    } satisfies AiComposerIntent;

    expect(evaluateTransactionCase(foodCase!, inventedTimeIntent)).toContainEqual(
      {
        field: "transactionTime",
        expected: "null",
        actual: "08:00",
      },
    );
  });
});
