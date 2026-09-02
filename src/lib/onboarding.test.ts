import { describe, expect, it } from "bun:test";
import { parseOnboardingInput } from "./onboarding";

describe("onboarding input contract", () => {
  it("normalizes a first-account snapshot without losing Rupiah precision", () => {
    expect(
      parseOnboardingInput({
        accountName: "  BCA Utama  ",
        accountType: "BANK",
        currentBalance: "4250000",
      }),
    ).toEqual({
      success: true,
      data: {
        accountName: "BCA Utama",
        accountType: "BANK",
        currentBalance: BigInt("4250000"),
      },
    });
  });

  it("accepts a zero opening balance", () => {
    expect(
      parseOnboardingInput({
        accountName: "Dompet",
        accountType: "CASH",
        currentBalance: "0",
      }),
    ).toMatchObject({
      success: true,
      data: { currentBalance: BigInt(0) },
    });
  });

  it("returns stable field errors for invalid untrusted input", () => {
    expect(
      parseOnboardingInput({
        accountName: " ",
        accountType: "CRYPTO",
        currentBalance: "-0.5",
      }),
    ).toEqual({
      success: false,
      fieldErrors: {
        accountName: "Masukkan nama akun.",
        accountType: "Pilih jenis akun yang tersedia.",
        currentBalance: "Saldo harus berupa Rupiah utuh dan tidak negatif.",
      },
    });
  });

  it("rejects values that cannot safely cross the current client boundary", () => {
    expect(
      parseOnboardingInput({
        accountName: "Bank",
        accountType: "BANK",
        currentBalance: "9007199254740992",
      }),
    ).toEqual({
      success: false,
      fieldErrors: {
        currentBalance: "Saldo terlalu besar.",
      },
    });
  });
});
