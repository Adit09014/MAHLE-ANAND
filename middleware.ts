import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get("rr_session");
  const isAuthenticated = Boolean(sessionCookie?.value);

  // If trying to access root dashboard without cookie, redirect to /login
  if (pathname === "/" && !isAuthenticated) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // If trying to access /login while already authenticated, redirect to /
  if (pathname === "/login" && isAuthenticated) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login"],
};
