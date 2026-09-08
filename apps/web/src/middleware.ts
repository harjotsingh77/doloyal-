import { NextRequest, NextResponse } from "next/server";

const RESERVED = new Set([
  "www",
  "app",
  "api",
  "admin",
  "mail",
  "status",
  "docs",
]);

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const hostname = host.split(":")[0]?.toLowerCase() || "";
  const isLocalSub = hostname.endsWith(".localhost");
  const isProdSub =
    (hostname.endsWith(".doloyal.com") || hostname.endsWith(".doloyal.ai")) &&
    !RESERVED.has(hostname.split(".")[0] || "") &&
    hostname !== "doloyal.com" &&
    hostname !== "www.doloyal.com" &&
    hostname !== "doloyal.ai" &&
    hostname !== "www.doloyal.ai";

  if (!isLocalSub && !isProdSub) return NextResponse.next();

  const slug = hostname.split(".")[0];
  if (!slug || RESERVED.has(slug)) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith("/book/") ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api")
  ) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = pathname === "/" ? `/book/${slug}` : `/book/${slug}${pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
