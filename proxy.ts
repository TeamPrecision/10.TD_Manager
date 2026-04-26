import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC = ["/login", "/report", "/api/auth", "/api/tester", "/api/seed", "/api/issues/public"];

const LEADER_PATHS = [
  "/projects", "/purchasing", "/customer-items",
  "/activity-log", "/tickets", "/fixture", "/tester-status",
];

const DEPT_PATHS = ["/tickets"];

const MEMBER_PATHS: Record<string, string[]> = {
  DEBUG:     ["/projects", "/tester-status", "/purchasing", "/customer-items", "/activity-log", "/tickets"],
  CODING:    ["/projects", "/tester-status", "/purchasing", "/customer-items", "/activity-log", "/tickets"],
  FIXTURE:   ["/projects", "/tester-status", "/purchasing", "/customer-items", "/activity-log", "/tickets"],
  PURCHASING:["/projects", "/tester-status", "/purchasing", "/activity-log", "/tickets"],
};

function allowedPaths(role: string, subRole: string | null): string[] {
  if (role === "LEADER") return LEADER_PATHS;
  if (role === "DEPT")   return DEPT_PATHS;
  return MEMBER_PATHS[subRole ?? ""] ?? ["/projects", "/tickets"];
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Next.js internals — always pass through
  if (pathname.startsWith("/_next") || pathname.startsWith("/logo")) {
    return NextResponse.next();
  }

  // Public routes — no auth needed
  if (PUBLIC.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // API routes — individual handlers manage their own auth
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Decode the session JWT from the cookie
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
  });

  // Not authenticated → login
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const role    = (token.role    as string)       ?? "MEMBER";
  const subRole = (token.subRole as string | null) ?? null;
  const allowed = allowedPaths(role, subRole);
  const landing = allowed[0] ?? "/projects";

  // Root / dashboard → landing page for this role
  if (pathname === "/" || pathname === "/dashboard") {
    return NextResponse.redirect(new URL(landing, request.url));
  }

  // Check if the current path is in the allowed list
  const isAllowed = allowed.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  if (!isAllowed) {
    return NextResponse.redirect(new URL(landing, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo.jpg).*)"],
};
