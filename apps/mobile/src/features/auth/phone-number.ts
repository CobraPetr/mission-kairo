const E164_PHONE_PATTERN = /^\+[1-9][0-9]{7,14}$/;

export function normalizePhoneNumber(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';

  const hasInternationalPrefix = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  return hasInternationalPrefix ? `+${digits}` : digits;
}

export function isE164PhoneNumber(value: string): boolean {
  return E164_PHONE_PATTERN.test(normalizePhoneNumber(value));
}
