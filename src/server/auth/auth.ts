import "server-only";

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

import { db } from "@/server/db/client";
import { authOptions } from "@/server/auth/options";

export const auth = betterAuth({
  ...authOptions,
  database: prismaAdapter(db, { provider: "postgresql" }),
});
