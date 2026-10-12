import { createPaginatedResponse } from './paginated-response.js';

describe('createPaginatedResponse', () => {
  it('calculates stable page metadata', () => {
    expect(
      createPaginatedResponse(['a', 'b'], 21, { page: 2, pageSize: 10 }),
    ).toEqual({
      data: ['a', 'b'],
      meta: {
        page: 2,
        pageSize: 10,
        totalItems: 21,
        totalPages: 3,
      },
    });
  });
});
