/** Đọc 1 token màu của theme (xem style.css) — dùng cho A-Frame, vốn không hiểu CSS variable.
 * Màu không đổi lúc chạy nên đọc xong là cache luôn. */
const colorCache = new Map<string, string>();
export function themeColor(name: string): string {
  let value = colorCache.get(name);
  if (value === undefined) {
    value = getComputedStyle(document.documentElement).getPropertyValue(`--t-${name}`).trim();
    colorCache.set(name, value);
  }
  return value;
}
