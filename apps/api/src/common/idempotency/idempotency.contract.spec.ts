import { isValidIdempotencyKey } from './idempotency.contract.js';

describe('isValidIdempotencyKey', () => {
  it('accepts a sufficiently long opaque key', () => {
    expect(isValidIdempotencyKey('payment:2026-10:request-001')).toBe(true);
  });

  it('rejects short or unsafe keys', () => {
    expect(isValidIdempotencyKey('short')).toBe(false);
    expect(isValidIdempotencyKey('invalid key with spaces')).toBe(false);
  });
});
