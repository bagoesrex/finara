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

export const db =
  globalForDatabase.finaraDatabase ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForDatabase.finaraDatabase = db;
}
