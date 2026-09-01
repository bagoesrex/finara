import type { AiComposerIntent } from "@/lib/ai-composer";

type ExpectedTransactionTime =
  | null
  | { startInclusive: string; endInclusive: string };

type TransactionEvaluationCase = {
  id: string;
  text: string;
  expected: {
    type: "INCOME" | "EXPENSE";
    amount: string;
    descriptionIncludes: readonly string[];
    categoryHint: string;
    transactionDate: string;
    transactionTime: ExpectedTransactionTime;
  };
};

type TransactionEvaluationDataset = {
  version: string;
  referenceDate: string;
  currentMonth: string;
  categories: ReadonlyArray<{
    name: string;
    type: "INCOME" | "EXPENSE";
  }>;
  cases: readonly TransactionEvaluationCase[];
};

export type TransactionEvaluationFinding = {
  field:
    | "intent"
    | "type"
    | "amount"
    | "description"
    | "categoryHint"
    | "transactionDate"
    | "transactionTime"
    | "missingFields";
  expected: string;
  actual: string;
};

export const transactionEvaluationDatasetV1 = {
  version: "1.0.0",
  referenceDate: "2026-08-30",
  currentMonth: "2026-08",
  categories: [
    { name: "Food & Drink", type: "EXPENSE" },
    { name: "Transport", type: "EXPENSE" },
    { name: "Shopping", type: "EXPENSE" },
    { name: "Bills", type: "EXPENSE" },
    { name: "Entertainment", type: "EXPENSE" },
    { name: "Health", type: "EXPENSE" },
    { name: "Education", type: "EXPENSE" },
    { name: "Other", type: "EXPENSE" },
    { name: "Salary", type: "INCOME" },
    { name: "Freelance", type: "INCOME" },
    { name: "Business", type: "INCOME" },
    { name: "Gift", type: "INCOME" },
    { name: "Other", type: "INCOME" },
  ],
  cases: [
    {
      id: "prd-food-shorthand",
      text: "makan 25rb",
      expected: {
        type: "EXPENSE",
        amount: "25000",
        descriptionIncludes: ["makan"],
        categoryHint: "Food & Drink",
        transactionDate: "2026-08-30",
        transactionTime: null,
      },
    },
    {
      id: "prd-salary-millions",
      text: "gaji masuk 5jt",
      expected: {
        type: "INCOME",
        amount: "5000000",
        descriptionIncludes: ["gaji"],
        categoryHint: "Salary",
        transactionDate: "2026-08-30",
        transactionTime: null,
      },
    },
    {
      id: "prd-fuel-yesterday",
      text: "kemarin beli bensin 50 ribu",
      expected: {
        type: "EXPENSE",
        amount: "50000",
        descriptionIncludes: ["bensin"],
        categoryHint: "Transport",
        transactionDate: "2026-08-29",
        transactionTime: null,
      },
    },
    {
      id: "prd-wifi-thousands",
      text: "bayar wifi 350k",
      expected: {
        type: "EXPENSE",
        amount: "350000",
        descriptionIncludes: ["wifi"],
        categoryHint: "Bills",
        transactionDate: "2026-08-30",
        transactionTime: null,
      },
    },
    {
      id: "prd-grab-morning",
      text: "grab 22rb tadi pagi",
      expected: {
        type: "EXPENSE",
        amount: "22000",
        descriptionIncludes: ["grab"],
        categoryHint: "Transport",
        transactionDate: "2026-08-30",
        transactionTime: {
          startInclusive: "05:00",
          endInclusive: "11:59",
        },
      },
    },
  ],
} as const satisfies TransactionEvaluationDataset;

function displayValue(value: string | null) {
  return value ?? "null";
}

export function evaluateTransactionCase(
  evaluationCase: TransactionEvaluationCase,
  intent: AiComposerIntent,
): TransactionEvaluationFinding[] {
  if (intent.intent !== "CREATE_TRANSACTION") {
    return [
      {
        field: "intent",
        expected: "CREATE_TRANSACTION",
        actual: intent.intent,
      },
    ];
  }

  const findings: TransactionEvaluationFinding[] = [];
  const expected = evaluationCase.expected;
  const compare = (
    field: TransactionEvaluationFinding["field"],
    expectedValue: string,
    actualValue: string | null,
  ) => {
    if (actualValue !== expectedValue) {
      findings.push({
        field,
        expected: expectedValue,
        actual: displayValue(actualValue),
      });
    }
  };

  compare("type", expected.type, intent.type);
  compare("amount", expected.amount, intent.amount);

  const normalizedDescription = intent.description?.toLocaleLowerCase("id-ID");
  if (
    !normalizedDescription ||
    expected.descriptionIncludes.some(
      (term) => !normalizedDescription.includes(term.toLocaleLowerCase("id-ID")),
    )
  ) {
    findings.push({
      field: "description",
      expected: `contains ${expected.descriptionIncludes.join(", ")}`,
      actual: displayValue(intent.description),
    });
  }

  compare("categoryHint", expected.categoryHint, intent.categoryHint);
  compare(
    "transactionDate",
    expected.transactionDate,
    intent.transactionDate,
  );

  if (expected.transactionTime === null) {
    if (intent.transactionTime !== null) {
      findings.push({
        field: "transactionTime",
        expected: "null",
        actual: intent.transactionTime,
      });
    }
  } else if (
    !intent.transactionTime ||
    intent.transactionTime < expected.transactionTime.startInclusive ||
    intent.transactionTime > expected.transactionTime.endInclusive
  ) {
    findings.push({
      field: "transactionTime",
      expected: `${expected.transactionTime.startInclusive}-${expected.transactionTime.endInclusive}`,
      actual: displayValue(intent.transactionTime),
    });
  }

  if (intent.missingFields.length > 0) {
    findings.push({
      field: "missingFields",
      expected: "[]",
      actual: JSON.stringify(intent.missingFields),
    });
  }

  return findings;
}
