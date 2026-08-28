import { z } from "zod";

export const ONBOARDING_ACCOUNT_TYPES = ["CASH", "BANK", "EWALLET"] as const;

export type OnboardingAccountType = (typeof ONBOARDING_ACCOUNT_TYPES)[number];

export type OnboardingField =
  | "accountName"
  | "accountType"
  | "currentBalance";

export type OnboardingFieldErrors = Partial<Record<OnboardingField, string>>;

const maximumSafeBalance = BigInt(Number.MAX_SAFE_INTEGER);

export const onboardingInputSchema = z.object({
  accountName: z
    .string({ error: "Masukkan nama akun." })
    .trim()
    .min(1, "Masukkan nama akun.")
    .max(40, "Nama akun maksimal 40 karakter."),
  accountType: z.enum(ONBOARDING_ACCOUNT_TYPES, {
    error: "Pilih jenis akun yang tersedia.",
  }),
  currentBalance: z
    .string({
      error: "Saldo harus berupa Rupiah utuh dan tidak negatif.",
    })
    .trim()
    .transform((value, context) => {
      if (!/^\d+$/.test(value)) {
        context.addIssue({
          code: "custom",
          message: "Saldo harus berupa Rupiah utuh dan tidak negatif.",
        });
        return z.NEVER;
      }

      return BigInt(value);
    })
    .refine((value) => value <= maximumSafeBalance, {
      message: "Saldo terlalu besar.",
    }),
});

export type OnboardingInput = z.input<typeof onboardingInputSchema>;
export type ValidatedOnboardingInput = z.output<typeof onboardingInputSchema>;

export type OnboardingParseResult =
  | { success: true; data: ValidatedOnboardingInput }
  | { success: false; fieldErrors: OnboardingFieldErrors };

export function parseOnboardingInput(input: unknown): OnboardingParseResult {
  const result = onboardingInputSchema.safeParse(input);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const flattenedErrors = result.error.flatten().fieldErrors;
  const fieldErrors: OnboardingFieldErrors = {};

  for (const field of [
    "accountName",
    "accountType",
    "currentBalance",
  ] as const) {
    const message = flattenedErrors[field]?.[0];
    if (message) {
      fieldErrors[field] = message;
    }
  }

  return { success: false, fieldErrors };
}
