import {
  Host,
  ModalBottomSheet,
  type ModalBottomSheetRef,
  RadioButton,
  RNHostView,
} from "@expo/ui/jetpack-compose";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { Link, useLocalSearchParams } from "expo-router";
import { UserRound } from "lucide-react-native";
import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  useColorScheme,
  useWindowDimensions,
  View,
} from "react-native";

import SearchInput from "@/src/components/form/search-input";
import ListFilterIcon from "@/src/components/ui/list-filter-icon";
import { useRowSeparatorStyle } from "@/src/components/ui/list-separator";
import StyledSafeAreaView from "@/src/components/ui/styled-safe-area-view";
import { formatVillageName, getTargetedMemberName } from "@/src/features/targeted-members/utils";
import { targetedMembersCollection } from "@/src/powersync/collections";
import { useSession } from "@/src/providers/session-context";

type TargetedMemberRow = NonNullable<ReturnType<typeof targetedMembersCollection.get>>;

type SortDirection = "asc" | "desc";

type SortField = "name" | "createdAt" | "tf4No";

type SortOption = {
  id: string;
  name: string;
  detail?: string;
  field?: SortField;
  direction?: SortDirection;
};

const SORT_OPTIONS: SortOption[] = [
  { id: "default", name: "sort_default" },
  {
    id: "tf4-asc",
    name: "tf4_number",
    detail: "ascending",
    field: "tf4No",
    direction: "asc",
  },
  {
    id: "tf4-desc",
    name: "tf4_number",
    detail: "descending",
    field: "tf4No",
    direction: "desc",
  },
  { id: "name-asc", name: "name", detail: "ascending", field: "name", direction: "asc" },
  { id: "name-desc", name: "name", detail: "descending", field: "name", direction: "desc" },
  {
    id: "created-desc",
    name: "created_date",
    detail: "latest",
    field: "createdAt",
    direction: "desc",
  },
  {
    id: "created-asc",
    name: "created_date",
    detail: "earliest",
    field: "createdAt",
    direction: "asc",
  },
];

const DEFAULT_SORT_ID = "default";

function isDeleted(member: TargetedMemberRow) {
  return Boolean(member.deletedAt || member.isDeleted);
}

function compareNullableString(a?: string | null, b?: string | null) {
  const aHas = Boolean(a?.trim());
  const bHas = Boolean(b?.trim());
  if (!aHas && !bHas) return 0;
  if (!aHas) return 1;
  if (!bHas) return -1;
  return a!.localeCompare(b!, undefined, { numeric: true, sensitivity: "base" });
}

function getSortValue(member: TargetedMemberRow, field: SortField) {
  if (field === "name") return getTargetedMemberName(member);
  if (field === "tf4No") return member.tf4No ?? null;
  return member.createdAt ?? null;
}

function sortMembers(members: TargetedMemberRow[], option: SortOption) {
  if (!option.field || !option.direction) return members;
  const { field, direction } = option;
  const multiplier = direction === "asc" ? 1 : -1;
  return [...members].sort((a, b) => {
    const cmp = compareNullableString(getSortValue(a, field), getSortValue(b, field));
    return cmp * multiplier;
  });
}

export default function TargetedMembersListScreen() {
  const { t } = useTranslation();
  const { user } = useSession();
  const isDark = useColorScheme() === "dark";
  const params = useLocalSearchParams<{ villageId?: string }>();
  const villageId = params.villageId ?? (user?.villageId ? String(user.villageId) : null);
  const [search, setSearch] = useState("");
  const [sortOptionId, setSortOptionId] = useState<string>(DEFAULT_SORT_ID);
  const [isSortSheetOpen, setIsSortSheetOpen] = useState(false);
  const sheetRef = useRef<ModalBottomSheetRef>(null);
  const { width: windowWidth } = useWindowDimensions();
  const sortOptionSeparatorStyle = useRowSeparatorStyle("bottom");

  const activeSortOption =
    SORT_OPTIONS.find((option) => option.id === sortOptionId) ?? SORT_OPTIONS[0];

  const { data = [], isLoading } = useLiveQuery(
    (q) => {
      if (!villageId) return undefined;
      return q
        .from({ member: targetedMembersCollection })
        .where(({ member }) => eq(member.villageId, villageId))
        .orderBy(({ member }) => member.lastName, "asc");
    },
    [villageId],
  );

  const targetedMembers = useMemo(() => data.filter((member) => !isDeleted(member)), [data]);

  const filteredMembers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return targetedMembers;

    return targetedMembers.filter((member) => {
      const name = getTargetedMemberName(member).toLowerCase();
      const tf4No = member.tf4No?.toLowerCase() ?? "";
      const interviewKey = member.interviewKey?.toLowerCase() ?? "";
      const village = formatVillageName(member).toLowerCase();
      return (
        name.includes(term) ||
        tf4No.includes(term) ||
        interviewKey.includes(term) ||
        village.includes(term)
      );
    });
  }, [targetedMembers, search]);

  const sortedMembers = useMemo(
    () => sortMembers(filteredMembers, activeSortOption),
    [filteredMembers, activeSortOption],
  );

  const handleSelectSort = (option: SortOption) => {
    setSortOptionId(option.id);
    sheetRef.current?.hide().then(() => {
      setIsSortSheetOpen(false);
    });
  };

  if (isLoading) {
    return (
      <StyledSafeAreaView edges={["bottom"]} className="flex-1 bg-white dark:bg-gray-950">
        <View className="flex-1 items-center justify-center gap-3">
          <ActivityIndicator color={isDark ? "#4ade80" : "#0d542b"} />
          <Text className="text-sm text-gray-500 dark:text-gray-400">
            {t("loading_targeted_members")}
          </Text>
        </View>
      </StyledSafeAreaView>
    );
  }

  return (
    <StyledSafeAreaView edges={["bottom"]} className="flex-1 bg-white dark:bg-gray-950">
      <View className="flex-row items-center gap-2 p-4">
        <View className="flex-1">
          <SearchInput
            value={search}
            onChangeText={setSearch}
            placeholder={t("search_targeted_members")}
          />
        </View>

        <Pressable
          onPress={() => setIsSortSheetOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={t("sort_targeted_members")}
          className="size-10 items-center justify-center rounded-full bg-gray-100 active:opacity-80 dark:bg-gray-800"
        >
          <ListFilterIcon color={isDark ? "#9ca3af" : "#374151"} />
        </Pressable>
      </View>

      <FlatList
        data={sortedMembers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: 24,
        }}
        ListHeaderComponent={
          search.trim() ? (
            <View className="px-4 pt-2 pb-3">
              <Text className="text-sm text-gray-500 dark:text-gray-400">
                {t("matching_search", { query: search.trim() })}
              </Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center gap-2 px-4">
            <Text className="text-base font-semibold text-gray-950 dark:text-gray-50">
              {t("no_targeted_members_found")}
            </Text>
            <Text className="text-center text-sm text-gray-500 dark:text-gray-400">
              {search.trim()
                ? t("no_targeted_members_match_search")
                : t("no_targeted_members_synced_village")}
            </Text>
          </View>
        }
        renderItem={({ item }) => <TargetedMemberListItem member={item} />}
      />

      {isSortSheetOpen ? (
        <Host style={{ position: "absolute", width: windowWidth }}>
          <ModalBottomSheet
            ref={sheetRef}
            onDismissRequest={() => setIsSortSheetOpen(false)}
            containerColor={isDark ? "#101828" : "#ffffff"}
            skipPartiallyExpanded
          >
            <RNHostView matchContents>
              <View className="px-4 pt-2 pb-6">
                <Text className="pb-3 text-base font-semibold text-gray-950 dark:text-gray-50">
                  {t("sort_by")}
                </Text>

                {SORT_OPTIONS.map((option, index) => {
                  const isSelected = option.id === sortOptionId;
                  const isLast = index === SORT_OPTIONS.length - 1;

                  return (
                    <Pressable
                      key={option.id}
                      onPress={() => handleSelectSort(option)}
                      accessibilityRole="checkbox"
                      accessibilityLabel={
                        option.detail ? `${t(option.name)} ${t(option.detail)}` : t(option.name)
                      }
                      accessibilityState={{ checked: isSelected }}
                      className="flex-row items-center justify-between py-4 focus:bg-pressed active:bg-pressed"
                      style={isLast ? undefined : sortOptionSeparatorStyle}
                    >
                      <Text className="text-sm font-normal text-gray-950 dark:text-gray-50">
                        {t(option.name)}
                        {option.detail ? (
                          <Text className="text-sm font-normal text-gray-600 dark:text-gray-400">
                            : {t(option.detail)}
                          </Text>
                        ) : null}
                      </Text>
                      {isSelected ? (
                        <Host
                          style={{ width: 24, height: 24 }}
                          matchContents
                          colorScheme={isDark ? "dark" : "light"}
                          seedColor={isDark ? "#f9fafb" : "#030712"}
                        >
                          <RadioButton selected />
                        </Host>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            </RNHostView>
          </ModalBottomSheet>
        </Host>
      ) : null}
    </StyledSafeAreaView>
  );
}

function TargetedMemberListItem({ member }: { member: TargetedMemberRow }) {
  const isDark = useColorScheme() === "dark";
  const tf4No = member.tf4No?.trim() || "N/A";
  const interviewKey = member.interviewKey?.trim() || "N/A";
  const rowSeparatorStyle = useRowSeparatorStyle("top");

  return (
    <Link
      href={{
        pathname: "/(protected)/(app)/targeted-members/[id]",
        params: { id: member.id },
      }}
      asChild
    >
      <Pressable
        style={rowSeparatorStyle}
        className="flex-row items-stretch gap-3 p-4 focus:bg-pressed active:bg-pressed"
      >
        <View className="aspect-square size-12 items-center justify-center rounded-xl bg-gray-200/75 dark:bg-gray-800">
          <UserRound size={20} color={isDark ? "#9ca3af" : "#6b7280"} />
        </View>

        <View className="min-w-0 flex-1 gap-1">
          <View>
            <Text className="text-xs font-medium text-green-600 dark:text-green-400">
              {tf4No} - {interviewKey}
            </Text>
            <Text
              className="text-base leading-5 font-bold text-gray-950 dark:text-gray-50"
              numberOfLines={2}
            >
              {getTargetedMemberName(member)}
            </Text>
          </View>

          <Text className="text-sm font-normal text-gray-600 dark:text-gray-400" numberOfLines={1}>
            {formatVillageName(member)}
          </Text>
        </View>
      </Pressable>
    </Link>
  );
}
