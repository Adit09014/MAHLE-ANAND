import { NextResponse, type NextRequest } from "next/server";

const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost",
  "http://127.0.0.1:3000",
  "http://127.0.0.1",
  "http://reward-mahle.local:3000",
  "http://reward-mahle.local",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get("origin");

  // Dynamically match allowed CORS origins
  const isAllowedOrigin =
    origin &&
    (ALLOWED_ORIGINS.includes(origin) ||
      origin.includes("localhost") ||
      origin.includes("reward-mahle.local"));

  const corsOrigin = isAllowedOrigin ? origin : (origin || "*");

  // Handle preflight OPTIONS requests for API routes
  if (request.method === "OPTIONS") {
    const preflightResponse = new NextResponse(null, { status: 200 });
    preflightResponse.headers.set("Access-Control-Allow-Origin", corsOrigin);
    preflightResponse.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    preflightResponse.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    preflightResponse.headers.set("Access-Control-Allow-Credentials", "true");
    return preflightResponse;
  }

  // Session authentication check
  const sessionCookie = request.cookies.get("rr_session");
  const isAuthenticated = Boolean(sessionCookie?.value);

  let response = NextResponse.next();

  // Redirect unauthenticated users accessing / to /login
  if (pathname === "/" && !isAuthenticated) {
    response = NextResponse.redirect(new URL("/login", request.url));
  }
  // Redirect authenticated users accessing /login to /
  else if (pathname === "/login" && isAuthenticated) {
    response = NextResponse.redirect(new URL("/", request.url));
  }

  // Set CORS headers for API requests
  if (pathname.startsWith("/api/")) {
    response.headers.set("Access-Control-Allow-Origin", corsOrigin);
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    response.headers.set("Access-Control-Allow-Credentials", "true");
  }

  return response;
}

export const config = {
  matcher: ["/", "/login", "/api/:path*"],
};
