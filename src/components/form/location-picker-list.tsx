import { Check } from "lucide-react-native";
import { useCallback, useMemo } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { ROW_SEPARATOR_COLOR, ROW_SEPARATOR_WIDTH } from "@/src/components/ui/list-separator";

type LocationPickerListProps<T> = {
  data: T[];
  selectedId?: string | null;
  keyExtractor: (row: T) => string;
  getLabel: (row: T) => string | null | undefined;
  onSelect: (row: T) => void;
  emptyMessage: string;
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  fetchNextPage?: () => void;
  pageSize?: number;
};

const DEFAULT_PAGE_SIZE = 40;

export const LOCATION_PICKER_PAGE_SIZE = DEFAULT_PAGE_SIZE;

export function LocationPickerList<T>({
  data,
  selectedId,
  keyExtractor,
  getLabel,
  onSelect,
  emptyMessage,
  isLoading = false,
  isError = false,
  errorMessage,
  hasNextPage = false,
  isFetchingNextPage = false,
  fetchNextPage,
  pageSize = DEFAULT_PAGE_SIZE,
}: LocationPickerListProps<T>) {
  const rows = useMemo(() => {
    const seen = new Set<string>();

    return data.filter((row) => {
      const key = keyExtractor(row);
      if (seen.has(key)) return false;

      seen.add(key);
      return true;
    });
  }, [data, keyExtractor]);

  const handleEndReached = useCallback(() => {
    if (!hasNextPage || isFetchingNextPage) return;
    fetchNextPage?.();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  if (isLoading && rows.length === 0) {
    return (
      <View className="flex-1 items-center justify-center px-4 py-10">
        <ActivityIndicator color="#6a7282" />
      </View>
    );
  }

  if (isError && rows.length === 0) {
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
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}
      initialNumToRender={pageSize}
      maxToRenderPerBatch={pageSize}
      windowSize={7}
      removeClippedSubviews
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.5}
      ListEmptyComponent={
        <View className="flex-1 items-center justify-center px-4 py-10">
          <Text className="text-center text-sm text-gray-500">{emptyMessage}</Text>
        </View>
      }
      ListFooterComponent={
        isFetchingNextPage ? (
          <View className="py-4">
            <ActivityIndicator color="#6a7282" />
          </View>
        ) : null
      }
      renderItem={({ item, index }) => {
        const id = keyExtractor(item);
        const isSelected = id === selectedId;

        return (
          <Pressable
            onPress={() => onSelect(item)}
            className="flex-row items-center justify-between gap-4 px-4 py-4 focus:bg-gray-50 active:bg-gray-50"
            style={index > 0 ? styles.topBorder : undefined}
          >
            <View className="min-w-0 flex-1">
              <Text className="text-sm font-normal text-gray-700" numberOfLines={1}>
                {getLabel(item)}
              </Text>
            </View>

            <View className="flex-none">
              <Check size={20} color={isSelected ? "#364153" : "transparent"} />
            </View>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  topBorder: {
    borderTopColor: ROW_SEPARATOR_COLOR,
    borderTopWidth: ROW_SEPARATOR_WIDTH,
  },
});
