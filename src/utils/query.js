export function normalizeSearchText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[+/,]+/g, " ")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
