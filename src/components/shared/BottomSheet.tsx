"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  motion,
  useDragControls,
  AnimatePresence,
  type PanInfo,
} from "framer-motion";
import { cn } from "@/lib/utils/cn";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useViewportDimensions } from "@/hooks/useViewportDimensions";

const DRAG_HANDLE_HEIGHT = 48;
const FAST_SWIPE_VELOCITY = 800;

export interface SnapPoint {
  height: number; // percentage of viewport (1-100)
  label?: string;
}

export interface BottomSheetRef {
  snapTo: (index: number) => void;
  expand: () => void;
  collapse: () => void;
  dismiss: () => void;
  currentSnap: number;
}

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  snapPoints?: SnapPoint[];
  initialSnap?: number;
  dismissible?: boolean;
  dismissVelocity?: number;
  header?: ReactNode;
  showHandle?: boolean;
  hasBackdrop?: boolean;
  backdropOpacity?: number;
  onSnapChange?: (index: number) => void;
  className?: string;
  children: ReactNode;
  dragFromHandleOnly?: boolean;
}

const DEFAULT_SNAP_POINTS: SnapPoint[] = [
  { height: 40, label: "Peek" },
  { height: 90, label: "Full" },
];

export const BottomSheet = forwardRef<BottomSheetRef, BottomSheetProps>(
  function BottomSheet(
    {
      isOpen,
      onClose,
      snapPoints = DEFAULT_SNAP_POINTS,
      initialSnap = 0,
      dismissible = true,
      dismissVelocity = 500,
      header,
      showHandle = true,
      hasBackdrop = true,
      backdropOpacity = 0.5,
      onSnapChange,
      className,
      children,
      dragFromHandleOnly = true,
    },
    ref
  ) {
    const effectiveSnapPoints =
      snapPoints.length > 0 ? snapPoints : DEFAULT_SNAP_POINTS;

    const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
    const dragControls = useDragControls();
    const [currentSnap, setCurrentSnap] = useState(initialSnap);
    const prefersReducedMotion = useReducedMotion();
    const { height: viewportHeight, isReady: viewportReady } =
      useViewportDimensions();

    const sheetRef = useRef<HTMLDivElement>(null);
    const isDragFromHandle = useRef(false);
    const isClosingRef = useRef(false);

    useEffect(() => {
      if (isOpen) {
        setPortalTarget(document.body);
      } else {
        setPortalTarget(null);
      }
    }, [isOpen]);

    useEffect(() => {
      isClosingRef.current = !isOpen;
    }, [isOpen]);

    // Body scroll lock
    useEffect(() => {
      if (!isOpen) return;
      const original = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = original;
      };
    }, [isOpen]);

    const springTransition = useMemo(() => {
      if (prefersReducedMotion) {
        return { type: "tween" as const, duration: 0.01 };
      }
      return { type: "spring" as const, stiffness: 300, damping: 30 };
    }, [prefersReducedMotion]);

    const getSnapPixels = useCallback(() => {
      return effectiveSnapPoints.map((sp) => {
        const clampedHeight = Math.max(1, Math.min(100, sp.height));
        return (clampedHeight / 100) * viewportHeight;
      });
    }, [effectiveSnapPoints, viewportHeight]);

    const getSnapHeight = useCallback(
      (snapIndex: number) => {
        const snapPixels = getSnapPixels();
        return snapPixels[snapIndex] || snapPixels[0];
      },
      [getSnapPixels]
    );

    const snapToNearest = useCallback(
      (y: number, velocity: number) => {
        const snapPixels = getSnapPixels();
        const currentHeight = viewportHeight - y;

        if (dismissible && velocity > FAST_SWIPE_VELOCITY) {
          onClose();
          return;
        }

        if (
          dismissible &&
          velocity > dismissVelocity &&
          currentHeight < snapPixels[0] * 0.5
        ) {
          onClose();
          return;
        }

        let nearestIndex = 0;
        let nearestDistance = Math.abs(currentHeight - snapPixels[0]);

        snapPixels.forEach((snapHeight, index) => {
          const distance = Math.abs(currentHeight - snapHeight);
          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestIndex = index;
          }
        });

        if (Math.abs(velocity) > 200) {
          const direction = velocity > 0 ? -1 : 1;
          const targetIndex = nearestIndex + direction;
          if (targetIndex >= 0 && targetIndex < snapPixels.length) {
            nearestIndex = targetIndex;
          } else if (targetIndex < 0 && dismissible) {
            onClose();
            return;
          }
        }

        setCurrentSnap(nearestIndex);
        onSnapChange?.(nearestIndex);
      },
      [
        dismissible,
        dismissVelocity,
        getSnapPixels,
        onClose,
        onSnapChange,
        viewportHeight,
      ]
    );

    const handleDragEnd = useCallback(
      (_: unknown, info: PanInfo) => {
        if (isClosingRef.current) {
          isDragFromHandle.current = false;
          return;
        }
        if (dragFromHandleOnly && !isDragFromHandle.current) return;
        snapToNearest(info.point.y, info.velocity.y);
        isDragFromHandle.current = false;
      },
      [snapToNearest, dragFromHandleOnly]
    );

    const handleDragStart = useCallback(
      (event: React.PointerEvent) => {
        if (!dragFromHandleOnly) {
          isDragFromHandle.current = true;
          return;
        }
        const sheet = sheetRef.current;
        if (!sheet) {
          isDragFromHandle.current = false;
          return;
        }
        const sheetRect = sheet.getBoundingClientRect();
        const relativeY = event.clientY - sheetRect.top;
        isDragFromHandle.current = relativeY <= DRAG_HANDLE_HEIGHT;
      },
      [dragFromHandleOnly]
    );

    useImperativeHandle(ref, () => ({
      snapTo: (index: number) => {
        if (index >= 0 && index < effectiveSnapPoints.length) {
          setCurrentSnap(index);
          onSnapChange?.(index);
        }
      },
      expand: () => {
        const lastIndex = effectiveSnapPoints.length - 1;
        setCurrentSnap(lastIndex);
        onSnapChange?.(lastIndex);
      },
      collapse: () => {
        setCurrentSnap(0);
        onSnapChange?.(0);
      },
      dismiss: onClose,
      currentSnap,
    }));

    const targetHeight = useMemo(
      () => getSnapHeight(currentSnap),
      [currentSnap, getSnapHeight]
    );

    if (!portalTarget || !viewportReady) return null;

    return createPortal(
      <AnimatePresence>
        {isOpen && (
          <div
            className="fixed inset-0 z-sheet pointer-events-auto"
            role="dialog"
            aria-modal="true"
          >
            {hasBackdrop && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: backdropOpacity }}
                exit={{ opacity: 0 }}
                onClick={dismissible ? onClose : undefined}
                className="absolute inset-0 bg-black"
                aria-hidden="true"
              />
            )}

            <motion.div
              ref={sheetRef}
              drag="y"
              dragControls={dragControls}
              dragListener={!dragFromHandleOnly}
              dragConstraints={{ top: 0 }}
              dragElastic={0.2}
              onPointerDown={dragFromHandleOnly ? undefined : handleDragStart}
              onDragEnd={handleDragEnd}
              animate={
                isOpen
                  ? { y: 0, height: targetHeight || getSnapHeight(0) }
                  : { y: "100%", height: getSnapHeight(0) }
              }
              initial={{ y: "100%" }}
              transition={springTransition}
              className={cn(
                "absolute bottom-0 left-0 right-0",
                "flex flex-col",
                "bg-surface",
                "rounded-t-2xl",
                "border-t border-[var(--color-border)]",
                "shadow-xl",
                "max-h-[95vh]",
                className
              )}
              style={{
                paddingBottom: "env(safe-area-inset-bottom, 0px)",
                minHeight: "10vh",
              }}
            >
              {showHandle && (
                <div
                  className={cn(
                    "flex justify-center pt-3 pb-2",
                    "cursor-grab active:cursor-grabbing",
                    "touch-none select-none"
                  )}
                  onPointerDown={(e) => {
                    isDragFromHandle.current = true;
                    dragControls.start(e);
                  }}
                >
                  <div className="w-12 h-1.5 rounded-full bg-gold-300/30" />
                </div>
              )}

              {header && (
                <div className="px-4 pb-3 border-b border-[var(--color-border)] bg-surface">
                  {header}
                </div>
              )}

              <div
                className={cn(
                  "flex-1 min-h-0",
                  "overflow-y-auto overscroll-contain",
                  "px-4 py-4",
                  "bg-surface"
                )}
                style={{ touchAction: "pan-y" }}
              >
                {children}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>,
      portalTarget
    );
  }
);
