import { afterEach, describe, expect, it, vi } from "vitest";

import {
  fetchAiComposerResponse,
  fetchAiTransactionPreview,
} from "./ai-query";

const readyResponse = {
  status: "ready",
  draft: {
    accountId: "c56a4180-65aa-42ec-a945-5fd21dec0538",
    accountName: "BCA",
    categoryId: "8c3f8b9a-72e7-4aa4-8758-12ab74573d9f",
    categoryName: "Food & Drink",
    type: "EXPENSE",
    amount: "25000",
    description: "Makan ayam",
    transactionDate: "2026-08-30",
    transactionTime: null,
  },
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AI transaction preview request", () => {
  it("posts the input to the authenticated preview resource", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      Response.json({ data: readyResponse }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchAiTransactionPreview("makan ayam 25rb")).resolves.toEqual(
      readyResponse,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/ai/transaction-previews",
      expect.objectContaining({
        body: JSON.stringify({ text: "makan ayam 25rb" }),
        cache: "no-store",
        credentials: "same-origin",
        method: "POST",
      }),
    );
  });

  it("rejects a successful HTTP response with an invalid public contract", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ data: { status: "ready" } })),
    );

    await expect(fetchAiTransactionPreview("makan 25rb")).rejects.toThrow();
  });
});

describe("AI composer request", () => {
  it("posts questions to the authenticated composer resource", async () => {
    const answer = {
      kind: "finance_answer",
      label: "Saldo tersedia",
      value: "Rp500.000",
      detail: "Dari 1 akun.",
    };
    const fetchMock = vi.fn<typeof fetch>(async () =>
      Response.json({ data: answer }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchAiComposerResponse("saldo saya?")).resolves.toEqual(
      answer,
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/ai/composer-responses",
      expect.objectContaining({
        body: JSON.stringify({ text: "saldo saya?" }),
        cache: "no-store",
        credentials: "same-origin",
        method: "POST",
      }),
    );
  });

  it("rejects extra financial data outside the public composer contract", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          data: {
            kind: "finance_answer",
            label: "Saldo tersedia",
            value: "Rp500.000",
            detail: null,
            transactions: [],
          },
        }),
      ),
    );

    await expect(fetchAiComposerResponse("saldo saya?")).rejects.toThrow();
  });
});
