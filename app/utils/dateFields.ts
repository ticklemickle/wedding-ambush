// src/utils/dateFields.ts
export const onlyDigits = (s: string) => s.replace(/\D/g, "");

export const getYearRange = (base = new Date()) => {
  const minY = base.getFullYear();
  const maxY = base.getFullYear() + 3;
  return { minY, maxY };
};

export const lastDayOfMonth = (y: number, m: number) =>
  new Date(y, m, 0).getDate(); // m: 1~12

// 입력 중: 숫자만 + 길이 제한
export const sanitizeYearInput = (v: string) => onlyDigits(v).slice(0, 4);
export const sanitizeMonthInput = (v: string) => onlyDigits(v).slice(0, 2);
export const sanitizeDayInput = (v: string) => onlyDigits(v).slice(0, 2);

// 확정(blur) 시: 범위 밖이면 ""로 되돌림(= 무효/입력불가 상태)
export const normalizeYear = (raw: string) => {
  const s = sanitizeYearInput(raw);
  if (s.length !== 4) return "";

  const y = Number(s);
  const { minY, maxY } = getYearRange();
  if (!Number.isFinite(y) || y < minY || y > maxY) return "";

  return String(y);
};

export const normalizeMonth = (raw: string) => {
  const s = sanitizeMonthInput(raw);
  if (s.length === 0) return "";

  const m = Number(s);
  if (!Number.isFinite(m) || m < 1 || m > 12) return "";

  return String(m);
};

export const normalizeDay = (raw: string) => {
  const s = sanitizeDayInput(raw);
  if (s.length === 0) return "";

  const d = Number(s);
  if (!Number.isFinite(d) || d < 1 || d > 31) return "";

  return String(d);
};

// 존재하지 않는 날짜면 day를 ""로 되돌림
export const validateDayForYearMonth = (
  year: string,
  month: string,
  day: string,
) => {
  if (!year || !month || !day) return day;

  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d))
    return "";

  const maxD = lastDayOfMonth(y, m);
  if (d > maxD) return "";

  return day;
};
