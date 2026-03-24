'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence, PanInfo, useDragControls } from 'framer-motion';
import { X } from 'lucide-react';

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  /** Snap points as percentages of viewport height (0-1) */
  snapPoints?: number[];
  /** Initial snap point index */
  initialSnap?: number;
  /** Allow dragging to dismiss */
  enableDrag?: boolean;
  /** Close on backdrop click */
  closeOnBackdrop?: boolean;
}

const DEFAULT_SNAP_POINTS = [0.5, 0.9];

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  children,
  title,
  snapPoints = DEFAULT_SNAP_POINTS,
  initialSnap = 0,
  enableDrag = true,
  closeOnBackdrop = true
}) => {
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();
  const [currentSnap, setCurrentSnap] = React.useState(initialSnap);

  // Calculate height based on snap point
  const getHeightFromSnap = (snapIndex: number) => {
    const snap = snapPoints[snapIndex] ?? snapPoints[0];
    return `${snap * 100}vh`;
  };

  // Handle drag end - snap to nearest point or close
  const handleDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      const velocity = info.velocity.y;
      const offset = info.offset.y;

      // If dragging down fast or far enough, close
      if (velocity > 500 || offset > 100) {
        onClose();
        return;
      }

      // If dragging up, snap to next point
      if (velocity < -300 && currentSnap < snapPoints.length - 1) {
        setCurrentSnap(currentSnap + 1);
        return;
      }

      // If dragging down, snap to previous point
      if (velocity > 300 && currentSnap > 0) {
        setCurrentSnap(currentSnap - 1);
      }
    },
    [currentSnap, snapPoints.length, onClose]
  );

  // Handle backdrop click
  const handleBackdropClick = useCallback(() => {
    if (closeOnBackdrop) {
      onClose();
    }
  }, [closeOnBackdrop, onClose]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-overlay bg-black/60 backdrop-blur-sm"
            onClick={handleBackdropClick}
            aria-hidden="true"
          />

          {/* Sheet */}
          <motion.div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'bottom-sheet-title' : undefined}
            initial={{ y: '100%' }}
            animate={{ y: 0, height: getHeightFromSnap(currentSnap) }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            drag={enableDrag ? 'y' : false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.1, bottom: 0.5 }}
            onDragEnd={handleDragEnd}
            className="fixed bottom-0 left-0 right-0 z-sheet flex flex-col
              bg-surface-elevated rounded-t-[32px] shadow-2xl
              border border-white/5 touch-none"
          >
            {/* Drag handle */}
            <div
              className="flex-shrink-0 pt-4 pb-3 cursor-grab active:cursor-grabbing"
              onPointerDown={(e) => enableDrag && dragControls.start(e)}
            >
              <div className="mx-auto w-12 h-1.5 rounded-full bg-white/20" />
            </div>

            {/* Header */}
            {title && (
              <div className="flex items-center justify-between px-6 pb-4 border-b border-white/10">
                <h2
                  id="bottom-sheet-title"
                  className="text-xl font-semibold text-white tracking-tight"
                >
                  {title}
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 -mr-2 rounded-full hover:bg-white/10 transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-6 scrollbar-hide">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
