"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";

interface PasswordInputProps
  extends Omit<React.ComponentProps<"input">, "type"> {
  className?: string;
}

/**
 * Password input with show/hide toggle.
 * Wraps the shadcn Input component with an eye icon button
 * that toggles between password and text visibility.
 * Accessible with proper aria labels.
 * Styled for dark theme with gold accents.
 */
export const PasswordInput = React.forwardRef<
  HTMLInputElement,
  PasswordInputProps
>(function PasswordInput({ className, ...props }, ref) {
  const [showPassword, setShowPassword] = React.useState(false);

  return (
    <div className="relative">
      <Input
        ref={ref}
        type={showPassword ? "text" : "password"}
        className={cn("pr-10 text-base", className)}
        {...props}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShowPassword((prev) => !prev)}
        className="absolute right-0 top-0 flex h-full items-center justify-center px-3 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
        aria-label={showPassword ? "Hide password" : "Show password"}
      >
        {showPassword ? (
          <EyeOff className="h-4 w-4" />
        ) : (
          <Eye className="h-4 w-4" />
        )}
      </button>
    </div>
  );
});
