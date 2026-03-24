"use server";

import { redirect } from "next/navigation";
import { loginSchema, signupSchema, truckerSignupSchema, subcontractorSignupSchema, passwordResetSchema } from "@/lib/schemas/auth";
import { signIn, signUp, resetPassword } from "@/lib/supabase/auth";
import type { UserRole } from "@/types/database";

/** Typed response from auth server actions */
export type AuthActionResult = {
  success: boolean;
  error?: string;
  message?: string;
};

/** Dashboard routes by role */
const DASHBOARDS: Record<string, string> = {
  admin: "/admin/dashboard",
  driver: "/trucker/loads",
  customer: "/customer/orders",
  carrier: "/subcontractor/dashboard",
};

/**
 * Server Action: Sign in with email and password.
 * Validates input with Zod, calls Supabase signIn,
 * and redirects to the appropriate portal dashboard on success.
 */
export async function loginAction(
  portalType: "admin" | "trucker" | "customer" | "subcontractor",
  _prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const raw = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  // Validate with Zod
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Invalid input";
    return { success: false, error: firstError };
  }

  // Call Supabase
  const result = await signIn(parsed.data.email, parsed.data.password);

  if (result.error) {
    // Map common Supabase errors to user-friendly messages
    if (result.error.includes("not configured")) {
      return {
        success: false,
        error: "System not configured yet. Please contact the administrator.",
      };
    }
    if (result.error.includes("Invalid login credentials")) {
      return { success: false, error: "Invalid email or password." };
    }
    return { success: false, error: result.error };
  }

  // ── ROLE-LOCKED LOGIN CHECK ──────────────────────────────────────────
  // After successful auth, verify the user's role matches the portal
  // they are attempting to access. If mismatched, sign them out immediately.
  const roleMap: Record<string, UserRole> = {
    admin: "admin",
    trucker: "driver",
    customer: "customer",
    subcontractor: "carrier",
  };
  const expectedRole = roleMap[portalType];

  // Import getUser dynamically to check user profile role
  const { getUser: fetchUser } = await import(
    "@/lib/supabase/auth"
  );
  const userData = await fetchUser();

  if (userData) {
    const actualRole = userData.profile.role;
    if (actualRole !== expectedRole) {
      // Role mismatch — sign out immediately and return portal-specific error
      try {
        // Sign out without redirect (we need to return an error, not redirect)
        const { createClient } = await import("@/lib/supabase/server");
        const supabase = await createClient();
        if (supabase) {
          await supabase.auth.signOut();
        }
      } catch (signOutErr) {
        console.warn("[Auth] Failed to sign out mismatched role user:", signOutErr instanceof Error ? signOutErr.message : signOutErr);
      }

      const portalNames: Record<string, string> = {
        admin: "admin",
        trucker: "driver",
        customer: "customer",
        subcontractor: "carrier",
      };
      return {
        success: false,
        error: `This account doesn't have ${portalNames[portalType]} access. Please use the correct portal for your account type.`,
      };
    }
  }

  const dashboard = DASHBOARDS[expectedRole] ?? "/";

  redirect(dashboard);
}

/**
 * Server Action: Sign up a new customer account.
 * Validates input with Zod, calls Supabase signUp with role metadata,
 * and returns success message about pending approval.
 */
export async function signupAction(
  _prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const raw = {
    companyName: formData.get("companyName") as string,
    fullName: formData.get("fullName") as string,
    email: formData.get("email") as string,
    phone: formData.get("phone") as string,
    password: formData.get("password") as string,
    confirmPassword: formData.get("confirmPassword") as string,
  };

  // Validate with Zod
  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Invalid input";
    return { success: false, error: firstError };
  }

  // Call Supabase signUp with customer role metadata
  const result = await signUp(parsed.data.email, parsed.data.password, {
    role: "customer" as UserRole,
    full_name: parsed.data.fullName,
    phone: parsed.data.phone,
    company_name: parsed.data.companyName,
  });

  if (result.error) {
    if (result.error.includes("not configured")) {
      return {
        success: false,
        error: "System not configured yet. Please contact the administrator.",
      };
    }
    if (result.error.includes("already registered")) {
      return {
        success: false,
        error: "An account with this email already exists.",
      };
    }
    return { success: false, error: result.error };
  }

  return {
    success: true,
    message:
      "Account created! You can now log in.",
  };
}

/**
 * Server Action: Sign up a new trucker (driver) account.
 * Requires first name, last name, phone, email, password.
 * Account is created with role "driver" and status "active".
 */
export async function truckerSignupAction(
  _prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const raw = {
    firstName: formData.get("firstName") as string,
    lastName: formData.get("lastName") as string,
    phone: formData.get("phone") as string,
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    confirmPassword: formData.get("confirmPassword") as string,
  };

  // Validate with Zod
  const parsed = truckerSignupSchema.safeParse(raw);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Invalid input";
    return { success: false, error: firstError };
  }

  const fullName = `${parsed.data.firstName} ${parsed.data.lastName}`;

  // Call Supabase signUp with driver role metadata
  const result = await signUp(parsed.data.email, parsed.data.password, {
    role: "driver" as UserRole,
    full_name: fullName,
    phone: parsed.data.phone,
  });

  if (result.error) {
    if (result.error.includes("not configured")) {
      return {
        success: false,
        error: "System not configured yet. Please contact the administrator.",
      };
    }
    if (result.error.includes("already registered")) {
      return {
        success: false,
        error: "An account with this email already exists.",
      };
    }
    return { success: false, error: result.error };
  }

  return {
    success: true,
    message:
      "Account created! You can now log in.",
  };
}

/**
 * Server Action: Send a password reset email.
 * Validates email with Zod, calls Supabase resetPasswordForEmail.
 */
export async function forgotPasswordAction(
  _prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const raw = {
    email: formData.get("email") as string,
  };

  // Validate with Zod
  const parsed = passwordResetSchema.safeParse(raw);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Invalid input";
    return { success: false, error: firstError };
  }

  // Call Supabase
  const result = await resetPassword(parsed.data.email);

  if (result.error) {
    if (result.error.includes("not configured")) {
      return {
        success: false,
        error: "System not configured yet. Please contact the administrator.",
      };
    }
    return { success: false, error: result.error };
  }

  return {
    success: true,
    message: "Check your email for a password reset link.",
  };
}

/**
 * Server Action: Sign up a new subcontractor (carrier) account.
 * Requires company name, contact name, email, phone, optional MC/DOT number, password.
 * Account is created with role "carrier" and status "active".
 */
export async function subcontractorSignupAction(
  _prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const raw = {
    companyName: formData.get("companyName") as string,
    contactName: formData.get("contactName") as string,
    email: formData.get("email") as string,
    phone: formData.get("phone") as string,
    mcNumber: (formData.get("mcNumber") as string) || undefined,
    dotNumber: (formData.get("dotNumber") as string) || undefined,
    password: formData.get("password") as string,
    confirmPassword: formData.get("confirmPassword") as string,
  };

  // Validate with Zod
  const parsed = subcontractorSignupSchema.safeParse(raw);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Invalid input";
    return { success: false, error: firstError };
  }

  // Call Supabase signUp with carrier role metadata
  const result = await signUp(parsed.data.email, parsed.data.password, {
    role: "carrier" as UserRole,
    full_name: parsed.data.contactName,
    phone: parsed.data.phone,
    company_name: parsed.data.companyName,
  });

  if (result.error) {
    if (result.error.includes("not configured")) {
      return {
        success: false,
        error: "System not configured yet. Please contact the administrator.",
      };
    }
    if (result.error.includes("already registered")) {
      return {
        success: false,
        error: "An account with this email already exists.",
      };
    }
    return { success: false, error: result.error };
  }

  return {
    success: true,
    message:
      "Account created! You can now log in.",
  };
}

/**
 * Server Action: Demo login for development.
 * When Supabase is not configured, sets a demo_role cookie and redirects.
 * When Supabase is configured, uses real auth with demo credentials.
 */
export async function demoLoginAction(role: string): Promise<AuthActionResult> {
  const dashboards: Record<string, string> = {
    admin: "/admin/dashboard",
    customer: "/customer/orders",
    driver: "/trucker/loads",
    carrier: "/subcontractor/dashboard",
  };

  const dashboard = dashboards[role];
  if (!dashboard) {
    return { success: false, error: "Unknown demo role" };
  }

  // Demo mode (no Supabase) -- just set a cookie and redirect
  const { isDemoMode } = await import("@/lib/demo");
  if (isDemoMode()) {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    cookieStore.set("demo_role", role, {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
    });
    redirect(dashboard);
  }

  // With Supabase -- use real auth with demo credentials
  const demoAccounts: Record<string, { email: string; password: string }> = {
    admin: { email: "admin@demo.jft", password: "demo1234" },
    customer: { email: "customer@demo.jft", password: "demo1234" },
    driver: { email: "driver@demo.jft", password: "demo1234" },
    carrier: { email: "carrier@demo.jft", password: "demo1234" },
  };

  const account = demoAccounts[role];
  if (!account) {
    return { success: false, error: "Unknown demo role" };
  }

  const result = await signIn(account.email, account.password);

  if (result.error) {
    return { success: false, error: result.error };
  }

  redirect(dashboard);
}
