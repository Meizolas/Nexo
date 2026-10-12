export interface PageMetadata {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PageMetadata;
}

export function createPaginatedResponse<T>(
  data: T[],
  totalItems: number,
  options: { page: number; pageSize: number },
): PaginatedResponse<T> {
  return {
    data,
    meta: {
      page: options.page,
      pageSize: options.pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / options.pageSize),
    },
  };
}
