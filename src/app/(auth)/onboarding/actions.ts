"use server";

import { revalidatePath } from "next/cache";
import { redirect, RedirectType } from "next/navigation";

import {
  parseOnboardingInput,
  type OnboardingFieldErrors,
} from "@/lib/onboarding";
import { getSessionViewer } from "@/server/auth/session";
import { initializeOnboarding } from "@/server/onboarding/service";

export type OnboardingActionState = {
  status: "idle" | "error";
  revision: number;
  message?: string;
  fieldErrors?: OnboardingFieldErrors;
};

export async function completeOnboardingAction(
  previousState: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  const revision =
    Number.isSafeInteger(previousState.revision) &&
    previousState.revision >= 0 &&
    previousState.revision < Number.MAX_SAFE_INTEGER
      ? previousState.revision + 1
      : 1;
  const viewer = await getSessionViewer();

  if (!viewer) {
    return {
      status: "error",
      revision,
      message: "Sesi kamu sudah berakhir. Masuk lagi untuk melanjutkan.",
    };
  }

  const parsedInput = parseOnboardingInput({
    accountName: formData.get("accountName"),
    accountType: formData.get("accountType"),
    currentBalance: formData.get("currentBalance"),
  });

  if (!parsedInput.success) {
    return {
      status: "error",
      revision,
      fieldErrors: parsedInput.fieldErrors,
    };
  }

  try {
    await initializeOnboarding(viewer.id, parsedInput.data);
  } catch {
    return {
      status: "error",
      revision,
      message: "Akun belum berhasil disimpan. Coba lagi.",
    };
  }

  revalidatePath("/", "layout");
  redirect("/", RedirectType.replace);
}
