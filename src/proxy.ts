import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { UserRole } from "@/types/database";

/**
 * Next.js 16 Proxy (replaces middleware.ts)
 *
 * Handles auth session refresh and role-based route protection.
 * Runs on every matched route before rendering.
 */

/** Routes that don't require authentication */
const PUBLIC_ROUTES = [
  "/",
  "/admin/login",
  "/trucker/login",
  "/customer/login",
  "/customer/signup",
];

/** Map portal prefixes to required roles */
const ROLE_ROUTE_MAP: Record<string, UserRole> = {
  "/admin/": "admin",
  "/trucker/": "trucker",
  "/customer/": "customer",
};

/** Map roles to their default dashboard routes */
const ROLE_DASHBOARDS: Record<UserRole, string> = {
  admin: "/admin/dashboard",
  trucker: "/trucker/loads",
  customer: "/customer/orders",
};

/** Map roles to their login routes */
const ROLE_LOGIN_ROUTES: Record<UserRole, string> = {
  admin: "/admin/login",
  trucker: "/trucker/login",
  customer: "/customer/login",
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Create response with forwarded headers
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Create Supabase client for proxy context
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Forward cookies to both the request (for server components)
          // and the response (for the browser)
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Refresh auth token (important: use getUser for server-side validation)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Check if the current route is public
  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname === route + "/"
  );

  // If on a public route and authenticated, redirect to their portal
  if (isPublicRoute && user) {
    // Get user role from metadata (set during signup/admin assignment)
    const role = (user.user_metadata?.role as UserRole) || "customer";
    const dashboardUrl = ROLE_DASHBOARDS[role];
    return NextResponse.redirect(new URL(dashboardUrl, request.url));
  }

  // If on a protected route and not authenticated, redirect to login
  if (!isPublicRoute && !user) {
    // Determine which login page to redirect to based on the route prefix
    for (const [prefix, role] of Object.entries(ROLE_ROUTE_MAP)) {
      if (pathname.startsWith(prefix)) {
        const loginUrl = ROLE_LOGIN_ROUTES[role];
        const redirectUrl = new URL(loginUrl, request.url);
        redirectUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(redirectUrl);
      }
    }
    // Default: redirect to home page
    return NextResponse.redirect(new URL("/", request.url));
  }

  // If authenticated, verify role matches the portal they're accessing
  if (user) {
    const role = (user.user_metadata?.role as UserRole) || "customer";

    for (const [prefix, requiredRole] of Object.entries(ROLE_ROUTE_MAP)) {
      if (pathname.startsWith(prefix) && role !== requiredRole) {
        // User is trying to access a portal they don't have access to
        const correctDashboard = ROLE_DASHBOARDS[role];
        return NextResponse.redirect(new URL(correctDashboard, request.url));
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - API routes (handled by their own auth)
     * - Static files
     * - Image optimization files
     * - Favicon and metadata files
     */
    "/((?!api|_next/static|_next/image|favicon.ico|jftlogo.svg|sitemap.xml|robots.txt|manifest.json|sw.js|sw.js.map).*)",
  ],
};
