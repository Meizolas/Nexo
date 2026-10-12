import { isAllowedSortField } from './sort-options.dto.js';

describe('isAllowedSortField', () => {
  const allowedFields = ['createdAt', 'name'] as const;

  it('accepts only explicitly allowed fields', () => {
    expect(isAllowedSortField('name', allowedFields)).toBe(true);
    expect(isAllowedSortField('password', allowedFields)).toBe(false);
    expect(isAllowedSortField(undefined, allowedFields)).toBe(false);
  });
});
