export const TAVERN_PAGE_SIZE = 50;

export function paginateItems<T>(items: T[], requestedPage: number, pageSize = TAVERN_PAGE_SIZE) {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(Math.max(1, requestedPage), pageCount);
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page,
    pageCount,
    start,
    end: Math.min(items.length, start + pageSize),
    total: items.length,
  };
}
