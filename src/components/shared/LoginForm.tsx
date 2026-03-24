"use client";

import { useActionState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { toast } from "sonner";
import { motion } from "framer-motion";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/shared/PasswordInput";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Logo } from "@/components/shared/Logo";
import { loginSchema, type LoginInput } from "@/lib/schemas/auth";
import {
  loginAction,
  type AuthActionResult,
} from "@/app/(public)/_actions/auth.actions";

type PortalType = "admin" | "trucker" | "customer" | "subcontractor";

const PORTAL_CONFIG: Record<
  PortalType,
  { title: string; subtitle: string; placeholder: string }
> = {
  admin: {
    title: "Admin Portal",
    subtitle: "Sign in to manage dispatch and operations",
    placeholder: "admin@example.com",
  },
  trucker: {
    title: "Trucker Portal",
    subtitle: "Sign in to view your loads",
    placeholder: "driver@email.com",
  },
  customer: {
    title: "Customer Portal",
    subtitle: "Sign in to manage orders and deliveries",
    placeholder: "you@company.com",
  },
  subcontractor: {
    title: "Subcontractor Portal",
    subtitle: "Carrier & subcontractor portal",
    placeholder: "carrier@company.com",
  },
};

interface LoginFormProps {
  portalType: PortalType;
}

/**
 * Reusable login form component used by all three portal login pages.
 * Uses React Hook Form + Zod validation + Server Actions.
 * Shows proper loading, error, and success states.
 */
export function LoginForm({ portalType }: LoginFormProps) {
  const config = PORTAL_CONFIG[portalType];
  const emailRef = useRef<HTMLInputElement>(null);

  // Bind the server action with the portal type
  const boundLoginAction = loginAction.bind(null, portalType);
  const [state, formAction, isPending] = useActionState<
    AuthActionResult | null,
    FormData
  >(boundLoginAction, null);

  // React Hook Form for client-side validation
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Show error toast when server action returns an error
  useEffect(() => {
    if (state?.error) {
      toast.error(state.error);
    }
  }, [state]);

  // Autofocus email field on mount
  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-sm px-4"
    >
      {/* Header */}
      <div className="flex flex-col items-center mb-8">
        <Logo size="lg" className="mb-4" />
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.3 }}
          className="text-xl font-bold text-brand-brown"
        >
          {config.title}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="text-sm text-[var(--color-text-secondary)] mt-1"
        >
          {config.subtitle}
        </motion.p>
      </div>

      {/* Form Card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-xl border border-[var(--color-border)] bg-surface p-6"
      >
        <Form {...form}>
          <form
            action={formAction}
            className="flex flex-col gap-4"
            aria-label={`${config.title} sign in`}
          >
            {/* Email */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[var(--color-text-secondary)]">
                    Email
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      ref={(e) => {
                        field.ref(e);
                        (emailRef as React.MutableRefObject<HTMLInputElement | null>).current = e;
                      }}
                      type="email"
                      name="email"
                      autoComplete="email"
                      placeholder={config.placeholder}
                      disabled={isPending}
                      className="text-base bg-surface-deep"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Password */}
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[var(--color-text-secondary)]">
                    Password
                  </FormLabel>
                  <FormControl>
                    <PasswordInput
                      {...field}
                      name="password"
                      autoComplete="current-password"
                      placeholder="Enter password"
                      disabled={isPending}
                      className="bg-surface-deep"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isPending}
              className="w-full h-14 text-base font-semibold bg-brand-gold text-[var(--color-text-on-gold)] hover:bg-gold-400 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] mt-1"
            >
              {isPending ? (
                <span className="flex items-center gap-2">
                  <LoadingSpinner size="sm" className="border-[var(--color-text-on-gold)]/30 border-t-[var(--color-text-on-gold)]" />
                  Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </Form>
      </motion.div>

      {/* Footer Links */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.3 }}
        className="mt-6 flex flex-col items-center gap-2.5"
      >
        <Link
          href="/forgot-password"
          className="text-sm text-[var(--color-text-muted)] hover:text-brand-brown transition-colors"
        >
          Forgot password?
        </Link>

        {portalType === "customer" && (
          <Link
            href="/customer/signup"
            className="text-sm text-brand-brown hover:text-brown-400 transition-colors"
          >
            Don&apos;t have an account? Sign up
          </Link>
        )}

        {portalType === "trucker" && (
          <Link
            href="/trucker/signup"
            className="text-sm text-brand-brown hover:text-brown-400 transition-colors"
          >
            Don&apos;t have an account? Sign up
          </Link>
        )}

        {portalType === "subcontractor" && (
          <Link
            href="/subcontractor/signup"
            className="text-sm text-brand-brown hover:text-brown-400 transition-colors"
          >
            Don&apos;t have an account? Sign up
          </Link>
        )}

        <Link
          href="/"
          className="text-sm text-[var(--color-text-muted)] hover:text-brand-brown transition-colors"
        >
          &larr; Back to portal selection
        </Link>
      </motion.div>
    </motion.div>
  );
}
