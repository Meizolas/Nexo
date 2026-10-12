import { hasPermission } from './permissions.js';

describe('hasPermission', () => {
  it('supports role wildcards', () => {
    expect(hasPermission(['LAWYER'], [], 'legal.cases.read')).toBe(true);
    expect(hasPermission(['LAWYER'], [], 'real-estate.leases.read')).toBe(
      false,
    );
  });

  it('allows explicit staff grants', () => {
    expect(
      hasPermission(
        ['STAFF'],
        [{ permission: 'legal.deadlines.read', effect: 'ALLOW' }],
        'legal.deadlines.read',
      ),
    ).toBe(true);
  });

  it('gives explicit denial precedence', () => {
    expect(
      hasPermission(
        ['ORG_ADMIN'],
        [{ permission: 'audit.read', effect: 'DENY' }],
        'audit.read',
      ),
    ).toBe(false);
  });
});
