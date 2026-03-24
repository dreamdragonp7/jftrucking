"use client";

import { motion } from "framer-motion";
import { Ban, Clock, ShieldX, UserX, XCircle, Phone, Mail } from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { JFT_COMPANY } from "@/lib/constants/company";
import type { ProfileStatus } from "@/types/database";

/**
 * Full-screen gate for non-active account statuses.
 * Handles pending, suspended, and deactivated states.
 */

interface AccountStatusGateProps {
  status: ProfileStatus;
  statusReason?: string | null;
  signOutAction: () => Promise<void>;
  portalName?: string;
}

const STATUS_CONFIG: Record<string, {
  icon: typeof Ban;
  iconBg: string;
  iconColor: string;
  title: string;
  message: string;
}> = {
  pending: {
    icon: Clock,
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    title: "Account Pending Approval",
    message: "Your account is pending approval. An administrator will review your application.",
  },
  inactive: {
    icon: Ban,
    iconBg: "bg-zinc-100",
    iconColor: "text-zinc-500",
    title: "Account Inactive",
    message: "Your account is currently inactive. Please contact J Fudge Trucking for more information.",
  },
  suspended: {
    icon: ShieldX,
    iconBg: "bg-red-100",
    iconColor: "text-red-600",
    title: "Account Suspended",
    message: "Your account has been suspended. Please contact J Fudge Trucking to resolve this issue.",
  },
  deactivated: {
    icon: UserX,
    iconBg: "bg-zinc-100",
    iconColor: "text-zinc-500",
    title: "Account Deactivated",
    message: "Your account has been deactivated. If you believe this is an error, please contact J Fudge Trucking.",
  },
  rejected: {
    icon: XCircle,
    iconBg: "bg-red-100",
    iconColor: "text-red-600",
    title: "Application Rejected",
    message: "Your application was not approved. Please contact J Fudge Trucking for more information.",
  },
};

export function AccountStatusGate({
  status,
  statusReason,
  signOutAction,
}: AccountStatusGateProps) {
  const config = STATUS_CONFIG[status];
  if (!config) return null;

  const Icon = config.icon;

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-surface-deep px-6 safe-all">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center text-center max-w-sm"
      >
        {/* Logo */}
        <Logo size="lg" className="mb-8" />

        {/* Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className={`w-20 h-20 rounded-full ${config.iconBg} flex items-center justify-center mb-6`}
        >
          <Icon className={`w-10 h-10 ${config.iconColor}`} />
        </motion.div>

        {/* Heading */}
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.3 }}
          className="text-2xl font-bold text-[var(--color-text-primary)] mb-3"
        >
          {config.title}
        </motion.h1>

        {/* Message */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.3 }}
          className="text-base text-[var(--color-text-secondary)] leading-relaxed mb-2"
        >
          {config.message}
        </motion.p>

        {/* Reason (if provided) */}
        {statusReason && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45, duration: 0.3 }}
            className="text-sm text-[var(--color-text-muted)] italic mb-4"
          >
            Reason: {statusReason}
          </motion.p>
        )}

        {/* Contact buttons — prominent and tappable */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.3 }}
          className="w-full flex flex-col gap-3 mb-6"
        >
          <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider text-center">
            Need help? Contact us
          </p>
          <a
            href={`tel:${JFT_COMPANY.phone}`}
            className="flex items-center justify-center gap-3 w-full h-14 rounded-xl bg-brand-gold text-[var(--color-text-on-gold)] text-base font-bold hover:bg-gold-400 transition-colors touch-target-large"
          >
            <Phone className="w-5 h-5" />
            Call {JFT_COMPANY.phone}
          </a>
          <a
            href={`mailto:${JFT_COMPANY.email}`}
            className="flex items-center justify-center gap-3 w-full h-14 rounded-xl border-2 border-brand-brown bg-transparent text-brand-brown text-base font-bold hover:bg-brand-brown/5 transition-colors touch-target-large"
          >
            <Mail className="w-5 h-5" />
            Email Us
          </a>
        </motion.div>

        {/* Sign Out button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55, duration: 0.3 }}
          className="w-full"
        >
          <form action={signOutAction}>
            <button
              type="submit"
              className="w-full h-12 rounded-xl border border-[var(--color-border)] bg-surface text-sm font-medium text-[var(--color-text-muted)] hover:bg-surface-hover hover:text-[var(--color-text-secondary)] transition-colors touch-target-large"
            >
              Sign Out
            </button>
          </form>
        </motion.div>
      </motion.div>
    </div>
  );
}
