import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow these paths
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const isLoginPage = pathname === "/login";

  // Read session cookie
  const session = req.cookies.get("session")?.value;

  // ❌ Not logged in → force /login
  if (!session && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // 🔒 Logged in → block /login
  if (session && isLoginPage) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|favicon.ico).*)"],
};
