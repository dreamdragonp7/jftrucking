import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { UserRole } from "@/types/database";

/**
 * Next.js 16 Proxy (replaces middleware.ts)
 *
 * Handles auth session refresh and role-based route protection.
 * Runs on every matched route before rendering.
 *
 * Gracefully handles missing Supabase env vars during development
 * by allowing all requests through.
 */

/** Routes that don't require authentication */
const PUBLIC_ROUTES = [
  "/",
  "/admin/login",
  "/trucker/login",
  "/customer/login",
  "/customer/signup",
  "/subcontractor/login",
  "/subcontractor/signup",
  "/forgot-password",
];

/** Map portal prefixes to required roles */
const ROLE_ROUTE_MAP: Record<string, UserRole> = {
  "/admin/": "admin",
  "/trucker/": "driver",
  "/customer/": "customer",
  "/subcontractor/": "carrier",
};

/** Map roles to their default dashboard routes */
const ROLE_DASHBOARDS: Record<UserRole, string> = {
  admin: "/admin/dashboard",
  driver: "/trucker/loads",
  customer: "/customer/orders",
  carrier: "/subcontractor/dashboard",
};

/** Map roles to their login routes */
const ROLE_LOGIN_ROUTES: Record<UserRole, string> = {
  admin: "/admin/login",
  driver: "/trucker/login",
  customer: "/customer/login",
  carrier: "/subcontractor/login",
};

/**
 * Check if Supabase environment variables are configured.
 */
function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url && key);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Create response with forwarded headers
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // If Supabase is not configured, use demo mode cookie for route guarding
  if (!isSupabaseConfigured()) {
    const demoRole = request.cookies.get("demo_role")?.value as
      | UserRole
      | undefined;

    const isPublicRoute = PUBLIC_ROUTES.some(
      (route) => pathname === route || pathname === route + "/"
    );

    // Authenticated demo user on a public route -> redirect to dashboard
    if (isPublicRoute && demoRole) {
      const dashboardUrl = ROLE_DASHBOARDS[demoRole];
      if (dashboardUrl) {
        return NextResponse.redirect(new URL(dashboardUrl, request.url));
      }
    }

    // Unauthenticated on a protected route -> redirect to login
    if (!isPublicRoute && !demoRole) {
      for (const [prefix, role] of Object.entries(ROLE_ROUTE_MAP)) {
        if (pathname.startsWith(prefix)) {
          const loginUrl = ROLE_LOGIN_ROUTES[role];
          return NextResponse.redirect(new URL(loginUrl, request.url));
        }
      }
      return NextResponse.redirect(new URL("/", request.url));
    }

    // Authenticated demo user on wrong portal -> redirect to correct one
    if (demoRole) {
      for (const [prefix, requiredRole] of Object.entries(ROLE_ROUTE_MAP)) {
        if (pathname.startsWith(prefix) && demoRole !== requiredRole) {
          const correctDashboard = ROLE_DASHBOARDS[demoRole];
          return NextResponse.redirect(
            new URL(correctDashboard, request.url)
          );
        }
      }
    }

    return response;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )!;

  // Create Supabase client for proxy context
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Forward cookies to both the request (for server components)
        // and the response (for the browser)
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // Refresh auth token — use getUser for secure server-side validation
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Check if the current route is public
  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname === route + "/"
  );

  // If on a public route and authenticated, redirect to their portal
  if (isPublicRoute && user) {
    // Get user role from metadata — check app_metadata first, then user_metadata
    const role = (user.app_metadata?.role as UserRole)
      || (user.user_metadata?.role as UserRole)
      || "customer";
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
    const role = (user.app_metadata?.role as UserRole)
      || (user.user_metadata?.role as UserRole)
      || "customer";

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
    "/((?!api|_next/static|_next/image|favicon.ico|jftlogo.svg|sitemap.xml|robots.txt|manifest.json|manifest.webmanifest|sw.js|sw.js.map).*)",
  ],
};
