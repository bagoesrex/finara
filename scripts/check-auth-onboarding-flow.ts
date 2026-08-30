import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import "dotenv/config";

import { db } from "../src/server/db/client";

const baseUrl = process.env.FINARA_TEST_BASE_URL ?? "http://localhost:3000";

async function request(path: string, init?: RequestInit) {
  return fetch(new URL(path, baseUrl), {
    redirect: "manual",
    ...init,
  });
}

function sessionCookie(response: Response) {
  const setCookie = response.headers.get("set-cookie");
  assert.ok(setCookie, "Sign-in response did not set a session cookie.");
  return setCookie.split(";", 1)[0];
}

function decodeHtmlAttribute(value: string) {
  return value
    .replaceAll("&quot;", '"')
    .replaceAll("&#x27;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

function onboardingActionFields(html: string) {
  const form = html.match(/<form[^>]*>[\s\S]*?<\/form>/)?.[0];
  assert.ok(form, "Onboarding form was not present in the response.");

  const fields = [...form.matchAll(/<input\b[^>]*>/g)]
    .map(([input]) => {
      const name = input.match(/\bname="([^"]+)"/)?.[1];
      const value = input.match(/\bvalue="([^"]*)"/)?.[1] ?? "";
      return name?.startsWith("$ACTION")
        ? ([name, decodeHtmlAttribute(value)] as const)
        : null;
    })
    .filter((field): field is readonly [string, string] => field !== null);

  assert.ok(
    fields.some(([name]) => name.startsWith("$ACTION_REF_")),
    "Onboarding Server Action reference was not present in the form.",
  );
  return fields;
}

function onboardingForm(actionFields: readonly (readonly [string, string])[]) {
  const formData = new FormData();
  for (const [name, value] of actionFields) {
    formData.set(name, value);
  }
  formData.set("accountName", "Runtime Bank");
  formData.set("accountType", "BANK");
  formData.set("currentBalance", "321000");
  return formData;
}

async function checkAuthOnboardingFlow() {
  const email = `runtime-auth-${randomUUID()}@example.test`;
  const password = `Runtime-${randomUUID()}!`;
  let userId: string | undefined;

  try {
    const signedOutHome = await request("/");
    assert.equal(signedOutHome.status, 307);
    assert.equal(signedOutHome.headers.get("location"), "/welcome");

    const registration = await request("/api/auth/sign-up/email", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: baseUrl,
      },
      body: JSON.stringify({ name: "Runtime Check", email, password }),
    });
    assert.equal(registration.status, 200);

    const user = await db.user.findUniqueOrThrow({
      where: { email },
      select: { id: true },
    });
    userId = user.id;

    const signIn = await request("/api/auth/sign-in/email", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: baseUrl,
      },
      body: JSON.stringify({ email, password }),
    });
    assert.equal(signIn.status, 200);
    const cookie = sessionCookie(signIn);

    const incompleteHome = await request("/", {
      headers: { cookie },
    });
    assert.equal(incompleteHome.status, 307);
    assert.equal(incompleteHome.headers.get("location"), "/onboarding");

    const onboardingPage = await request("/onboarding", {
      headers: { cookie },
    });
    assert.equal(onboardingPage.status, 200);
    const actionFields = onboardingActionFields(await onboardingPage.text());

    const unauthorizedOnboarding = await request("/onboarding", {
      method: "POST",
      headers: { origin: baseUrl },
      body: onboardingForm(actionFields),
    });
    assert.equal(unauthorizedOnboarding.status, 307);
    assert.equal(unauthorizedOnboarding.headers.get("location"), "/register");
    assert.equal(await db.account.count({ where: { userId } }), 0);

    const completedOnboarding = await request("/onboarding", {
      method: "POST",
      headers: { cookie, origin: baseUrl },
      body: onboardingForm(actionFields),
    });
    assert.equal(completedOnboarding.status, 303);
    assert.equal(completedOnboarding.headers.get("location"), "/");

    const initializedHome = await request("/", {
      headers: { cookie },
    });
    assert.equal(initializedHome.status, 200);
    const homeHtml = await initializedHome.text();
    assert.match(homeHtml, /Runtime Check/);
    assert.match(homeHtml, /Rp321\.000/);
    assert.match(homeHtml, /Buka formulir transaksi manual/);

    const bypassedOnboarding = await request("/onboarding", {
      headers: { cookie },
    });
    assert.equal(bypassedOnboarding.status, 307);
    assert.equal(bypassedOnboarding.headers.get("location"), "/");

    const signOut = await request("/api/auth/sign-out", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie,
        origin: baseUrl,
      },
      body: "{}",
    });
    assert.equal(signOut.status, 200);

    const revokedHome = await request("/", {
      headers: { cookie },
    });
    assert.equal(revokedHome.status, 307);
    assert.equal(revokedHome.headers.get("location"), "/welcome");
  } finally {
    if (userId) {
      await db.category.deleteMany({ where: { userId } });
      await db.account.deleteMany({ where: { userId } });
      await db.user.deleteMany({ where: { id: userId } });
    }
  }
}

checkAuthOnboardingFlow()
  .then(() => {
    console.info("Authentication and onboarding HTTP flow verified.");
  })
  .finally(async () => {
    await db.$disconnect();
  })
  .catch((error: unknown) => {
    console.error("Authentication and onboarding HTTP flow failed.");
    console.error(error);
    process.exitCode = 1;
  });
