/**
 * Format phone number as +7 (XXX) XXX-XX-XX
 * Only allows digits, auto-adds +7 prefix
 */
export function formatPhone(value: string): string {
  // Remove everything except digits
  const digits = value.replace(/\D/g, '');

  // Limit to 11 digits (7 + 10)
  let d = digits;
  if (d.startsWith('8')) d = '7' + d.slice(1);
  if (d.startsWith('7')) d = d.slice(0, 11);
  else if (d.length > 10) d = '7' + d.slice(d.length - 10);

  if (d.length === 0) return '';
  if (d.length <= 1) return '+7';
  if (d.length <= 4) return `+7 (${d.slice(1)}`;
  if (d.length <= 7) return `+7 (${d.slice(1, 4)}) ${d.slice(4)}`;
  if (d.length <= 9) return `+7 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
  return `+7 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7, 9)}-${d.slice(9, 11)}`;
}

/**
 * Check if phone is complete (11 digits)
 */
export function isPhoneComplete(value: string): boolean {
  return value.replace(/\D/g, '').length === 11;
}
