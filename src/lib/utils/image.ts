/**
 * Image compression utilities for scale ticket photos.
 * Uses HTML Canvas API to resize and compress images before upload.
 * Critical for construction sites with limited bandwidth.
 */

/**
 * Compress an image file by resizing and converting to JPEG.
 *
 * @param file - The original image File from camera/file input
 * @param maxWidth - Maximum width in pixels (default 1200)
 * @param quality - JPEG quality 0-1 (default 0.7)
 * @returns A compressed Blob ready for upload
 */
export async function compressImage(
  file: File,
  maxWidth: number = 1200,
  quality: number = 0.7
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = () => {
      img.onload = () => {
        try {
          // Calculate new dimensions maintaining aspect ratio
          let { width, height } = img;
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          // Draw to canvas at new size
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Could not get canvas context"));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          // Convert to blob
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error("Failed to compress image"));
                return;
              }
              resolve(blob);
            },
            "image/jpeg",
            quality
          );
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = reader.result as string;
    };

    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

/**
 * Create a thumbnail data URL from an image file.
 * Used for preview display before upload.
 *
 * @param file - The image File
 * @param maxSize - Maximum dimension in pixels (default 200)
 * @returns A data URL string for the thumbnail
 */
export async function createThumbnail(
  file: File,
  maxSize: number = 200
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = () => {
      img.onload = () => {
        try {
          let { width, height } = img;
          if (width > height) {
            if (width > maxSize) {
              height = Math.round((height * maxSize) / width);
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = Math.round((width * maxSize) / height);
              height = maxSize;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Could not get canvas context"));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.6));
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = reader.result as string;
    };

    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}
