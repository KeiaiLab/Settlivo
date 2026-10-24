import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const has = request.cookies.has("settlivo_session");
  const { pathname } = request.nextUrl;
  if (!has && (pathname.startsWith("/company") || pathname.startsWith("/worker") || pathname.startsWith("/notifications"))) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/company/:path*", "/worker/:path*", "/notifications"],
};
