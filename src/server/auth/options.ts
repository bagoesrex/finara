import type { BetterAuthOptions } from "better-auth";
import { z } from "zod";

const authEnvironment = z
  .object({
    BETTER_AUTH_SECRET: z.string().min(32).optional(),
    BETTER_AUTH_TRUSTED_IP_HEADER: z
      .string()
      .regex(/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/)
      .transform((header) => header.toLowerCase())
      .optional(),
    BETTER_AUTH_URL: z.url({ protocol: /^https?$/ }).optional(),
  })
  .parse({
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_TRUSTED_IP_HEADER:
      process.env.BETTER_AUTH_TRUSTED_IP_HEADER,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
  });

export const authOptions = {
  appName: "Finara",
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  user: {
    modelName: "User",
  },
  account: {
    modelName: "AuthIdentity",
  },
  session: {
    modelName: "AuthSession",
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: false },
  },
  verification: {
    modelName: "AuthVerification",
    storeIdentifier: "hashed",
  },
  rateLimit: {
    enabled: true,
    storage: "database",
    modelName: "AuthRateLimit",
    customRules: {
      "/sign-up/email": { window: 60, max: 3 },
    },
  },
  advanced: {
    database: { generateId: "uuid" },
    ...(authEnvironment.BETTER_AUTH_TRUSTED_IP_HEADER
      ? {
          ipAddress: {
            ipAddressHeaders: [authEnvironment.BETTER_AUTH_TRUSTED_IP_HEADER],
          },
        }
      : {}),
  },
  telemetry: { enabled: false },
  ...(authEnvironment.BETTER_AUTH_URL
    ? {
        baseURL: authEnvironment.BETTER_AUTH_URL,
        trustedOrigins: [authEnvironment.BETTER_AUTH_URL],
      }
    : {}),
} satisfies BetterAuthOptions;
