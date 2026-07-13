import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, expectedToken } from "@/lib/auth";

function requiresAuth(pathname: string, method: string): boolean {
  if (pathname.startsWith("/editor")) return true;
  if (!pathname.startsWith("/api")) return false;
  if (pathname.startsWith("/api/auth")) return false;
  // The viewer needs public read access to pages and images; everything
  // else on the API (writes, version history) is editor-only.
  if (method === "GET" && !pathname.includes("/versions")) {
    if (pathname.startsWith("/api/pages") || pathname.startsWith("/api/images")) return false;
  }
  return true;
}

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!requiresAuth(pathname, req.method)) return NextResponse.next();

  const expected = await expectedToken();
  const token = req.cookies.get(AUTH_COOKIE)?.value;
  if (expected && token === expected) return NextResponse.next();

  if (pathname.startsWith("/api")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/login", req.url));
}

export const config = {
  matcher: ["/editor/:path*", "/editor", "/api/:path*"],
};
