import { describe, expect, it } from "bun:test";
import { NextRequest } from "next/server";
import { handleMaintenanceProxy } from "./proxy";

function createRequest(path: string, cookies: Record<string, string> = {}) {
  const url = `http://localhost:3000${path}`;
  const headers = new Headers();
  if (Object.keys(cookies).length > 0) {
    headers.set(
      "cookie",
      Object.entries(cookies)
        .map(([k, v]) => `${k}=${v}`)
        .join("; "),
    );
  }
  return new NextRequest(new Request(url, { headers }));
}

describe("Maintenance proxy", () => {
  it("allows normal navigation when MAINTENANCE_MODE is not enabled", () => {
    const request = createRequest("/login");
    const response = handleMaintenanceProxy(request, {
      MAINTENANCE_MODE: "false",
    });
    expect(response).toBeNull();
  });

  it("rewrites page requests to /under-development when MAINTENANCE_MODE is true", () => {
    const request = createRequest("/");
    const response = handleMaintenanceProxy(request, {
      MAINTENANCE_MODE: "true",
    });
    expect(response).not.toBeNull();
    expect(response?.headers.get("x-middleware-rewrite")).toContain(
      "/under-development",
    );
  });

  it("returns 503 JSON for API routes when MAINTENANCE_MODE is true", async () => {
    const request = createRequest("/api/transactions");
    const response = handleMaintenanceProxy(request, {
      MAINTENANCE_MODE: "true",
    });
    expect(response).not.toBeNull();
    expect(response?.status).toBe(503);
    const body = await response?.json();
    expect(body).toMatchObject({
      code: "UNDER_DEVELOPMENT",
    });
  });

  it("allows static files and internal Next.js assets through", () => {
    const staticReq = createRequest("/_next/static/chunks/main.js");
    expect(
      handleMaintenanceProxy(staticReq, { MAINTENANCE_MODE: "true" }),
    ).toBeNull();

    const faviconReq = createRequest("/favicon.ico");
    expect(
      handleMaintenanceProxy(faviconReq, { MAINTENANCE_MODE: "true" }),
    ).toBeNull();

    const underDevReq = createRequest("/under-development");
    expect(
      handleMaintenanceProxy(underDevReq, { MAINTENANCE_MODE: "true" }),
    ).toBeNull();
  });

  it("allows bypass via token query parameter or cookie", () => {
    const bypassQueryReq = createRequest("/?bypass=secret-preview");
    const response = handleMaintenanceProxy(bypassQueryReq, {
      MAINTENANCE_MODE: "true",
      MAINTENANCE_BYPASS_TOKEN: "secret-preview",
    });
    expect(response).not.toBeNull();
    expect(response?.cookies.get("finara_bypass")?.value).toBe("secret-preview");

    const bypassCookieReq = createRequest("/activity", {
      finara_bypass: "secret-preview",
    });
    const cookieResponse = handleMaintenanceProxy(bypassCookieReq, {
      MAINTENANCE_MODE: "true",
      MAINTENANCE_BYPASS_TOKEN: "secret-preview",
    });
    expect(cookieResponse).toBeNull();
  });
});
