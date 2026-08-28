import { describe, expect, it } from "vitest";
import {
  createOnboardingSummary,
  getInitials,
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
