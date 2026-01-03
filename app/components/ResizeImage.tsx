// components/ResizeImage.tsx

export async function resizeImageFile(
  file: File,
  maxLongSide = 1600,
  quality = 0.85
): Promise<File> {
  const bitmap = await createImageBitmap(file);

  const { width, height } = bitmap;
  const longSide = Math.max(width, height);

  // 이미 충분히 작으면 그대로 반환
  if (longSide <= maxLongSide) {
    return file;
  }

  const scale = maxLongSide / longSide;
  const targetWidth = Math.round(width * scale);
  const targetHeight = Math.round(height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);

  const blob: Blob = await new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b!), "image/jpeg", quality);
  });

  // File 객체로 재생성 (확장자 jpg로 통일)
  const newName = file.name.replace(/\.(png|jpeg|jpg)$/i, ".jpg");

  return new File([blob], newName, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}
