import imageCompression from "browser-image-compression";

const COMPRESSION_OPTIONS = {
  maxSizeMB: 2,
  maxWidthOrHeight: 2560,
  useWebWorker: true,
  preserveExif: false,
} as const;

export const isImageFile = (file: File) => file.type.startsWith("image/");

export async function compressUploadImage(file: File): Promise<File> {
  const compressed = await imageCompression(file, {
    ...COMPRESSION_OPTIONS,
    fileType: file.type,
  });
  const result = new File([compressed], file.name, {
    type: compressed.type || file.type,
    lastModified: file.lastModified,
  });
  const savingPercentage = file.size
    ? Math.max(0, ((file.size - result.size) / file.size) * 100)
    : 0;

  // Temporary diagnostics for validating client-side compression in production.
  console.info("[teacher-signup] Image compression", {
    fileName: file.name,
    originalSize: file.size,
    compressedSize: result.size,
    savingPercentage: `${savingPercentage.toFixed(2)}%`,
  });

  return result;
}
