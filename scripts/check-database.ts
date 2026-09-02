import { db } from "../src/server/db/client";

async function checkDatabase() {
  const configuredDatabase = new URL(process.env.DATABASE_URL ?? "").pathname
    .slice(1);
  const [result] = await db.$queryRaw<
    Array<{ database: string; connectionCheck: number }>
  >`SELECT current_database() AS database, 1 AS "connectionCheck"`;

  if (
    !configuredDatabase ||
    result?.database !== configuredDatabase ||
    result.connectionCheck !== 1
  ) {
    throw new Error("Database identity or query result did not match.");
  }
}

checkDatabase()
  .then(() => {
    console.info("Database connection verified.");
  })
  .finally(async () => {
    await db.$disconnect();
  })
  .catch(() => {
    console.error("Database connection check failed.");
    process.exitCode = 1;
  });
