import { describe, expect, it } from "bun:test";

import { randomClientRequestId } from "./client-request-id";

const uuidV4Pattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("random client request id", () => {
  it("generates a UUID v4-shaped idempotency key", () => {
    expect(randomClientRequestId()).toMatch(uuidV4Pattern);
  });

  it("generates a unique key per call", () => {
    expect(randomClientRequestId()).not.toBe(randomClientRequestId());
  });
});
