import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for API routes, static files, uploads, images, and build-related paths
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/uploads") ||
    pathname.includes(".") ||
    pathname.includes("favicon") ||
    pathname === "/" // Skip root path - it handles its own redirect
  ) {
    return NextResponse.next();
  }

  // Public routes that don't require authentication
  const publicRoutes = [
    "/login",
    "/register",
    "/forgot-password",
    "/auth/set-password",
    "/auth/reset-password",
  ];

  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  // Check for authentication token - just verify presence, not validity
  // Actual verification happens in dashboard layout with Node.js runtime
  const token = request.cookies.get("auth-token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Token exists, let dashboard layout handle verification
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
