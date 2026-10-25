import { type NextRequest, NextResponse } from "next/server";
import { AUTH_CONFIG } from "@/lib/auth";

// Cache setup status to avoid repeated database queries
let setupStatusCache: { hasOwner: boolean; timestamp: number } | null = null;
const SETUP_STATUS_CACHE_TTL = 5000; // 5 seconds

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Sanitize request URL to prevent sensitive data in logs
  const url = new URL(request.url);
  const sensitiveParams = ['password', 'token', 'secret', 'key'];
  sensitiveParams.forEach(param => {
    if (url.searchParams.has(param)) {
      url.searchParams.set(param, '[REDACTED]');
    }
  });

  // Log sanitized request
  console.log(`${request.method} ${url.pathname}${url.search}`);

  // Security: Redirect if sensitive data is in URL parameters
  if (pathname === "/login" && request.nextUrl.searchParams.has('password')) {
    const cleanUrl = new URL("/login", request.url);
    cleanUrl.searchParams.delete('password');
    cleanUrl.searchParams.delete('email');
    return NextResponse.redirect(cleanUrl);
  }

  // Redirect legacy /auth/accept-invite URLs to /accept-invite
  if (pathname === "/auth/accept-invite") {
    const url = new URL("/accept-invite", request.url);
    url.search = request.nextUrl.search;
    return NextResponse.redirect(url);
  }

  // 1. Check setup status via internal API endpoint (runs in Node.js runtime)
  let hasOwner = true;
  const now = Date.now();
  
  // Use cached value if available and not expired
  if (setupStatusCache && (now - setupStatusCache.timestamp) < SETUP_STATUS_CACHE_TTL) {
    hasOwner = setupStatusCache.hasOwner;
  } else {
    try {
      // Use localhost for internal fetch to avoid SSL issues with tunnels
      const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
      const host = process.env.NODE_ENV === 'production' ? request.nextUrl.host : 'localhost:3000';
      const baseUrl = `${protocol}://${host}`;
      const statusUrl = new URL("/api/setup/status", baseUrl);
      const res = await fetch(statusUrl.toString(), {
        cache: "no-store",
      });
      if (res.ok) {
        const body = await res.json();
        hasOwner = body.data?.hasOwner ?? true;
        // Update cache
        setupStatusCache = { hasOwner, timestamp: now };
      }
    } catch (error) {
      console.error("Failed to query setup status in proxy:", error);
    }
  }

  // 2. Redirect to setup page if no owner accounts exist in the database
  if (!hasOwner) {
    if (pathname !== "/setup") {
      return NextResponse.redirect(new URL("/setup", request.url));
    }
    return NextResponse.next();
  }

  // 3. Block access to /setup and /register once setup is complete
  if (pathname === "/setup" || pathname === "/register") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 4. Session authentication validation and route protection
  const sessionToken = request.cookies.get(
    AUTH_CONFIG.session.cookieName,
  )?.value;
  const isAuthPage =
    pathname === "/login" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname === "/accept-invite" ||
    pathname === "/admin-login";

  // Allow public access to inbox routes without session authentication (YOPmail-style)
  const isInboxRoute = pathname.startsWith("/inbox/");

  if (!sessionToken) {
    // Unauthenticated: redirect to login unless visiting auth pages or inbox routes
    if (!isAuthPage && !isInboxRoute) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  } else {
    // Authenticated: allow access to auth pages (for logout functionality)
    // Don't redirect away from auth pages to prevent refresh loops
    // Only redirect from auth pages if explicitly accessing /login (which shouldn't happen for logged-in users)
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all routing paths except for:
     * - api/ (API endpoints)
     * - _next/static (static client assets)
     * - _next/image (next image optimizations)
     * - favicon.ico (favicon files)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
