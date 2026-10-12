import {
  isValidCnpj,
  isValidCpf,
  normalizeDigits,
} from './party-identifiers.js';

describe('party identifiers', () => {
  it('normalizes punctuation', () => {
    expect(normalizeDigits('529.982.247-25')).toBe('52998224725');
  });

  it('validates CPF check digits', () => {
    expect(isValidCpf('529.982.247-25')).toBe(true);
    expect(isValidCpf('111.111.111-11')).toBe(false);
  });

  it('validates CNPJ check digits', () => {
    expect(isValidCnpj('04.252.011/0001-10')).toBe(true);
    expect(isValidCnpj('11.111.111/1111-11')).toBe(false);
  });
});
