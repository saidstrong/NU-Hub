const DEFAULT_PAGE = 1;
const MAX_PAGE_VALUE = 10_000;

type PaginationConfig = {
  page?: number;
  pageSize?: number;
  defaultPageSize?: number;
  maxPageSize?: number;
};

export type PaginationWindow = {
  page: number;
  pageSize: number;
  from: number;
  to: number;
};

export function parsePageParam(value: string | undefined): number {
  if (!value) return DEFAULT_PAGE;

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < DEFAULT_PAGE) {
    return DEFAULT_PAGE;
  }

  return Math.min(parsed, MAX_PAGE_VALUE);
}

export function createPaginationWindow(config: PaginationConfig = {}): PaginationWindow {
  const page = Math.max(DEFAULT_PAGE, Math.floor(config.page ?? DEFAULT_PAGE));
  const maxPageSize = Math.max(1, Math.floor(config.maxPageSize ?? 50));
  const defaultPageSize = Math.max(1, Math.floor(config.defaultPageSize ?? 20));
  const requestedPageSize = Math.max(1, Math.floor(config.pageSize ?? defaultPageSize));
  const pageSize = Math.min(requestedPageSize, maxPageSize);

  const from = (page - 1) * pageSize;
  const to = from + pageSize;

  return { page, pageSize, from, to };
}

export function splitPaginatedRows<T>(rows: T[], pageSize: number): { rows: T[]; hasMore: boolean } {
  const hasMore = rows.length > pageSize;
  return {
    rows: rows.slice(0, pageSize),
    hasMore,
  };
}

export function buildPageHref(
  pathname: string,
  page: number,
  params: Record<string, string | undefined> = {},
): string {
  const nextPage = Math.max(DEFAULT_PAGE, Math.floor(page));
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value && value.length > 0) {
      search.set(key, value);
    }
  }

  if (nextPage > DEFAULT_PAGE) {
    search.set("page", String(nextPage));
  }

  const query = search.toString();
  return query ? `${pathname}?${query}` : pathname;
}
