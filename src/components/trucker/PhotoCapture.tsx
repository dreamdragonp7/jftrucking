"use client";

import { useCallback, useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { compressImage, createThumbnail } from "@/lib/utils/image";

interface PhotoCaptureProps {
  /** Called when a photo is captured (or removed). File is compressed. */
  onPhotoChange: (file: File | null) => void;
  /** Whether the component is disabled */
  disabled?: boolean;
}

/**
 * Camera capture component for scale ticket photos.
 *
 * - Opens the phone camera using `capture="environment"` (rear camera)
 * - Shows a thumbnail preview after capture
 * - Compresses images to max 1200px wide, JPEG quality 0.7
 * - Returns the compressed File object for upload
 * - Works offline (stores photo in memory for later upload)
 *
 * The photo is OPTIONAL — just backup evidence for disputes.
 */
export function PhotoCapture({ onPhotoChange, disabled }: PhotoCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCapture = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsProcessing(true);
      try {
        // Compress the image
        const compressed = await compressImage(file, 1200, 0.7);
        const compressedFile = new File([compressed], `ticket-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });

        // Create thumbnail for preview
        const thumb = await createThumbnail(file, 200);
        setThumbnail(thumb);

        onPhotoChange(compressedFile);
      } catch (error) {
        console.error("Failed to process photo:", error);
        // Fall back to original file if compression fails
        onPhotoChange(file);
        const reader = new FileReader();
        reader.onload = () => setThumbnail(reader.result as string);
        reader.readAsDataURL(file);
      } finally {
        setIsProcessing(false);
      }
    },
    [onPhotoChange]
  );

  const handleRemove = useCallback(() => {
    setThumbnail(null);
    onPhotoChange(null);
    // Reset the file input so the same file can be selected again
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }, [onPhotoChange]);

  return (
    <div className="space-y-2">
      {/* Hidden file input — opens camera on mobile */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCapture}
        disabled={disabled || isProcessing}
        className="hidden"
        aria-label="Take photo of scale ticket"
      />

      {thumbnail ? (
        /* Photo preview */
        <div className="relative inline-block">
          <div className="w-28 h-28 rounded-xl overflow-hidden border-2 border-[var(--color-border-strong)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumbnail}
              alt="Scale ticket photo"
              className="w-full h-full object-cover"
            />
          </div>
          {/* Remove button */}
          <button
            type="button"
            onClick={handleRemove}
            disabled={disabled}
            className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-[var(--color-danger)] text-white flex items-center justify-center shadow-md hover:bg-red-600 transition-colors"
            aria-label="Remove photo"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        /* Camera button */
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || isProcessing}
          className="flex items-center gap-3 w-full h-14 px-4 rounded-xl border border-dashed border-[var(--color-border-strong)] bg-surface hover:bg-surface-hover text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors touch-target-large disabled:opacity-50"
        >
          <Camera className="w-6 h-6 text-[var(--color-text-muted)]" />
          <span className="text-base">
            {isProcessing ? "Processing..." : "Take Photo (optional)"}
          </span>
        </button>
      )}
    </div>
  );
}
