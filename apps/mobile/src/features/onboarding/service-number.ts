export function createServiceNumber(username: string): string {
  const normalized = username.trim().toLowerCase() || 'recruit';
  let hash = 2166136261;

  for (const character of normalized) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }

  const digits = String(hash >>> 0)
    .padStart(10, '0')
    .slice(-8);
  return `MK-01-${digits.slice(0, 4)}-${digits.slice(4)}`;
}
