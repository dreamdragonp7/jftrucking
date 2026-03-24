"use client";

import type { ReactNode } from "react";
import { useMediaQuery, BREAKPOINTS } from "@/hooks/useMediaQuery";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
}

// ---------------------------------------------------------------------------
// FormDialog — Dialog on desktop, Drawer on mobile
// ---------------------------------------------------------------------------

export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
}: FormDialogProps) {
  const { matches: isDesktop } = useMediaQuery(BREAKPOINTS.md);

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && (
              <DialogDescription>{description}</DialogDescription>
            )}
          </DialogHeader>
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="pb-1">{children}</div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{title}</DrawerTitle>
          {description && (
            <DrawerDescription>{description}</DrawerDescription>
          )}
        </DrawerHeader>
        <ScrollArea className="max-h-[70vh] px-4 pb-4">
          <div className="pb-1">{children}</div>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}
