'use client';

import { useCallback, useState } from 'react';

export interface UseBottomSheetOptions {
  snapPoints?: number[];
  initialSnap?: number;
  defaultOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  onSnapChange?: (index: number) => void;
}

export interface UseBottomSheetReturn {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  currentSnap: number;
  snapTo: (index: number) => void;
  sheetProps: {
    isOpen: boolean;
    onClose: () => void;
    snapPoints: number[];
    initialSnap: number;
  };
}

const DEFAULT_SNAP_POINTS: number[] = [0.4, 0.9];

export function useBottomSheet(options: UseBottomSheetOptions = {}): UseBottomSheetReturn {
  const {
    snapPoints = DEFAULT_SNAP_POINTS,
    initialSnap = 0,
    defaultOpen = false,
    onOpenChange,
    onSnapChange,
  } = options;

  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [currentSnap, setCurrentSnap] = useState(initialSnap);

  const open = useCallback(() => {
    setIsOpen(true);
    onOpenChange?.(true);
  }, [onOpenChange]);

  const close = useCallback(() => {
    setIsOpen(false);
    onOpenChange?.(false);
  }, [onOpenChange]);

  const toggle = useCallback(() => {
    const next = !isOpen;
    setIsOpen(next);
    onOpenChange?.(next);
  }, [isOpen, onOpenChange]);

  const snapTo = useCallback((index: number) => {
    setCurrentSnap(index);
    onSnapChange?.(index);
  }, [onSnapChange]);

  return {
    isOpen,
    open,
    close,
    toggle,
    currentSnap,
    snapTo,
    sheetProps: {
      isOpen,
      onClose: close,
      snapPoints,
      initialSnap: currentSnap,
    },
  };
}
