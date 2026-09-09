export type CursorPageInfo = {
  endCursor?: string | null;
  hasNextPage: boolean;
};

/**
 * Relay pagination must advance whenever the server reports another page.
 * Failing fast here prevents a malformed final page from being requested
 * forever with the same cursor.
 */
export function nextPageCursor(
  pageInfo: CursorPageInfo,
  currentCursor: string | null,
  resourceName: string,
) {
  if (!pageInfo.hasNextPage) return null;

  const nextCursor = pageInfo.endCursor?.trim() || null;
  if (!nextCursor || nextCursor === currentCursor) {
    throw new Error(`${resourceName} pagination did not advance to the next page.`);
  }

  return nextCursor;
}
