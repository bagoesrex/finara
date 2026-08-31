import {
  MutationObserver,
  QueryClient,
  QueryObserver,
} from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import type { AccountRenameDto } from "./accounts";
import {
  accountRenameMutationOptions,
  invalidateAccountRenameResources,
  toUpdateAccountPayload,
} from "./account-query";
import { financeQueryKeys } from "./finance-query";

const accountId = "550e8400-e29b-41d4-a716-446655440000";
const transactionId = "8c3f8b9a-72e7-4aa4-8758-12ab74573d9f";
const renamedAccount: AccountRenameDto = {
  id: accountId,
  name: "Dana utama",
  updatedAt: "2026-08-31T08:00:00.000Z",
};

describe("account rename query boundary", () => {
  it("serializes only the normalized account name", () => {
    expect(
      toUpdateAccountPayload({
        id: accountId,
        name: "  Dana utama  ",
      }),
    ).toEqual({ name: "Dana utama" });
  });
});

describe("account rename query invalidation", () => {
  it("invalidates account-bearing resources without touching Budget", async () => {
    const queryClient = new QueryClient();
    const snapshotKey = financeQueryKeys.snapshot("user-a", "2026-08");
    const listKey = financeQueryKeys.transactionList("user-a", {});
    const detailKey = financeQueryKeys.transactionDetail(
      "user-a",
      transactionId,
    );
    const budgetKey = financeQueryKeys.budgetOverview("user-a", "2026-08");
    queryClient.setQueryData(snapshotKey, {});
    queryClient.setQueryData(listKey, {});
    queryClient.setQueryData(detailKey, {});
    queryClient.setQueryData(budgetKey, {});

    await invalidateAccountRenameResources(queryClient, {
      monthKey: "2026-08",
      viewerId: "user-a",
    });

    expect(queryClient.getQueryState(snapshotKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(listKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(detailKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(budgetKey)?.isInvalidated).toBe(false);
  });

  it("keeps the mutation pending until active projections refetch", async () => {
    const queryClient = new QueryClient();
    const snapshotKey = financeQueryKeys.snapshot("user-a", "2026-08");
    queryClient.setQueryData(snapshotKey, {});

    let resolveRefetch!: (value: object) => void;
    const refetch = new Promise<object>((resolve) => {
      resolveRefetch = resolve;
    });
    const queryObserver = new QueryObserver(queryClient, {
      queryKey: snapshotKey,
      queryFn: () => refetch,
      staleTime: Number.POSITIVE_INFINITY,
    });
    const unsubscribe = queryObserver.subscribe(() => undefined);
    const mutationObserver = new MutationObserver(
      queryClient,
      accountRenameMutationOptions(
        async () => renamedAccount,
        () =>
          invalidateAccountRenameResources(queryClient, {
            monthKey: "2026-08",
            viewerId: "user-a",
          }),
      ),
    );
    let settled = false;
    const mutation = mutationObserver
      .mutate({ id: accountId, name: "Dana utama" })
      .then(() => {
        settled = true;
      });

    await Promise.resolve();
    await Promise.resolve();
    expect(settled).toBe(false);

    resolveRefetch({});
    await mutation;
    expect(settled).toBe(true);
    unsubscribe();
  });

  it("rejects the mutation when an active projection refetch fails", async () => {
    const queryClient = new QueryClient();
    const snapshotKey = financeQueryKeys.snapshot("user-a", "2026-08");
    queryClient.setQueryData(snapshotKey, {});
    const queryObserver = new QueryObserver(queryClient, {
      queryKey: snapshotKey,
      queryFn: async () => {
        throw new Error("Snapshot refetch failed");
      },
      retry: false,
      staleTime: Number.POSITIVE_INFINITY,
    });
    const unsubscribe = queryObserver.subscribe(() => undefined);

    await expect(
      invalidateAccountRenameResources(queryClient, {
        monthKey: "2026-08",
        viewerId: "user-a",
      }),
    ).rejects.toThrow("Snapshot refetch failed");
    unsubscribe();
  });
});
