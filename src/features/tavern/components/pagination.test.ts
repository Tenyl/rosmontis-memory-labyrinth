import { describe, expect, it } from 'vitest';
import { paginateItems } from './pagination';

describe('paginateItems', () => {
  const items = Array.from({ length: 121 }, (_, index) => index + 1);

  it('limits long editor and history lists to 50 records per page', () => {
    expect(paginateItems(items, 1).items).toEqual(items.slice(0, 50));
    expect(paginateItems(items, 2).items).toEqual(items.slice(50, 100));
  });

  it('clamps requested pages after records are removed', () => {
    const result = paginateItems(items.slice(0, 51), 9);
    expect(result.page).toBe(2);
    expect(result.pageCount).toBe(2);
    expect(result.items).toEqual([51]);
  });
});
