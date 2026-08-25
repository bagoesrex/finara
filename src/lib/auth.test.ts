import { describe, expect, it } from "vitest";
import {
  createOnboardingSummary,
  getInitials,
  validateAccountSetup,
  validateRegistration,
  validateSignIn,
} from "./auth";

describe("authentication form validation", () => {
  it("accepts a valid registration", () => {
    expect(
      validateRegistration({
        name: "Alya Putri",
        email: "alya@example.com",
        password: "rahasia8",
      }),
    ).toEqual({});
  });

  it("returns field-specific registration errors", () => {
    expect(
      validateRegistration({ name: "A", email: "bukan-email", password: "pendek" }),
    ).toEqual({
      name: "Nama minimal 2 karakter.",
      email: "Masukkan email yang valid.",
      password: "Password minimal 8 karakter.",
    });
  });

  it("validates sign-in without revealing whether an identity exists", () => {
    expect(validateSignIn({ email: "", password: "" })).toEqual({
      email: "Masukkan email yang valid.",
      password: "Masukkan password.",
    });
    expect(validateSignIn({ email: "alya@example.com", password: "anything" })).toEqual({});
  });
});

describe("first-account setup", () => {
  it("accepts zero and a positive integer as a current balance", () => {
    expect(
      validateAccountSetup({ name: "Cash", type: "CASH", currentBalance: 0 }),
    ).toEqual({});
    expect(
      validateAccountSetup({ name: "BCA", type: "BANK", currentBalance: 4_250_000 }),
    ).toEqual({});
  });

  it("rejects incomplete, negative, fractional, and unknown account values", () => {
    expect(
      validateAccountSetup({ name: "", type: "OTHER", currentBalance: -0.5 }),
    ).toEqual({
      name: "Masukkan nama akun.",
      type: "Pilih jenis akun yang tersedia.",
      currentBalance: "Saldo harus berupa Rupiah utuh dan tidak negatif.",
    });
  });

  it("turns the current balance into an opening snapshot without fake activity", () => {
    expect(
      createOnboardingSummary(1_750_000, {
        monthKey: "2026-08",
        monthLabel: "Agustus 2026",
      }),
    ).toEqual({
      available: 1_750_000,
      spentThisMonth: 0,
      incomeThisMonth: 0,
      monthKey: "2026-08",
      monthLabel: "Agustus 2026",
    });
  });
});

describe("profile initials", () => {
  it("uses at most the first and last meaningful name parts", () => {
    expect(getInitials(" Alya  Putri Ramadhani ")).toBe("AR");
    expect(getInitials("Bagus")).toBe("B");
    expect(getInitials(" ")).toBe("F");
  });
});
