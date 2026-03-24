import type { Metadata } from "next";
import { Link as LinkIcon } from "lucide-react";
import { QuickBooksClient } from "./_components/QuickBooksClient";

export const metadata: Metadata = {
  title: "QuickBooks",
};

export default function QuickBooksPage() {
  return (
    <div className="animate-slide-up-fade">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-brown-700 text-[var(--color-text-on-brown)]">
          <LinkIcon className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
            QuickBooks
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            QuickBooks Online sync and reconciliation
          </p>
        </div>
      </div>

      <QuickBooksClient />
    </div>
  );
}
