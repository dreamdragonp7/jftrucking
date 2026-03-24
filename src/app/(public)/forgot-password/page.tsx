"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { MailCheck } from "lucide-react";

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
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Logo } from "@/components/shared/Logo";
import {
  passwordResetSchema,
  type PasswordResetInput,
} from "@/lib/schemas/auth";
import {
  forgotPasswordAction,
  type AuthActionResult,
} from "@/app/(public)/_actions/auth.actions";

export default function ForgotPasswordPage() {
  const emailRef = useRef<HTMLInputElement>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const [state, formAction, isPending] = useActionState<
    AuthActionResult | null,
    FormData
  >(forgotPasswordAction, null);

  const form = useForm<PasswordResetInput>({
    resolver: zodResolver(passwordResetSchema),
    defaultValues: {
      email: "",
    },
  });

  // Handle server action results
  useEffect(() => {
    if (state?.error) {
      toast.error(state.error);
    }
    if (state?.success && state?.message) {
      setShowSuccess(true);
    }
  }, [state]);

  // Autofocus
  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  // Success state
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
          <div className="w-16 h-16 rounded-full bg-brand-gold/10 flex items-center justify-center mb-4">
            <MailCheck className="w-8 h-8 text-brand-brown" />
          </div>
          <h1 className="text-xl font-bold text-brand-brown mb-2">
            Check Your Email
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
            {state?.message}
          </p>
        </div>

        <Link
          href="/"
          className="inline-flex items-center justify-center w-full h-12 rounded-lg border border-[var(--color-border)] text-base font-medium text-[var(--color-text-primary)] hover:bg-surface-hover transition-all duration-200"
        >
          Back to sign in
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
      <div className="flex flex-col items-center mb-8">
        <Logo size="lg" className="mb-4" />
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.3 }}
          className="text-xl font-bold text-brand-brown"
        >
          Reset Password
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="text-sm text-[var(--color-text-secondary)] mt-1 text-center"
        >
          Enter your email and we&apos;ll send you a reset link
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
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="your@email.com"
                      disabled={isPending}
                      className="text-base bg-surface-deep"
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
              className="w-full h-12 text-base font-semibold bg-brand-gold text-[var(--color-text-on-gold)] hover:bg-gold-400 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] mt-1"
            >
              {isPending ? (
                <span className="flex items-center gap-2">
                  <LoadingSpinner size="sm" className="border-[var(--color-text-on-gold)]/30 border-t-[var(--color-text-on-gold)]" />
                  Sending...
                </span>
              ) : (
                "Send Reset Link"
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
          href="/"
          className="text-sm text-[var(--color-text-muted)] hover:text-brown-400 transition-colors"
        >
          &larr; Back to sign in
        </Link>
      </motion.div>
    </motion.div>
  );
}
