export function generateJobId() {
  const now = new Date();
  const yyyyMMddHHmmss =
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0") +
    String(now.getHours()).padStart(2, "0") +
    String(now.getMinutes()).padStart(2, "0") +
    String(now.getSeconds()).padStart(2, "0");

  const random = getRandom3();

  return `${yyyyMMddHHmmss}${random}`;
}

export function getRandom3() {
  return Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
}
