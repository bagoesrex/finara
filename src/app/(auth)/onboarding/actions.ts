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
  message?: string;
  fieldErrors?: OnboardingFieldErrors;
};

export const initialOnboardingActionState: OnboardingActionState = {
  status: "idle",
};

export async function completeOnboardingAction(
  _previousState: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  const viewer = await getSessionViewer();

  if (!viewer) {
    return {
      status: "error",
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
      fieldErrors: parsedInput.fieldErrors,
    };
  }

  try {
    await initializeOnboarding(viewer.id, parsedInput.data);
  } catch {
    return {
      status: "error",
      message: "Akun belum berhasil disimpan. Coba lagi.",
    };
  }

  revalidatePath("/", "layout");
  redirect("/", RedirectType.replace);
}
