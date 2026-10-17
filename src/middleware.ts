import { NextResponse, type NextRequest } from "next/server";

function isInvalidOrExpiredToken(token?: string): boolean {
  if (!token || typeof token !== "string") return true;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return true;
    let b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    const jsonStr = atob(b64);
    const payload = JSON.parse(jsonStr);
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) return true;
    return false;
  } catch {
    return true;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get("medixia_simrs_session")?.value;
  const isInvalid = isInvalidOrExpiredToken(sessionCookie);

  // 1. Guard untuk Portal Super Admin (/admin dan sub-rute kecuali /admin/login)
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (isInvalid) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      const res = NextResponse.redirect(loginUrl);
      if (sessionCookie) res.cookies.delete("medixia_simrs_session");
      return res;
    }
  }

  // 2. Guard untuk Halaman Utama / Dashboard SIMRS (/)
  if (pathname === "/") {
    if (isInvalid) {
      const loginUrl = new URL("/login", request.url);
      const res = NextResponse.redirect(loginUrl);
      if (sessionCookie) res.cookies.delete("medixia_simrs_session");
      return res;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Terapkan middleware pada rute halaman:
     * - Root path (/)
     * - Portal Admin (/admin/:path*)
     * Kecualikan:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - /api/* (biarkan API mengelola autentikasi dan status response 401 sendiri)
     */
    "/",
    "/admin/:path*",
  ],
};
