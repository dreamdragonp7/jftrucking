"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Loader2, Trash2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { DeleteDialog } from "@/components/admin/DeleteDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createMaterial, deleteMaterial } from "../_actions/materials.actions";
import type { Material } from "@/types/database";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MaterialsSectionProps {
  materials: Material[];
}

// ---------------------------------------------------------------------------
// MaterialsSection
// ---------------------------------------------------------------------------

export function MaterialsSection({ materials }: MaterialsSectionProps) {
  const [name, setName] = useState("");
  const [unit, setUnit] = useState<"ton" | "load">("ton");
  const [isCreating, setIsCreating] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingMaterial, setDeletingMaterial] = useState<Material | null>(
    null
  );

  const handleCreate = useCallback(async () => {
    if (!name.trim()) return;
    setIsCreating(true);
    try {
      const result = await createMaterial({
        name: name.trim(),
        unit_of_measure: unit,
      });
      if (result.success) {
        toast.success("Material added");
        setName("");
      } else {
        toast.error(result.error);
      }
    } finally {
      setIsCreating(false);
    }
  }, [name, unit]);

  const handleDelete = useCallback(async () => {
    if (!deletingMaterial) return;
    const result = await deleteMaterial(deletingMaterial.id);
    if (result.success) toast.success("Material deactivated");
    else toast.error(result.error);
  }, [deletingMaterial]);

  return (
    <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-[var(--color-text-muted)]" />
          <div>
            <CardTitle className="text-base">Materials</CardTitle>
            <CardDescription>
              Sand, gravel, and other hauling materials
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new */}
        <div className="flex gap-2">
          <Input
            placeholder="Material name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            className="flex-1"
          />
          <Select
            value={unit}
            onValueChange={(v) => setUnit(v as typeof unit)}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ton">Ton</SelectItem>
              <SelectItem value="load">Load</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleCreate} disabled={isCreating || !name.trim()} size="sm">
            {isCreating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* List */}
        <div className="divide-y divide-[var(--color-border)]">
          {materials.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between py-2.5"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-[var(--color-text-primary)]">
                  {m.name}
                </span>
                <StatusBadge status={m.status} />
                <span className="text-xs text-[var(--color-text-muted)]">
                  {m.unit_of_measure}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => {
                  setDeletingMaterial(m);
                  setDeleteOpen(true);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          {materials.length === 0 && (
            <p className="text-sm text-[var(--color-text-muted)] py-4 text-center">
              No materials configured. Add your first material above.
            </p>
          )}
        </div>
      </CardContent>

      <DeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        entityName={deletingMaterial?.name ?? ""}
        onConfirm={handleDelete}
      />
    </Card>
  );
}
