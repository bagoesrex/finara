import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export type MaintenanceEnvironment = {
  MAINTENANCE_MODE?: string;
  NEXT_PUBLIC_MAINTENANCE_MODE?: string;
  MAINTENANCE_BYPASS_TOKEN?: string;
};

export function handleMaintenanceProxy(
  request: NextRequest,
  env: MaintenanceEnvironment = {
    MAINTENANCE_MODE: process.env.MAINTENANCE_MODE,
    NEXT_PUBLIC_MAINTENANCE_MODE: process.env.NEXT_PUBLIC_MAINTENANCE_MODE,
    MAINTENANCE_BYPASS_TOKEN: process.env.MAINTENANCE_BYPASS_TOKEN,
  },
): NextResponse | null {
  const isEnabled =
    env.MAINTENANCE_MODE === "true" ||
    env.NEXT_PUBLIC_MAINTENANCE_MODE === "true";

  if (!isEnabled) {
    return null;
  }

  const { pathname, searchParams } = request.nextUrl;

  // Allow static assets, Next.js internal files, and the maintenance page itself
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname === "/under-development" ||
    pathname.includes(".")
  ) {
    return null;
  }

  // Check optional bypass token
  const bypassToken = env.MAINTENANCE_BYPASS_TOKEN?.trim();
  if (bypassToken) {
    const queryBypass = searchParams.get("bypass")?.trim();
    const cookieBypass = request.cookies.get("finara_bypass")?.value?.trim();

    if (queryBypass === bypassToken) {
      const cleanUrl = request.nextUrl.clone();
      cleanUrl.searchParams.delete("bypass");
      const response = NextResponse.redirect(cleanUrl);
      response.cookies.set("finara_bypass", bypassToken, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
      });
      return response;
    }

    if (cookieBypass === bypassToken) {
      return null;
    }
  }

  // API requests receive a clear 503 JSON payload
  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      {
        success: false,
        code: "UNDER_DEVELOPMENT",
        message: "Finara sedang dalam tahap pengembangan dan persiapan rilis.",
      },
      { status: 503 },
    );
  }

  // Rewrite page visits to /under-development so URL remains unchanged in browser
  const rewriteUrl = request.nextUrl.clone();
  rewriteUrl.pathname = "/under-development";
  return NextResponse.rewrite(rewriteUrl);
}

export function proxy(request: NextRequest) {
  const maintenanceResponse = handleMaintenanceProxy(request);
  if (maintenanceResponse) {
    return maintenanceResponse;
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files and images
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
