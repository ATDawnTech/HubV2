/**
 * TypeScript types that mirror the At Dawn API standard envelope shapes.
 *
 * These are used as generic wrappers around all API responses. Domain-specific
 * shapes live in each feature's own types file.
 */

export interface PaginationMeta {
  total: number;
  page_size: number;
  next_cursor: string | null;
  prev_cursor: string | null;
}

export interface ApiError {
  code: string;
  message: string;
  request_id: string;
}

export interface ApiResponse<T> {
  data: T | null;
  meta: PaginationMeta | null;
  error: ApiError | null;
}
