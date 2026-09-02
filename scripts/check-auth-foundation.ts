import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { db } from "../src/server/db/client";

const baseURL = "http://localhost:3000";
const testSecret = "finara-auth-integration-secret-32-chars";
const testIpAddressHeader = "x-finara-test-ip";

// This process-level test boundary must not inherit a developer or production
// origin, secret, or trusted proxy header from the surrounding environment.
process.env.BETTER_AUTH_URL = baseURL;
process.env.BETTER_AUTH_SECRET = testSecret;
process.env.BETTER_AUTH_TRUSTED_IP_HEADER = testIpAddressHeader;

type AuthError = {
  code?: string;
  message?: string;
};

async function sendAuthRequest(
  path: string,
  options: {
    body?: Record<string, unknown>;
    cookie?: string;
    ipAddress?: string;
    method?: "GET" | "POST";
  } = {},
) {
  const headers = new Headers({ origin: baseURL });
  if (options.body) headers.set("content-type", "application/json");
  if (options.cookie) headers.set("cookie", options.cookie);
  headers.set(testIpAddressHeader, options.ipAddress ?? "198.51.100.99");

  const { auth } = await import("../src/server/auth/auth");
  return auth.handler(
    new Request(`${baseURL}/api/auth${path}`, {
      method: options.method ?? (options.body ? "POST" : "GET"),
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    }),
  );
}

function getSessionCookie(response: Response): string {
  const cookie = response.headers.get("set-cookie")?.split(";", 1)[0];
  assert.ok(cookie, "Successful sign-in did not set a session cookie.");
  return cookie;
}

async function getError(response: Response): Promise<AuthError> {
  return (await response.json()) as AuthError;
}

async function verifyRegistrationValidation(marker: string) {
  const email = `invalid-auth-check-${marker}@example.test`;
  const response = await sendAuthRequest("/sign-up/email", {
    body: { email, name: "Auth Integration", password: "short" },
    ipAddress: "198.51.100.5",
  });

  assert.notEqual(response.status, 200);
  assert.equal(await db.user.count({ where: { email } }), 0);
}

async function verifyRegistrationAndSession(email: string, password: string) {
  const registration = await sendAuthRequest("/sign-up/email", {
    body: { email, name: "Auth Integration", password },
    ipAddress: "198.51.100.10",
  });

  assert.equal(registration.status, 200);
  assert.equal(registration.headers.has("set-cookie"), false);
  const registrationBody = (await registration.clone().json()) as {
    token?: unknown;
    user?: Record<string, unknown>;
  };

  const user = await db.user.findUniqueOrThrow({ where: { email } });
  const identity = await db.authIdentity.findFirstOrThrow({
    where: { userId: user.id, providerId: "credential" },
  });

  assert.equal(user.name, "Auth Integration");
  assert.equal(user.emailVerified, false);
  assert.ok(identity.password);
  assert.notEqual(identity.password, password);

  const duplicate = await sendAuthRequest("/sign-up/email", {
    body: { email, name: "Auth Integration", password: `${password}-other` },
    ipAddress: "198.51.100.11",
  });

  assert.equal(duplicate.status, registration.status);
  assert.equal(duplicate.headers.has("set-cookie"), false);
  const duplicateBody = (await duplicate.clone().json()) as {
    token?: unknown;
    user?: Record<string, unknown>;
  };
  assert.deepEqual(
    Object.keys(duplicateBody).sort(),
    Object.keys(registrationBody).sort(),
  );
  assert.deepEqual(
    Object.keys(duplicateBody.user ?? {}).sort(),
    Object.keys(registrationBody.user ?? {}).sort(),
  );
  assert.equal(Boolean(duplicateBody.token), Boolean(registrationBody.token));
  assert.equal(await db.user.count({ where: { email } }), 1);
  assert.equal(
    await db.authIdentity.count({ where: { userId: user.id } }),
    1,
  );

  const signIn = await sendAuthRequest("/sign-in/email", {
    body: { email, password },
    ipAddress: "198.51.100.12",
  });
  assert.equal(signIn.status, 200);
  const cookie = getSessionCookie(signIn);

  const sessionResponse = await sendAuthRequest("/get-session", { cookie });
  assert.equal(sessionResponse.status, 200);
  const activeSession = (await sessionResponse.json()) as {
    user?: { id?: string };
  };
  assert.equal(activeSession.user?.id, user.id);

  const signOut = await sendAuthRequest("/sign-out", {
    cookie,
    method: "POST",
  });
  assert.equal(signOut.status, 200);

  const revokedSession = await sendAuthRequest("/get-session", { cookie });
  assert.equal(revokedSession.status, 200);
  assert.equal(await revokedSession.json(), null);
}

async function verifyGenericSignInFailure(email: string, password: string) {
  const wrongPassword = await sendAuthRequest("/sign-in/email", {
    body: { email, password: `${password}-wrong` },
    ipAddress: "198.51.100.20",
  });
  const unknownEmail = await sendAuthRequest("/sign-in/email", {
    body: { email: `unknown-${email}`, password },
    ipAddress: "198.51.100.21",
  });

  assert.equal(wrongPassword.status, unknownEmail.status);
  assert.deepEqual(await getError(wrongPassword), await getError(unknownEmail));
}

async function verifyCredentialRateLimit(email: string, password: string) {
  const statuses: number[] = [];

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await sendAuthRequest("/sign-in/email", {
      body: { email, password: `${password}-invalid` },
      ipAddress: "198.51.100.30",
    });
    statuses.push(response.status);
  }

  assert.deepEqual(statuses, [401, 401, 401, 429]);
}

async function verifyRegistrationRateLimit(email: string, password: string) {
  const statuses: number[] = [];

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await sendAuthRequest("/sign-up/email", {
      body: { email, name: "Auth Integration", password },
      ipAddress: "198.51.100.40",
    });
    statuses.push(response.status);
  }

  assert.deepEqual(statuses, [200, 200, 200, 429]);
}

async function checkAuthFoundation() {
  const marker = randomUUID();
  const email = `auth-check-${marker}@example.test`;
  const password = `Auth-check-${marker}`;

  try {
    await verifyRegistrationValidation(marker);
    await verifyRegistrationAndSession(email, password);
    await verifyGenericSignInFailure(email, password);
    await verifyCredentialRateLimit(email, password);
    await verifyRegistrationRateLimit(email, password);
  } finally {
    const user = await db.user.findUnique({ where: { email } });
    if (user) {
      await db.authSession.deleteMany({ where: { userId: user.id } });
      await db.authIdentity.deleteMany({ where: { userId: user.id } });
      await db.user.delete({ where: { id: user.id } });
    }
    await db.authRateLimit.deleteMany({
      where: { key: { contains: "198.51.100." } },
    });
  }
}

checkAuthFoundation()
  .then(() => {
    console.info("Auth foundation verified.");
  })
  .finally(async () => {
    await db.$disconnect();
  })
  .catch(() => {
    console.error("Auth foundation verification failed.");
    process.exitCode = 1;
  });
