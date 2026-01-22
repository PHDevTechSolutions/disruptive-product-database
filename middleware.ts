import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ✅ Allow static assets & system paths
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.match(/\.(png|jpg|jpeg|gif|webp|svg|ico)$/)
  ) {
    return NextResponse.next();
  }

  const isLoginPage = pathname === "/login";

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
  matcher: ["/((?!api|_next).*)"],
};
