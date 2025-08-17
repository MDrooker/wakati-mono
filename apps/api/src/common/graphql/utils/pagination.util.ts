import { Repository, SelectQueryBuilder } from 'typeorm';

export interface PaginationArgs {
  first?: number;
  after?: string;
  last?: number;
  before?: string;
}

export interface ConnectionResult<T> {
  edges: Array<{
    cursor: string;
    node: T;
  }>;
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor?: string;
    endCursor?: string;
  };
  totalCount: number;
}

export interface SortArgs {
  field: string;
  direction: 'ASC' | 'DESC';
}

export function encodeCursor(value: string | Date): string {
  return Buffer.from(value.toString()).toString('base64');
}

export function decodeCursor(cursor: string): string {
  return Buffer.from(cursor, 'base64').toString('ascii');
}

export async function applyCursorPagination<T>(
  queryBuilder: SelectQueryBuilder<T>,
  args: PaginationArgs,
  sort: SortArgs = { field: 'createdAt', direction: 'DESC' },
  alias: string = queryBuilder.alias,
): Promise<ConnectionResult<T>> {
  const { first, after, last, before } = args;

  // Apply sorting
  queryBuilder.orderBy(`${alias}.${sort.field}`, sort.direction);
  queryBuilder.addOrderBy(`${alias}.id`, 'ASC'); // Secondary sort for consistency

  // Apply cursor filtering
  if (after) {
    const afterValue = decodeCursor(after);
    if (sort.direction === 'DESC') {
      queryBuilder.andWhere(`${alias}.${sort.field} < :afterValue`, {
        afterValue,
      });
    } else {
      queryBuilder.andWhere(`${alias}.${sort.field} > :afterValue`, {
        afterValue,
      });
    }
  }

  if (before) {
    const beforeValue = decodeCursor(before);
    if (sort.direction === 'DESC') {
      queryBuilder.andWhere(`${alias}.${sort.field} > :beforeValue`, {
        beforeValue,
      });
    } else {
      queryBuilder.andWhere(`${alias}.${sort.field} < :beforeValue`, {
        beforeValue,
      });
    }
  }

  // Determine limit
  let limit: number;
  let isForward = true;

  if (first !== undefined && last !== undefined) {
    throw new Error('Cannot provide both first and last');
  }

  if (first !== undefined) {
    limit = Math.min(first, 100); // Cap at 100
    isForward = true;
  } else if (last !== undefined) {
    limit = Math.min(last, 100); // Cap at 100
    isForward = false;
    // Reverse order for backward pagination
    queryBuilder.orderBy(
      `${alias}.${sort.field}`,
      sort.direction === 'DESC' ? 'ASC' : 'DESC',
    );
    queryBuilder.addOrderBy(`${alias}.id`, 'DESC');
  } else {
    limit = 20; // Default
  }

  // Get total count (without pagination)
  const totalCount = await queryBuilder.clone().getCount();

  // Apply limit and get results
  queryBuilder.limit(limit + 1); // Get one extra to check for more pages
  const results = await queryBuilder.getMany();

  // Check for more pages
  const hasMore = results.length > limit;
  if (hasMore) {
    results.pop(); // Remove the extra item
  }

  // Reverse results for backward pagination
  if (!isForward) {
    results.reverse();
  }

  // Create edges
  const edges = results.map((node) => ({
    cursor: encodeCursor((node as any)[sort.field]),
    node,
  }));

  // Determine page info
  const hasNextPage = isForward ? hasMore : after !== undefined;
  const hasPreviousPage = isForward ? after !== undefined : hasMore;

  return {
    edges,
    pageInfo: {
      hasNextPage,
      hasPreviousPage,
      startCursor: edges.length > 0 ? edges[0].cursor : undefined,
      endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : undefined,
    },
    totalCount,
  };
}

export function createConnectionFromArray<T>(
  items: T[],
  args: PaginationArgs,
  totalCount: number,
  getCursor: (item: T) => string,
): ConnectionResult<T> {
  const { first, after, last, before } = args;

  let startIndex = 0;
  let endIndex = items.length;

  // Apply cursor filtering
  if (after) {
    const afterIndex = items.findIndex((item) => getCursor(item) === after);
    if (afterIndex >= 0) {
      startIndex = afterIndex + 1;
    }
  }

  if (before) {
    const beforeIndex = items.findIndex((item) => getCursor(item) === before);
    if (beforeIndex >= 0) {
      endIndex = beforeIndex;
    }
  }

  // Apply pagination
  if (first !== undefined) {
    endIndex = Math.min(startIndex + first, endIndex);
  }

  if (last !== undefined) {
    startIndex = Math.max(endIndex - last, startIndex);
  }

  const slicedItems = items.slice(startIndex, endIndex);

  const edges = slicedItems.map((node) => ({
    cursor: getCursor(node),
    node,
  }));

  return {
    edges,
    pageInfo: {
      hasNextPage: endIndex < items.length,
      hasPreviousPage: startIndex > 0,
      startCursor: edges.length > 0 ? edges[0].cursor : undefined,
      endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : undefined,
    },
    totalCount,
  };
}
