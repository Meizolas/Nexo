import {
  formatCnjNumber,
  isValidCnjNumber,
  normalizeCnjNumber,
} from './cnj-number.js';

describe('CNJ process number', () => {
  const formatted = '0200043-65.2009.2.00.0000';

  it('normalizes and validates the official 20-digit structure', () => {
    expect(normalizeCnjNumber(formatted)).toBe('02000436520092000000');
    expect(isValidCnjNumber(formatted)).toBe(true);
  });

  it('rejects an invalid check digit or incomplete value', () => {
    expect(isValidCnjNumber('0200043-66.2009.2.00.0000')).toBe(false);
    expect(isValidCnjNumber('123')).toBe(false);
  });

  it('formats a normalized number', () => {
    expect(formatCnjNumber('02000436520092000000')).toBe(formatted);
  });
});
