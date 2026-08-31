import "server-only";

import { Prisma } from "@/generated/prisma/client";
import type {
  AccountRenameDto,
  ValidatedUpdateAccountInput,
} from "@/lib/accounts";
import { db } from "@/server/db/client";

const MAX_SERIALIZATION_ATTEMPTS = 3;

const renamedAccountSelect = {
  id: true,
  name: true,
  updatedAt: true,
} satisfies Prisma.AccountSelect;

type RenamedAccountRecord = Prisma.AccountGetPayload<{
  select: typeof renamedAccountSelect;
}>;

export class AccountNotFoundError extends Error {
  constructor() {
    super("Account not found.");
    this.name = "AccountNotFoundError";
  }
}

export class AccountNameConflictError extends Error {
  constructor() {
    super("Account name is already in use.");
    this.name = "AccountNameConflictError";
  }
}

function isSerializationConflict(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  );
}

function toAccountRenameDto(account: RenamedAccountRecord): AccountRenameDto {
  return {
    id: account.id,
    name: account.name,
    updatedAt: account.updatedAt.toISOString(),
  };
}

export async function renameAccount(
  userId: string,
  accountId: string,
  input: ValidatedUpdateAccountInput,
): Promise<AccountRenameDto> {
  for (let attempt = 1; attempt <= MAX_SERIALIZATION_ATTEMPTS; attempt += 1) {
    try {
      const renamed = await db.$transaction(
        async (transaction) => {
          const current = await transaction.account.findFirst({
            where: { id: accountId, userId },
            select: { id: true },
          });
          if (!current) throw new AccountNotFoundError();

          const duplicate = await transaction.account.findFirst({
            where: {
              id: { not: accountId },
              userId,
              name: { equals: input.name, mode: "insensitive" },
            },
            select: { id: true },
          });
          if (duplicate) throw new AccountNameConflictError();

          const result = await transaction.account.updateMany({
            where: { id: accountId, userId },
            data: { name: input.name },
          });
          if (result.count !== 1) throw new AccountNotFoundError();

          const account = await transaction.account.findFirst({
            where: { id: accountId, userId },
            select: renamedAccountSelect,
          });
          if (!account) throw new AccountNotFoundError();
          return account;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );

      return toAccountRenameDto(renamed);
    } catch (error) {
      if (
        isSerializationConflict(error) &&
        attempt < MAX_SERIALIZATION_ATTEMPTS
      ) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Account rename transaction retries were exhausted.");
}
