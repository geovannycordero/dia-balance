const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.8;

export function computeTargetDimensions(
  width: number,
  height: number,
  maxDimension: number = MAX_DIMENSION,
): { width: number; height: number } {
  const longestSide = Math.max(width, height);
  if (longestSide <= maxDimension) {
    return { width, height };
  }

  const scale = maxDimension / longestSide;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

// ponytail: browser-only APIs (createImageBitmap/canvas) — not unit-tested under jsdom/node,
// verify manually per the plan's verification section.
export async function compressImage(file: File): Promise<{ blob: Blob; contentType: string }> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const { width, height } = computeTargetDimensions(bitmap.width, bitmap.height);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context unavailable');
    }
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
    );
    if (!blob) {
      throw new Error('Canvas encoding failed');
    }

    return { blob, contentType: 'image/jpeg' };
  } catch {
    return { blob: file, contentType: file.type };
  }
}
