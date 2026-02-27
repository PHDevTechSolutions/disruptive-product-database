import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.match(/\.(png|jpg|jpeg|gif|webp|svg|ico)$/)
  ) {
    return NextResponse.next();
  }

  const session = req.cookies.get("session")?.value;

  const isLoginPage = pathname === "/login";
  const isSplashPage = pathname === "/splash-screen";

  if (!session && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (session && isLoginPage) {
    return NextResponse.redirect(new URL("/splash-screen", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next).*)"],
};