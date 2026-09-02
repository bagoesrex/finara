import { beforeEach, describe, expect, it, mock, vi } from "bun:test";

const mocks = {
  consumeQuota: vi.fn(),
  executeFinanceRead: vi.fn(),
  findAccounts: vi.fn(),
  findCategories: vi.fn(),
  requestStructuredJson: vi.fn(),
  transaction: vi.fn(async (queries: Array<Promise<unknown>>) =>
    Promise.all(queries),
  ),
};

mock.module("server-only", () => ({}));
mock.module("@/server/ai/config", () => ({
  getNvidiaConfig: () => ({ apiKey: "server-key", model: "nvidia/model" }),
}));
mock.module("@/server/db/client", () => ({
  db: {
    account: { findMany: mocks.findAccounts },
    category: { findMany: mocks.findCategories },
    $transaction: mocks.transaction,
  },
}));
mock.module("@/server/ai/finance-tools", () => ({
  executeFinanceReadIntent: mocks.executeFinanceRead,
}));
mock.module("@/server/ai/nvidia-client", () => ({
  requestNvidiaStructuredJson: mocks.requestStructuredJson,
}));
mock.module("@/server/ai/rate-limit", () => ({
  consumeAiPreviewQuota: mocks.consumeQuota,
}));

const { createAiComposerResponse } = await import("./composer-response");

const now = new Date("2026-08-30T10:00:00.000Z");
const financeAnswer = {
  kind: "finance_answer" as const,
  label: "Saldo tersedia",
  value: "Rp500.000",
  detail: "Dari 1 akun.",
};

beforeEach(() => {
  mock.clearAllMocks();
  mocks.findAccounts.mockResolvedValue([{ id: "account-1", name: "BCA" }]);
  mocks.findCategories.mockResolvedValue([
    { id: "category-1", name: "Food & Drink", type: "EXPENSE" },
  ]);
  mocks.consumeQuota.mockResolvedValue(undefined);
  mocks.executeFinanceRead.mockResolvedValue(financeAnswer);
});

describe("AI composer response service", () => {
  it("routes once, after quota, then executes a user-scoped read tool", async () => {
    mocks.requestStructuredJson.mockResolvedValue({ intent: "GET_BALANCE" });

    await expect(
      createAiComposerResponse("user-1", "saldo saya?", now),
    ).resolves.toEqual(financeAnswer);

    expect(mocks.findAccounts).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-1" } }),
    );
    expect(mocks.findCategories).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-1" } }),
    );
    expect(mocks.consumeQuota).toHaveBeenCalledTimes(1);
    expect(mocks.consumeQuota).toHaveBeenCalledWith("user-1");
    expect(mocks.requestStructuredJson).toHaveBeenCalledTimes(1);
    expect(mocks.consumeQuota.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.requestStructuredJson.mock.invocationCallOrder[0],
    );
    expect(mocks.executeFinanceRead).toHaveBeenCalledTimes(1);
    expect(mocks.executeFinanceRead).toHaveBeenCalledWith(
      "user-1",
      { intent: "GET_BALANCE" },
      now,
    );

    const providerRequest = mocks.requestStructuredJson.mock.calls[0][0];
    expect(providerRequest).toMatchObject({
      apiKey: "server-key",
      maxTokens: 384,
      model: "nvidia/model",
    });
    expect(providerRequest.userPrompt).toContain('"text":"saldo saya?"');
    expect(JSON.stringify(providerRequest)).not.toContain("user-1");
    expect(JSON.stringify(providerRequest)).not.toContain("account-1");
    expect(JSON.stringify(providerRequest)).not.toContain("category-1");
    expect(JSON.stringify(providerRequest)).not.toContain("Rp500.000");
  });

  it("keeps transaction creation behind the existing preview contract", async () => {
    mocks.requestStructuredJson.mockResolvedValue({
      intent: "CREATE_TRANSACTION",
      type: "EXPENSE",
      amount: "25000",
      description: "Makan ayam",
      categoryHint: "Food & Drink",
      transactionDate: "2026-08-30",
      transactionTime: null,
      missingFields: [],
    });

    await expect(
      createAiComposerResponse("user-1", "makan ayam 25rb", now),
    ).resolves.toMatchObject({
      kind: "transaction_preview",
      preview: { status: "ready", draft: { amount: "25000" } },
    });
    expect(mocks.executeFinanceRead).not.toHaveBeenCalled();
  });

  it("does not contact NVIDIA when the shared quota rejects the request", async () => {
    mocks.consumeQuota.mockRejectedValue(new Error("rate limited"));

    await expect(
      createAiComposerResponse("user-1", "saldo saya?", now),
    ).rejects.toThrow("rate limited");
    expect(mocks.requestStructuredJson).not.toHaveBeenCalled();
    expect(mocks.executeFinanceRead).not.toHaveBeenCalled();
  });
});
