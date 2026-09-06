export function normalizeHex(value: string): string | null {
  const hex = value.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(hex)) return hex;
  if (/^#[0-9a-f]{3}$/.test(hex))
    return `#${hex
      .slice(1)
      .split("")
      .map((digit) => digit.repeat(2))
      .join("")}`;
  return null;
}
