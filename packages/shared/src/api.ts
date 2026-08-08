/**
 * Standard API envelope. All endpoints return either { data } on success or
 * { error } on failure. The NestJS global response interceptor wraps payloads.
 */
export interface ApiSuccess<T> {
  data: T;
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
    cursor?: string | null;
    [k: string]: unknown;
  };
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
    path?: string;
    timestamp: string;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export function isApiError<T>(r: ApiResponse<T>): r is ApiError {
  return (r as ApiError).error !== undefined;
}

export interface Paginated<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
  total?: number;
}
