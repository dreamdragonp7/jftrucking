"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";

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
import {
  truckerSignupSchema,
  type TruckerSignupInput,
} from "@/lib/schemas/auth";
import {
  truckerSignupAction,
  type AuthActionResult,
} from "@/app/(public)/_actions/auth.actions";

export default function TruckerSignupPage() {
  const firstNameRef = useRef<HTMLInputElement>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const [state, formAction, isPending] = useActionState<
    AuthActionResult | null,
    FormData
  >(truckerSignupAction, null);

  const form = useForm<TruckerSignupInput>({
    resolver: zodResolver(truckerSignupSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (state?.error) {
      toast.error(state.error);
    }
    if (state?.success && state?.message) {
      setShowSuccess(true);
    }
  }, [state]);

  useEffect(() => {
    firstNameRef.current?.focus();
  }, []);

  // Success state — account pending approval
  if (showSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm px-4 text-center"
      >
        <div className="flex flex-col items-center mb-6">
          <Logo size="lg" className="mb-4" />
          <div className="w-16 h-16 rounded-full bg-[var(--color-success-muted)] flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-[var(--color-success)]" />
          </div>
          <h1 className="text-xl font-bold text-brand-brown mb-2">
            Account Created!
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
            {state?.message}
          </p>
        </div>

        <Link
          href="/trucker/login"
          className="inline-flex items-center justify-center w-full h-14 rounded-lg bg-brand-gold text-base font-semibold text-[var(--color-text-on-gold)] hover:bg-gold-400 transition-all duration-200 touch-target-large"
        >
          Go to Sign In
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-sm px-4"
    >
      {/* Header */}
      <div className="flex flex-col items-center mb-6">
        <Logo size="lg" className="mb-4" />
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.3 }}
          className="text-xl font-bold text-brand-brown"
        >
          Driver Sign Up
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="text-sm text-[var(--color-text-secondary)] mt-1 text-center"
        >
          Create your trucker portal account
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
          <form action={formAction} className="flex flex-col gap-4">
            {/* Name row — side by side */}
            <div className="grid grid-cols-2 gap-3">
              {/* First Name */}
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[var(--color-text-secondary)]">
                      First Name
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        ref={(e) => {
                          field.ref(e);
                          (
                            firstNameRef as React.MutableRefObject<HTMLInputElement | null>
                          ).current = e;
                        }}
                        name="firstName"
                        autoComplete="given-name"
                        placeholder="John"
                        disabled={isPending}
                        className="text-base bg-surface-deep h-12"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Last Name */}
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[var(--color-text-secondary)]">
                      Last Name
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        name="lastName"
                        autoComplete="family-name"
                        placeholder="Smith"
                        disabled={isPending}
                        className="text-base bg-surface-deep h-12"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Phone */}
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[var(--color-text-secondary)]">
                    Phone Number
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      name="phone"
                      type="tel"
                      autoComplete="tel"
                      placeholder="(512) 555-0100"
                      disabled={isPending}
                      className="text-base bg-surface-deep h-12"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="driver@email.com"
                      disabled={isPending}
                      className="text-base bg-surface-deep h-12"
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
                      autoComplete="new-password"
                      placeholder="Create a password"
                      disabled={isPending}
                      className="bg-surface-deep h-12"
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Must be at least 8 characters
                  </p>
                </FormItem>
              )}
            />

            {/* Confirm Password */}
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[var(--color-text-secondary)]">
                    Confirm Password
                  </FormLabel>
                  <FormControl>
                    <PasswordInput
                      {...field}
                      name="confirmPassword"
                      autoComplete="new-password"
                      placeholder="Re-enter password"
                      disabled={isPending}
                      className="bg-surface-deep h-12"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Submit */}
            <Button
              type="submit"
              disabled={isPending}
              className="w-full h-14 text-base font-semibold bg-brand-gold text-[var(--color-text-on-gold)] hover:bg-gold-400 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] mt-1 touch-target-large"
            >
              {isPending ? (
                <span className="flex items-center gap-2">
                  <LoadingSpinner
                    size="sm"
                    className="border-[var(--color-text-on-gold)]/30 border-t-[var(--color-text-on-gold)]"
                  />
                  Creating account...
                </span>
              ) : (
                "Create Account"
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
          href="/trucker/login"
          className="text-sm text-brand-brown hover:text-brown-400 transition-colors"
        >
          Already have an account? Sign in
        </Link>
        <Link
          href="/"
          className="text-sm text-[var(--color-text-muted)] hover:text-brown-400 transition-colors"
        >
          &larr; Back to portal selection
        </Link>
      </motion.div>
    </motion.div>
  );
}
