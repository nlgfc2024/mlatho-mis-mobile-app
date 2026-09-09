import {
  Host,
  ModalBottomSheet,
  RNHostView,
  type ModalBottomSheetRef,
} from "@expo/ui/jetpack-compose";
import { Check, ChevronDown } from "lucide-react-native";
import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import {
  Pressable,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import SearchInput from "@/src/components/form/search-input";

// Theme-aware palette for the native/StyleSheet-driven parts of the Select
// (trigger surface, bottom sheet, separators, spinners). Text colors are
// handled inline via `dark:` classNames.
const SELECT_COLORS = {
  light: {
    fieldGray: "#f3f4f6",
    sheetBackground: "#ffffff",
    chevron: "#6b7280",
    separator: "#d1d5db",
    optionPressed: "#f0f0f0",
    spinner: "#6a7282",
    check: "#030712",
  },
  dark: {
    fieldGray: "#1e2939",
    sheetBackground: "#101828",
    chevron: "#9ca3af",
    separator: "#1e2939",
    optionPressed: "#1e2939",
    spinner: "#9ca3af",
    check: "#f9fafb",
  },
} as const;

const SHEET_HORIZONTAL_PADDING = 16;
const SHEET_MAX_WIDTH = 640;
const OPTION_ROW_HEIGHT = 52;
const EMPTY_LIST_HEIGHT = 72;
// Fixed chrome around the option list, used to budget its height so the
// whole sheet (header + search + list + bottom padding) never exceeds the
// target sheet height: title row ≈ 56dp, search ≈ 60dp.
const SHEET_HEADER_HEIGHT = 56;
const SEARCH_ROW_HEIGHT = 60;
// Top padding inside the sheet (there is no drag handle — gestures are off).
const SHEET_TOP_PADDING = 24;
// The sheet opens at (at most) this fraction of the window height.
const SHEET_HEIGHT_FRACTION = 0.5;
const END_REACHED_DISTANCE = 80;

// 1. Define Types
interface SelectContextType<T> {
  value: T | undefined;
  onValueChange: (value: T) => void;
  closeSheet: () => void;
}

interface OptionProps<T> {
  item: T;
  children: ReactNode;
  searchText?: string;
}

interface SelectProps<T> {
  value: T | undefined;
  onValueChange: (value: T) => void;
  placeholder?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyMessage?: string;
  onSearchTextChange?: (text: string) => void;
  onEndReached?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
}

// 2. Create Context
// We use 'any' here for the initial context creation to avoid complex generic initialization issues,
// but the Consumer/Provider will enforce strict typing.
const SelectContext = createContext<SelectContextType<any> | undefined>(undefined);

// 3. The Option Component
const Option = <T,>({ item, children }: OptionProps<T>) => {
  const context = useContext(SelectContext);

  if (!context) {
    throw new Error("Select.Option must be used within a Select component");
  }

  const { value, onValueChange, closeSheet } = context;
  const isSelected = value === item;
  const colors = SELECT_COLORS[useColorScheme() === "dark" ? "dark" : "light"];

  const handlePress = () => {
    onValueChange(item);
    closeSheet();
  };

  return (
    <Pressable
      className="flex flex-row items-center justify-between py-3.5"
      style={({ pressed }) => [pressed && { backgroundColor: colors.optionPressed }]}
      onPress={handlePress}
    >
      <Text
        className={`text-sm ${isSelected ? "font-medium text-gray-950 dark:text-gray-50" : "font-normal text-gray-700 dark:text-gray-300"}`}
      >
        {children}
      </Text>
      {isSelected && <Check size={16} strokeWidth={2.25} color={colors.check} />}
    </Pressable>
  );
};

const OptionSeparator = () => {
  const colors = SELECT_COLORS[useColorScheme() === "dark" ? "dark" : "light"];

  return <View style={[styles.optionSeparator, { backgroundColor: colors.separator }]} />;
};

const getNodeText = (node: ReactNode): string => {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(getNodeText).join(" ");
  if (React.isValidElement(node)) {
    return getNodeText((node.props as { children?: ReactNode }).children);
  }

  return "";
};

// 4. The Main Select Component
const Select = <T,>({
  value,
  onValueChange,
  placeholder = "Select an option",
  children,
  style,
  disabled = false,
  searchable = false,
  searchPlaceholder = "Search",
  emptyMessage = "No options found",
  onSearchTextChange,
  onEndReached,
  hasMore = false,
  isLoadingMore = false,
}: SelectProps<T>) => {
  const { t } = useTranslation();
  const colors = SELECT_COLORS[useColorScheme() === "dark" ? "dark" : "light"];
  const sheetRef = useRef<ModalBottomSheetRef>(null);
  const endReachedKeyRef = useRef("");
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const [visible, setVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const optionElements = React.Children.toArray(children).filter(
    React.isValidElement,
  ) as React.ReactElement<OptionProps<T>>[];
  const sheetWidth = Math.min(width, SHEET_MAX_WIDTH);
  const sheetBottomPadding = Math.max(insets.bottom, 16);
  const sheetHorizontalPadding = Math.max(SHEET_HORIZONTAL_PADDING, insets.left, insets.right);
  // Budget the list height so the whole sheet settles at ~half the screen:
  // everything above the list is fixed-height chrome.
  const maxSheetContentHeight = height * SHEET_HEIGHT_FRACTION;
  const optionListMaxHeight = Math.max(
    160,
    maxSheetContentHeight -
      SHEET_TOP_PADDING -
      SHEET_HEADER_HEIGHT -
      (searchable ? SEARCH_ROW_HEIGHT : 0) -
      sheetBottomPadding,
  );
  const normalizedSearchQuery = searchQuery.trim().toLocaleLowerCase();
  const visibleOptions =
    searchable && normalizedSearchQuery && !onSearchTextChange
      ? optionElements.filter((child) => {
          const optionText = child.props.searchText ?? getNodeText(child.props.children);

          return optionText.toLocaleLowerCase().includes(normalizedSearchQuery);
        })
      : optionElements;
  const optionListHeight = visibleOptions.length
    ? Math.min(optionListMaxHeight, visibleOptions.length * OPTION_ROW_HEIGHT + 16)
    : EMPTY_LIST_HEIGHT;

  const updateSearchQuery = useCallback(
    (text: string) => {
      setSearchQuery(text);
      onSearchTextChange?.(text);
    },
    [onSearchTextChange],
  );

  const resetSearchQuery = useCallback(() => {
    setSearchQuery("");
    onSearchTextChange?.("");
  }, [onSearchTextChange]);

  const openSheet = useCallback(() => {
    endReachedKeyRef.current = "";
    setVisible(true);
  }, []);

  const closeSheet = useCallback(() => {
    const hidePromise = sheetRef.current?.hide();

    if (hidePromise) {
      void hidePromise
        .catch(() => undefined)
        .finally(() => {
          setVisible(false);
          resetSearchQuery();
        });
      return;
    }

    setVisible(false);
    resetSearchQuery();
  }, [resetSearchQuery]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    resetSearchQuery();
  }, [resetSearchQuery]);

  const handleOptionsScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      const distanceFromEnd = contentSize.height - layoutMeasurement.height - contentOffset.y;

      if (distanceFromEnd > END_REACHED_DISTANCE || !hasMore || isLoadingMore) {
        return;
      }

      const endReachedKey = `${normalizedSearchQuery}:${visibleOptions.length}:${contentSize.height}`;
      if (endReachedKeyRef.current === endReachedKey) return;

      endReachedKeyRef.current = endReachedKey;
      onEndReached?.();
    },
    [hasMore, isLoadingMore, normalizedSearchQuery, onEndReached, visibleOptions.length],
  );

  const renderOptions = () => {
    if (!visibleOptions.length) {
      return (
        <View style={styles.emptyState}>
          <Text className="text-center text-sm text-gray-500 dark:text-gray-400">
            {emptyMessage}
          </Text>
        </View>
      );
    }

    return visibleOptions.map((item, index) => {
      const key = item.key == null ? String(index) : String(item.key);
      const isLast = index === visibleOptions.length - 1;

      return (
        <React.Fragment key={key}>
          {item}
          {!isLast && <OptionSeparator />}
        </React.Fragment>
      );
    });
  };

  const shouldShowLoadingFooter = isLoadingMore;

  const selectedOption = optionElements.find((child) => child.props.item === value);
  const displayValue = selectedOption?.props.children ?? placeholder;
  const hasValue = Boolean(selectedOption);

  return (
    <SelectContext.Provider value={{ value, onValueChange, closeSheet }}>
      <Host matchContents={{ vertical: true }} style={[styles.host, style]}>
        <RNHostView matchContents>
          <View className="w-full">
            {/* The Trigger Button */}
            <Pressable
              className={`flex flex-row items-center justify-between rounded-xl px-4 py-3 ${disabled ? "opacity-60" : ""}`}
              style={({ pressed }) => [
                styles.trigger,
                { backgroundColor: colors.fieldGray, borderColor: colors.fieldGray },
                pressed && !disabled && styles.triggerPressed,
              ]}
              disabled={disabled}
              onPress={openSheet}
            >
              <Text
                numberOfLines={1}
                className={`min-w-0 flex-1 text-sm ${hasValue ? "text-gray-950 dark:text-gray-50" : "text-gray-500 dark:text-gray-400"}`}
              >
                {displayValue}
              </Text>

              <ChevronDown size={16} strokeWidth={2.25} color={colors.chevron} />
            </Pressable>
          </View>
        </RNHostView>

        {/* The Bottom Sheet */}
        {visible && !disabled && (
          <ModalBottomSheet
            ref={sheetRef}
            containerColor={colors.sheetBackground}
            onDismissRequest={handleDismiss}
            // Content is budgeted to ~50% of the window, and skipping the
            // partial anchor opens the sheet directly at that height — no
            // intermediate stop for drags to fight with.
            skipPartiallyExpanded
            // The sheet is deliberately modal: no swipe-to-dismiss and no
            // scrim-tap dismiss. It closes only by selecting an option or
            // pressing Cancel (back press also cancels, per Android
            // convention). With gestures off, the drag handle would be a
            // false affordance, so it is hidden.
            sheetGesturesEnabled={false}
            showDragHandle={false}
            properties={{ shouldDismissOnClickOutside: false }}
          >
            <RNHostView matchContents>
              <View
                className="overflow-hidden"
                style={[
                  styles.sheetContent,
                  {
                    backgroundColor: colors.sheetBackground,
                    width: sheetWidth,
                    paddingBottom: sheetBottomPadding,
                  },
                ]}
              >
                <View
                  className="flex flex-row items-center justify-between pb-4"
                  style={{ paddingHorizontal: sheetHorizontalPadding }}
                >
                  <View>
                    <Text className="text-center text-base font-bold text-gray-950 dark:text-gray-50">
                      {placeholder}
                    </Text>
                  </View>

                  <View className="flex-none">
                    <Pressable onPress={closeSheet}>
                      <Text className="text-blue-600 dark:text-blue-400">{t("cancel")}</Text>
                    </Pressable>
                  </View>
                </View>

                {searchable && (
                  <View className="pb-3" style={{ paddingHorizontal: sheetHorizontalPadding }}>
                    <SearchInput
                      value={searchQuery}
                      placeholder={searchPlaceholder}
                      onChangeText={updateSearchQuery}
                      onCancel={closeSheet}
                    />
                  </View>
                )}

                <ScrollView
                  className="pt-1"
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled
                  scrollEventThrottle={16}
                  style={{ height: optionListHeight }}
                  contentContainerStyle={[
                    styles.optionListContent,
                    { paddingHorizontal: sheetHorizontalPadding },
                  ]}
                  onScroll={handleOptionsScroll}
                >
                  {renderOptions()}
                  {shouldShowLoadingFooter && (
                    <View className="py-3">
                      <ActivityIndicator color={colors.spinner} />
                    </View>
                  )}
                </ScrollView>
              </View>
            </RNHostView>
          </ModalBottomSheet>
        )}
      </Host>
    </SelectContext.Provider>
  );
};

// 5. Attach Option to Select
// We define the type intersection so TS knows Select contains Option
type SelectComponent = <T>(props: SelectProps<T>) => React.JSX.Element;
const TypedSelect = Select as SelectComponent & { Option: typeof Option };

TypedSelect.Option = Option;

export default TypedSelect;

// 6. Styles
const styles = StyleSheet.create({
  host: { width: "100%" },
  trigger: {
    borderWidth: 1,
  },
  triggerPressed: { opacity: 0.72 },
  optionListContent: { paddingBottom: 16 },
  // Hairline between option rows (color applied per-theme inline).
  optionSeparator: { height: StyleSheet.hairlineWidth },
  emptyState: { paddingVertical: 24 },
  sheetContent: { paddingTop: SHEET_TOP_PADDING },
});
