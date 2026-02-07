// utils/uploadErrors.ts
export const TEMP_ERROR_MSG =
  "일시적 오류 입니다. 잠시 후 다시 시도 부탁드립니다.";

export function looksLikeQuota429(x: unknown) {
  const s = typeof x === "string" ? x : safeJson(x);
  const msg = s.toLowerCase();
  return (
    msg.includes("429") ||
    msg.includes("too many requests") ||
    msg.includes("rate limit") ||
    msg.includes("quota") ||
    msg.includes("insufficient_quota") ||
    msg.includes("exceeded your current quota")
  );
}

export function toUserMessage(e: unknown) {
  const isAbort = e instanceof DOMException && e.name === "AbortError";
  if (isAbort) return "요청이 취소되었습니다. 다시 시도해주세요.";

  const is429 =
    looksLikeQuota429(e) ||
    looksLikeQuota429(e instanceof Error ? e.message : undefined);

  if (is429) return TEMP_ERROR_MSG;

  if (e instanceof Error) return e.message;
  return "알 수 없는 오류가 발생했습니다.";
}

function safeJson(x: unknown) {
  try {
    return JSON.stringify(x ?? "");
  } catch {
    return String(x ?? "");
  }
}
