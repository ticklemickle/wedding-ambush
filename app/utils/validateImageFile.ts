const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "heic"] as const;
type AllowedExt = (typeof ALLOWED_EXTENSIONS)[number];

export function validateImageFile(
  file: File
): { ok: true } | { ok: false; reason: string } {
  // 1) MIME 체크 (1차)
  if (!file.type.startsWith("image/")) {
    return { ok: false, reason: "이미지 파일만 업로드할 수 있어요." };
  }

  // 2) 확장자 체크 (2차)
  const name = file.name ?? "";
  const ext = name.split(".").pop()?.toLowerCase();

  if (!ext) {
    return {
      ok: false,
      reason: "파일 확장자를 확인할 수 없어요. 이미지 파일만 가능해요.",
    };
  }

  if (!ALLOWED_EXTENSIONS.includes(ext as AllowedExt)) {
    return {
      ok: false,
      reason: "지원하지 않는 확장자예요. 이미지 파일만 가능해요.",
    };
  }

  // 3) 용량 제한 (20MB)
  const MAX = 20 * 1024 * 1024;
  if (file.size > MAX) {
    return {
      ok: false,
      reason: "파일이 너무 큽니다. 최대 20MB까지 업로드할 수 있어요.",
    };
  }

  return { ok: true };
}
