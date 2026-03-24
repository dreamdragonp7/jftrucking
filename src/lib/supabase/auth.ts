import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "./server";
import { isDemoMode, getDemoUser } from "@/lib/demo";
import type { Profile, UserRole } from "@/types/database";

/**
 * Auth error thrown when authentication/authorization fails.
 */
export class AuthError extends Error {
  constructor(
    message: string,
    public code: "UNAUTHENTICATED" | "UNAUTHORIZED" | "NOT_CONFIGURED"
  ) {
    super(message);
    this.name = "AuthError";
  }
}

/**
 * Get the current session server-side.
 * Returns null if not authenticated or Supabase is not configured.
 */
export async function getSession() {
  const supabase = await createClient();
  if (!supabase) return null;

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session) return null;
  return session;
}

/**
 * Get the current authenticated user with their profile and role.
 * Uses getClaims() for secure server-side validation.
 * Returns null if not authenticated or Supabase is not configured.
 */
export async function getUser(): Promise<{
  user: { id: string; email: string };
  profile: Profile;
} | null> {
  const supabase = await createClient();
  if (!supabase) {
    if (isDemoMode()) {
      const cookieStore = await cookies();
      const demoRole = cookieStore.get("demo_role")?.value;
      if (demoRole) {
        return getDemoUser(demoRole as UserRole);
      }
    }
    return null;
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  // Fetch the user's profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  return {
    user: { id: user.id, email: user.email ?? "" },
    profile,
  };
}

/**
 * Get the current user's role.
 * Returns null if not authenticated or Supabase is not configured.
 */
export async function getUserRole(): Promise<UserRole | null> {
  const userData = await getUser();
  return userData?.profile.role ?? null;
}

/**
 * Require authentication. Throws AuthError if not authenticated.
 * Use in Server Components, Server Actions, and Route Handlers.
 */
export async function requireAuth() {
  const supabase = await createClient();

  if (!supabase) {
    if (isDemoMode()) {
      const cookieStore = await cookies();
      const demoRole = cookieStore.get("demo_role")?.value;
      if (demoRole) {
        const demoUser = await getDemoUser(demoRole as UserRole);
        if (demoUser) {
          return {
            user: demoUser.user,
            profile: demoUser.profile,
            supabase: null as never, // demo mode -- no real supabase client
          };
        }
      }
    }
    throw new AuthError("Supabase is not configured", "NOT_CONFIGURED");
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new AuthError("Authentication required", "UNAUTHENTICATED");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    throw new AuthError("User profile not found", "UNAUTHENTICATED");
  }

  return {
    user: { id: user.id, email: user.email ?? "" },
    profile,
    supabase,
  };
}

/**
 * Require a specific role. Throws AuthError if wrong role.
 * Use in Server Components, Server Actions, and Route Handlers.
 */
export async function requireRole(role: UserRole) {
  const auth = await requireAuth();

  if (auth.profile.role !== role) {
    throw new AuthError(
      `Role '${role}' required, but user has role '${auth.profile.role}'`,
      "UNAUTHORIZED"
    );
  }

  return auth;
}

/**
 * Require one of several roles. Throws AuthError if user has none of the allowed roles.
 */
export async function requireOneOfRoles(roles: UserRole[]) {
  const auth = await requireAuth();

  if (!roles.includes(auth.profile.role)) {
    throw new AuthError(
      `One of roles [${roles.join(", ")}] required, but user has role '${auth.profile.role}'`,
      "UNAUTHORIZED"
    );
  }

  return auth;
}

/**
 * Sign in with email and password.
 * Must be called from a Client Component or Server Action.
 */
export async function signIn(email: string, password: string) {
  const supabase = await createClient();

  if (!supabase) {
    return { error: "Supabase is not configured. Please add your API keys to .env.local" };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  return { data };
}

/**
 * Sign up with email, password, and user metadata (role, name, etc.).
 * The profile is auto-created by the database trigger.
 */
export async function signUp(
  email: string,
  password: string,
  metadata: {
    role: UserRole;
    full_name: string;
    phone?: string;
    company_name?: string;
  }
) {
  const supabase = await createClient();

  if (!supabase) {
    return { error: "Supabase is not configured. Please add your API keys to .env.local" };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { data };
}

/**
 * Sign out the current user and redirect to the home page.
 */
export async function signOut() {
  const supabase = await createClient();

  if (!supabase) {
    if (isDemoMode()) {
      const cookieStore = await cookies();
      cookieStore.delete("demo_role");
    }
    redirect("/");
  }

  await supabase.auth.signOut();
  redirect("/");
}

/**
 * Send a password reset email.
 */
export async function resetPassword(email: string) {
  const supabase = await createClient();

  if (!supabase) {
    return { error: "Supabase is not configured. Please add your API keys to .env.local" };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/auth/callback?type=recovery`,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
