"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, type Variants } from "framer-motion";
import { Shield, Truck, Building2, Handshake, ArrowRight } from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { demoLoginAction } from "./_actions/auth.actions";
import type { LucideIcon } from "lucide-react";

interface PortalCard {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
  demoRole: string;
  colorLabel: string;
}

const PORTALS: PortalCard[] = [
  {
    label: "Admin",
    description: "Dispatch, invoicing, and fleet management",
    href: "/admin/login",
    icon: Shield,
    demoRole: "admin",
    colorLabel: "gold",
  },
  {
    label: "Trucker",
    description: "View loads, confirm deliveries",
    href: "/trucker/login",
    icon: Truck,
    demoRole: "driver",
    colorLabel: "blue",
  },
  {
    label: "Customer",
    description: "Place orders, track deliveries, pay invoices",
    href: "/customer/login",
    icon: Building2,
    demoRole: "customer",
    colorLabel: "green",
  },
  {
    label: "Carrier",
    description: "Subcontractor portal — settlements & fleet",
    href: "/subcontractor/login",
    icon: Handshake,
    demoRole: "carrier",
    colorLabel: "purple",
  },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.3,
    },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 200, damping: 20 },
  },
};

const isDev = process.env.NODE_ENV === "development";

export default function HomePage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [loadingRole, setLoadingRole] = useState<string | null>(null);

  function handleDemoLogin(role: string) {
    setLoadingRole(role);
    startTransition(async () => {
      try {
        await demoLoginAction(role);
      } catch {
        // redirect throws
      }
      setLoadingRole(null);
    });
  }

  return (
    <main className="relative flex flex-col items-center justify-center w-full min-h-screen overflow-x-clip bg-[var(--color-surface-deep)]">

      {/* Background Ambient Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vh] h-[50vh] bg-brand-gold/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60vh] h-[60vh] bg-brand-brown/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Hero Content */}
      <div className="z-10 flex flex-col items-center w-full max-w-5xl px-4 mx-auto mt-12 sm:mt-24">

        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.7, type: "spring", bounce: 0.4 }}
          className="relative inline-block"
        >
          <div className="absolute inset-0 scale-[3] blur-[60px] bg-brand-gold/15 rounded-full" />
          <Logo size="xl" showText={false} className="relative z-10 drop-shadow-2xl" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-center mt-8 mb-16"
        >
          <h1 className="text-4xl font-extrabold tracking-tight text-[var(--color-text-primary)] sm:text-6xl md:text-7xl">
            Logistics. <span className="text-brand-gold">Mastered.</span>
          </h1>
          <p className="mt-4 text-lg font-medium tracking-wide text-[var(--color-text-secondary)] sm:text-xl">
            Select your portal to continue
          </p>
        </motion.div>

        {/* Portals Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:gap-6"
        >
          {PORTALS.map((portal) => {
            const Icon = portal.icon;
            return (
              <motion.div
                key={portal.href}
                variants={cardVariants}
                whileHover={{ y: -5 }}
                whileTap={{ scale: 0.96 }}
                className="group relative flex flex-col h-full"
              >
                {/* Glow behind card on hover */}
                <div className="absolute inset-0 transition-opacity duration-300 opacity-0 bg-brand-gold/10 blur-xl group-hover:opacity-100 rounded-3xl pointer-events-none" />

                <Link
                  href={portal.href}
                  className="relative flex flex-col h-full p-6 transition-all duration-300 border bg-[var(--color-surface)] border-[var(--color-border)] shadow-sm rounded-3xl hover:shadow-lg hover:border-brand-gold/50">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center justify-center w-12 h-12 transition-colors duration-300 rounded-2xl bg-brand-gold/10 group-hover:bg-brand-gold/20">
                      <Icon className="w-6 h-6 text-brand-gold" />
                    </div>
                    <ArrowRight className="w-5 h-5 transition-transform duration-300 transform translate-x-0 text-[var(--color-text-muted)] group-hover:text-brand-gold group-hover:translate-x-1" />
                  </div>

                  <div className="flex-1 mt-2">
                    <h3 className="text-xl font-bold tracking-tight text-[var(--color-text-primary)] group-hover:text-brand-gold transition-colors">
                      {portal.label}
                    </h3>
                    <p className="mt-2 text-sm text-[var(--color-text-secondary)] leading-relaxed font-medium">
                      {portal.description}
                    </p>
                  </div>
                </Link>

                {/* Dev-only demo login button */}
                {isDev && (
                  <button
                    onClick={() => handleDemoLogin(portal.demoRole)}
                    disabled={isPending}
                    className="relative z-10 mt-3 w-full h-10 text-sm font-semibold transition-all duration-200 border border-brand-gold/30 rounded-xl bg-brand-gold/10 text-brand-gold hover:bg-brand-gold hover:text-black flex items-center justify-center disabled:opacity-50"
                  >
                    {loadingRole === portal.demoRole ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      "Demo Login"
                    )}
                  </button>
                )}
              </motion.div>
            );
          })}
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 1 }}
          className="mt-24 mb-8 text-xs font-medium tracking-wide text-[var(--color-text-muted)] uppercase text-center"
        >
          &copy; {new Date().getFullYear()} J Fudge Trucking Inc.
        </motion.p>
      </div>
    </main>
  );
}
