import "server-only";

import { cache } from "react";

import type { AccountType, FinanceAccount } from "@/lib/accounts";
import type { PrivateAppState, Viewer } from "@/lib/viewer";
import { getSessionViewer } from "@/server/auth/session";
import { db } from "@/server/db/client";

function toClientAccountType(type: "CASH" | "BANK" | "E_WALLET"): AccountType {
  return type === "E_WALLET" ? "EWALLET" : type;
}

function toSafeBalance(value: bigint): number {
  const balance = Number(value);

  if (!Number.isSafeInteger(balance) || balance < 0) {
    throw new RangeError("Stored opening balance is outside the client range.");
  }

  return balance;
}

async function getViewerAccounts(viewer: Viewer): Promise<FinanceAccount[]> {
  const accounts = await db.account.findMany({
    where: { userId: viewer.id },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      name: true,
      type: true,
      openingBalance: true,
    },
  });

  return accounts.map((account) => ({
    id: account.id,
    name: account.name,
    type: toClientAccountType(account.type),
    currentBalance: toSafeBalance(account.openingBalance),
  }));
}

export const getPrivateAppState = cache(async (): Promise<PrivateAppState> => {
  const viewer = await getSessionViewer();

  if (!viewer) {
    return { status: "signed-out" };
  }

  const accounts = await getViewerAccounts(viewer);

  if (accounts.length === 0) {
    return { status: "needs-onboarding", viewer };
  }

  return { status: "ready", viewer, accounts };
});
