import type { TFunction } from "i18next";
import { ChevronRight } from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";

import { ROW_SEPARATOR_COLOR, ROW_SEPARATOR_WIDTH } from "@/src/components/ui/list-separator";

export type LocationHierarchyListItem = {
  id: string;
  name: string | null | undefined;
  countLabel?: string;
  accessibilityLabel?: string;
  onPress?: () => void;
};

type LocationHierarchyListProps<T> = {
  /** Raw rows straight from the query — mapped to display items lazily. */
  data: T[];
  /** Stable key for a row. */
  keyExtractor: (row: T) => string;
  /**
   * Maps a raw row to its display item. Called only for rows in the visible
   * window, so building count labels and `onPress` closures for a large
   * collection is deferred instead of done up front on mount.
   */
  toItem: (row: T) => LocationHierarchyListItem;
  emptyMessage: string;
  /** Shows a centered spinner instead of the empty message while first loading. */
  isLoading?: boolean;
  /** Shows a centered error state when the query fails before any data is available. */
  isError?: boolean;
  errorMessage?: string;
  /** How many rows to reveal per page as the user scrolls to the end. */
  pageSize?: number;
  /**
   * Query-level pagination. When provided, the list stops windowing `data`
   * client-side and instead calls `onEndReached` so the caller can grow its
   * query window. Use this for large collections so rows are never all
   * materialized on mount.
   */
  onEndReached?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
};

const DEFAULT_PAGE_SIZE = 40;

export const LOCATION_LIST_PAGE_SIZE = DEFAULT_PAGE_SIZE;

/**
 * Owns a growing `.limit()` for query-level pagination. Feed `limit` into a
 * `useLiveQuery`, and wire `loadMore` to the list's `onEndReached`.
 */
export function usePaginatedList(pageSize = DEFAULT_PAGE_SIZE) {
  const [limit, setLimit] = useState(pageSize);
  const loadMore = useCallback(() => setLimit((current) => current + pageSize), [pageSize]);
  return { limit, loadMore, pageSize };
}

export function formatLocationCount(value: number) {
  return value.toLocaleString("en-US");
}

export function pluralizeLocationCount(value: number, singular: string, plural: string) {
  return `${formatLocationCount(value)} ${value === 1 ? singular : plural}`;
}

export function translatedCount(t: TFunction, key: string, value: number) {
  return t(key, {
    count: value,
    formattedCount: formatLocationCount(value),
  });
}

export function getLocationCountByParentId<T>(
  items: T[],
  getParentId: (item: T) => string | null | undefined,
) {
  const counts = new Map<string, number>();

  for (const item of items) {
    const parentId = getParentId(item);

    if (!parentId) continue;

    counts.set(parentId, (counts.get(parentId) ?? 0) + 1);
  }

  return counts;
}

export function LocationHierarchyHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View className="border-b border-gray-200 px-4 py-4">
      <Text className="text-2xl font-bold text-gray-950">{title}</Text>
      {subtitle ? <Text className="mt-1 text-sm text-gray-600">{subtitle}</Text> : null}
    </View>
  );
}

export function LocationHierarchyList<T>({
  data,
  keyExtractor,
  toItem,
  emptyMessage,
  isLoading = false,
  isError = false,
  errorMessage,
  pageSize = DEFAULT_PAGE_SIZE,
  onEndReached,
  hasMore: externalHasMore,
  isLoadingMore = false,
}: LocationHierarchyListProps<T>) {
  // External (query-level) pagination takes over when a caller wires it up.
  const isExternal = onEndReached != null;

  const [visibleState, setVisibleState] = useState({
    count: pageSize,
    pageSize,
    resetKey: "",
  });

  const resetKey = `${data.length}:${data[0] ? keyExtractor(data[0]) : ""}`;
  const visibleCount =
    visibleState.resetKey === resetKey && visibleState.pageSize === pageSize
      ? visibleState.count
      : pageSize;

  const windowedRows = useMemo(() => data.slice(0, visibleCount), [data, visibleCount]);

  const loadMoreInternal = useCallback(() => {
    setVisibleState((current) => {
      const currentCount =
        current.resetKey === resetKey && current.pageSize === pageSize ? current.count : pageSize;

      return {
        count: currentCount < data.length ? currentCount + pageSize : currentCount,
        pageSize,
        resetKey,
      };
    });
  }, [data.length, pageSize, resetKey]);

  const rows = isExternal ? data : windowedRows;
  const hasMore = isExternal ? Boolean(externalHasMore) : visibleCount < data.length;
  const handleEndReached = useCallback(() => {
    if (isExternal) {
      if (!externalHasMore || isLoadingMore) return;
      onEndReached?.();
      return;
    }

    if (hasMore) {
      loadMoreInternal();
    }
  }, [externalHasMore, hasMore, isExternal, isLoadingMore, loadMoreInternal, onEndReached]);

  if (isLoading && data.length === 0) {
    return (
      <View className="flex-1 items-center justify-center px-4 py-10">
        <ActivityIndicator color="#6a7282" />
      </View>
    );
  }

  if (isError && data.length === 0) {
    return (
      <View className="flex-1 items-center justify-center px-4 py-10">
        <Text className="text-center text-sm text-red-600">
          {errorMessage ?? "Unable to load locations."}
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={rows}
      keyExtractor={keyExtractor}
      contentContainerStyle={{ paddingBottom: 32, flexGrow: 1 }}
      initialNumToRender={pageSize}
      maxToRenderPerBatch={pageSize}
      windowSize={7}
      removeClippedSubviews
      ListEmptyComponent={
        <View className="flex-1 items-center justify-center px-4 py-10">
          <Text className="text-center text-sm text-gray-500">{emptyMessage}</Text>
        </View>
      }
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        isLoadingMore ? (
          <View className="py-4">
            <ActivityIndicator color="#6a7282" />
          </View>
        ) : null
      }
      renderItem={({ item, index }) => (
        <LocationHierarchyRow item={toItem(item)} showBorder={index < rows.length - 1} />
      )}
    />
  );
}

function LocationHierarchyRow({
  item,
  showBorder,
}: {
  item: LocationHierarchyListItem;
  showBorder: boolean;
}) {
  const rowClassName = "flex-row items-center gap-3 px-4 py-4 active:bg-gray-50 focus:bg-gray-50";
  const rowStyle = showBorder
    ? { borderBottomWidth: ROW_SEPARATOR_WIDTH, borderBottomColor: ROW_SEPARATOR_COLOR }
    : undefined;

  const content = (
    <>
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className="text-base font-semibold text-gray-950">
          {item.name}
        </Text>
        {item.countLabel ? (
          <Text className="mt-1 text-sm font-normal text-gray-600">{item.countLabel}</Text>
        ) : null}
      </View>

      {item.onPress ? (
        <View className="flex-none">
          <ChevronRight size={18} strokeWidth={2} color={"#6a7282"} />
        </View>
      ) : null}
    </>
  );

  if (!item.onPress) {
    return (
      <View className={rowClassName} style={rowStyle}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      onPress={item.onPress}
      accessibilityRole="button"
      accessibilityLabel={item.accessibilityLabel}
      className={rowClassName}
      style={rowStyle}
    >
      {content}
    </Pressable>
  );
}
