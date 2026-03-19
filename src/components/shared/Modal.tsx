"use client";

import { forwardRef, useCallback, useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { BottomSheet, type BottomSheetProps } from "./BottomSheet";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useState } from "react";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  footer?: ReactNode;
  /** Force modal rendering even on mobile (skip BottomSheet conversion) */
  forceModal?: boolean;
  sheetProps?: Partial<BottomSheetProps>;
  className?: string;
  children: ReactNode;
}

/**
 * Adaptive Modal component.
 * On desktop: centered modal dialog.
 * On mobile: automatically converts to a BottomSheet for better UX.
 */
export const Modal = forwardRef<HTMLDivElement, ModalProps>(function Modal(
  {
    isOpen,
    onClose,
    title,
    description,
    size = "md",
    closeOnBackdrop = true,
    closeOnEscape = true,
    showCloseButton = true,
    footer,
    forceModal = false,
    sheetProps,
    className,
    children,
  },
  ref
) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const { matches: isMobile, isReady: mediaQueryReady } = useMediaQuery(
    "(max-width: 1023px)"
  );

  useEffect(() => {
    if (isOpen) {
      setPortalTarget(document.body);
    } else {
      setPortalTarget(null);
    }
  }, [isOpen]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, closeOnEscape, onClose]);

  // Body scroll lock (desktop only — BottomSheet handles its own)
  useEffect(() => {
    if (!isOpen || (isMobile && !forceModal)) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [isOpen, isMobile, forceModal]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (closeOnBackdrop && e.target === e.currentTarget) onClose();
    },
    [closeOnBackdrop, onClose]
  );

  if (!mediaQueryReady) return null;

  // Mobile: render as BottomSheet
  if (isMobile && !forceModal) {
    return (
      <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        snapPoints={[{ height: 90 }]}
        header={
          title ? (
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                  {title}
                </h2>
                {description && (
                  <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                    {description}
                  </p>
                )}
              </div>
              {showCloseButton && (
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="touch-target flex items-center justify-center rounded-lg hover:bg-surface-hover"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          ) : undefined
        }
        {...sheetProps}
      >
        <div>{children}</div>
        {footer && (
          <div className="pt-4 border-t border-[var(--color-border)] mt-4">
            {footer}
          </div>
        )}
      </BottomSheet>
    );
  }

  // Desktop: render as centered modal
  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    full: "max-w-[95vw] w-full",
  };

  if (!portalTarget) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-modal" ref={ref} suppressHydrationWarning>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleBackdropClick}
            className="absolute inset-0 bg-black/60"
            aria-hidden="true"
          />

          <div className="absolute inset-0 flex items-center justify-center p-4">
            <motion.div
              ref={modalRef}
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              role="dialog"
              aria-modal="true"
              aria-labelledby={title ? "modal-title" : undefined}
              aria-describedby={description ? "modal-description" : undefined}
              tabIndex={-1}
              className={cn(
                "relative w-full",
                sizeClasses[size],
                "bg-surface rounded-2xl",
                "border border-[var(--color-border)]",
                "shadow-2xl",
                "focus:outline-none",
                className
              )}
            >
              {(title || showCloseButton) && (
                <div className="flex items-start justify-between p-6 border-b border-[var(--color-border)]">
                  <div>
                    {title && (
                      <h2
                        id="modal-title"
                        className="text-xl font-semibold text-[var(--color-text-primary)]"
                      >
                        {title}
                      </h2>
                    )}
                    {description && (
                      <p
                        id="modal-description"
                        className="text-sm text-[var(--color-text-secondary)] mt-1"
                      >
                        {description}
                      </p>
                    )}
                  </div>
                  {showCloseButton && (
                    <button
                      onClick={onClose}
                      aria-label="Close modal"
                      className="touch-target flex items-center justify-center rounded-lg hover:bg-surface-hover -mr-2 -mt-2"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              )}

              <div className="p-6 overflow-y-auto max-h-[60vh]">{children}</div>

              {footer && (
                <div className="p-6 border-t border-[var(--color-border)] flex justify-end gap-3">
                  {footer}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>,
    portalTarget
  );
});
