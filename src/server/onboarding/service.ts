import "server-only";

import { Prisma } from "@/generated/prisma/client";
import type {
  OnboardingAccountType,
  ValidatedOnboardingInput,
} from "@/lib/onboarding";
import { db } from "@/server/db/client";

export const DEFAULT_CATEGORIES = [
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
] as const;

export type InitializeOnboardingResult =
  | { status: "created"; accountId: string }
  | { status: "already_initialized" };

const MAX_SERIALIZATION_ATTEMPTS = 3;

function toDatabaseAccountType(type: OnboardingAccountType) {
  return type === "EWALLET" ? "E_WALLET" : type;
}

function categoryKey(category: { name: string; type: string }) {
  return `${category.type}:${category.name}`;
}

function isSerializationConflict(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  );
}

export async function initializeOnboarding(
  userId: string,
  input: ValidatedOnboardingInput,
): Promise<InitializeOnboardingResult> {
  for (let attempt = 1; attempt <= MAX_SERIALIZATION_ATTEMPTS; attempt += 1) {
    try {
      return await db.$transaction(
        async (transaction) => {
          const existingAccount = await transaction.account.findFirst({
            where: { userId },
            select: { id: true },
          });

          if (existingAccount) {
            return { status: "already_initialized" };
          }

          const existingCategories = await transaction.category.findMany({
            where: { userId },
            select: { name: true, type: true },
          });
          const existingCategoryKeys = new Set(
            existingCategories.map(categoryKey),
          );
          const missingCategories = DEFAULT_CATEGORIES.filter(
            (category) => !existingCategoryKeys.has(categoryKey(category)),
          );

          const account = await transaction.account.create({
            data: {
              userId,
              name: input.accountName,
              type: toDatabaseAccountType(input.accountType),
              openingBalance: input.currentBalance,
            },
            select: { id: true },
          });

          if (missingCategories.length > 0) {
            await transaction.category.createMany({
              data: missingCategories.map((category) => ({
                userId,
                ...category,
              })),
            });
          }

          return { status: "created", accountId: account.id };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
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

  throw new Error("Onboarding transaction retries were exhausted.");
}
