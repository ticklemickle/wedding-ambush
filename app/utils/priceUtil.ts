// src/utils/price.ts

export const onlyDigits = (value: string) => value.replace(/\D/g, "");

export const formatNumber = (value: string) => {
  if (!value) return "";
  return Number(value).toLocaleString("ko-KR");
};

export const clampNumber = (value: string, min: number, max: number) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "";
  return String(Math.min(Math.max(numeric, min), max));
};

// 입력 중 처리 (숫자만)
export const handlePriceInput = (value: string) => {
  return onlyDigits(value);
};

// blur 시 범위 보정 + 포맷
export const normalizePrice = (value: string, min: number, max: number) => {
  if (!value) return "";
  const clamped = clampNumber(value, min, max);
  return formatNumber(clamped);
};

// src/utils/moneyInput.ts
export const digitsOnly = (s: string) => s.replace(/\D/g, "");

export const formatWithComma = (digits: string) => {
  if (!digits) return "";
  // Number로 바꿔도 되지만, 안전하게 BigInt로도 가능.
  // 여기선 범위가 충분히 작으니 Number 사용.
  return Number(digits).toLocaleString("ko-KR");
};

export const maxDigitsFromMax = (max: number) => String(max).length;

// 입력 중 실시간 포맷 + 자리수 제한
export const applyMoneyChange = (raw: string, maxDigits: number) => {
  const digits = digitsOnly(raw).slice(0, maxDigits);
  return formatWithComma(digits);
};

// 현재 표시값(콤마 포함)을 숫자로 파싱
export const parseMoney = (formatted: string) => {
  const digits = digitsOnly(formatted);
  if (!digits) return null;
  const n = Number(digits);
  return Number.isFinite(n) ? n : null;
};

export const isMoneyValid = (
  formatted: string,
  min: number,
  max: number,
  required: boolean,
) => {
  const n = parseMoney(formatted);
  if (n === null) return !required; // required면 invalid
  return n >= min && n <= max;
};

// blur 시 범위 밖이면 clamp(또는 빈값 처리 선택 가능)
export const normalizeOnBlur = (
  formatted: string,
  min: number,
  max: number,
  required: boolean,
) => {
  const n = parseMoney(formatted);

  if (n === null) return required ? "" : "";

  const clamped = Math.min(Math.max(n, min), max);
  return formatWithComma(String(clamped));
};
