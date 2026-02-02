export function generateJobId() {
  const now = new Date();
  const yyyyMMddHHmmss =
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0") +
    String(now.getHours()).padStart(2, "0") +
    String(now.getMinutes()).padStart(2, "0") +
    String(now.getSeconds()).padStart(2, "0");

  const random = getRandom5();

  return `${yyyyMMddHHmmss}${random}`;
}

export function getRandom5() {
  return Math.floor(Math.random() * 100000)
    .toString()
    .padStart(5, "0");
}

function stripExt(name: string) {
  const safe = name.replace(/[\\/]/g, "_"); // 경로문자 제거
  const idx = safe.lastIndexOf(".");
  return idx > 0 ? safe.slice(0, idx) : safe;
}
