import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not configured.");
}

const adapter = new PrismaPg({ connectionString });
const globalForDatabase = globalThis as unknown as {
  finaraDatabase: PrismaClient | undefined;
};

function supportsCurrentSchema(client: PrismaClient | undefined) {
  // A generated client can outlive a schema change in globalThis during next dev.
  return client !== undefined && "transaction" in client && "budget" in client;
}

export const db =
  (supportsCurrentSchema(globalForDatabase.finaraDatabase)
    ? globalForDatabase.finaraDatabase
    : undefined) ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForDatabase.finaraDatabase = db;
}
