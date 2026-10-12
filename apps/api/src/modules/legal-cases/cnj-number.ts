export function normalizeCnjNumber(value: string): string {
  return value.replace(/\D/g, '');
}

export function isValidCnjNumber(value: string): boolean {
  const digits = normalizeCnjNumber(value);
  if (!/^\d{20}$/.test(digits)) return false;

  const suppliedCheckDigits = Number(digits.slice(7, 9));
  const base = `${digits.slice(0, 7)}${digits.slice(9)}00`;
  const expectedCheckDigits = 98 - Number(BigInt(base) % 97n);
  return suppliedCheckDigits === expectedCheckDigits;
}

export function formatCnjNumber(value: string): string {
  const digits = normalizeCnjNumber(value);
  if (digits.length !== 20) return value;
  return `${digits.slice(0, 7)}-${digits.slice(7, 9)}.${digits.slice(9, 13)}.${digits.slice(13, 14)}.${digits.slice(14, 16)}.${digits.slice(16)}`;
}
