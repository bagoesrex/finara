import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import {
  prototypeFinanceQueryKey,
  updatePrototypeFinanceQueryData,
  type PrototypeFinanceState,
} from "./prototype-finance-query";

const firstSessionState: PrototypeFinanceState = {
  accounts: [],
  budgets: [],
  summary: {
    available: 0,
    incomeThisMonth: 0,
    monthKey: "2026-08",
    monthLabel: "Agustus 2026",
    spentThisMonth: 0,
  },
  transactions: [],
};

describe("prototype finance query contract", () => {
  it("creates stable finance keys isolated by session identity", () => {
    expect(prototypeFinanceQueryKey("user-a")).toEqual([
      "finance",
      "prototype",
      "user-a",
    ]);
    expect(prototypeFinanceQueryKey("user-a")).not.toEqual(
      prototypeFinanceQueryKey("user-b"),
    );
  });

  it("updates only the selected session cache", () => {
    const queryClient = new QueryClient();
    const secondSessionState = {
      ...firstSessionState,
      summary: { ...firstSessionState.summary, available: 200_000 },
    };

    queryClient.setQueryData(
      prototypeFinanceQueryKey("user-a"),
      firstSessionState,
    );
    queryClient.setQueryData(
      prototypeFinanceQueryKey("user-b"),
      secondSessionState,
    );

    updatePrototypeFinanceQueryData(queryClient, "user-a", (current) => ({
      ...current,
      summary: { ...current.summary, available: 100_000 },
    }));

    expect(
      queryClient.getQueryData<PrototypeFinanceState>(
        prototypeFinanceQueryKey("user-a"),
      )?.summary.available,
    ).toBe(100_000);
    expect(
      queryClient.getQueryData<PrototypeFinanceState>(
        prototypeFinanceQueryKey("user-b"),
      ),
    ).toEqual(secondSessionState);
  });

  it("rejects a cache update before the session state is initialized", () => {
    const queryClient = new QueryClient();

    expect(() =>
      updatePrototypeFinanceQueryData(queryClient, "missing", (state) => state),
    ).toThrow("Prototype finance query is not initialized");
  });
});
