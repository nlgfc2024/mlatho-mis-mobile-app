import { CloudOff, MessagesSquare, RefreshCw } from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";

import CommunicationFilterSheet from "@/src/components/communication/communication-filter-sheet";
import PublicationListItem from "@/src/components/communication/publication-list-item";
import SearchInput from "@/src/components/form/search-input";
import ListFilterIcon from "@/src/components/ui/list-filter-icon";
import StyledSafeAreaView from "@/src/components/ui/styled-safe-area-view";
import {
  countActiveCommunicationFilters,
  emptyCommunicationFilters,
  filterPublications,
  getCurrentUserContext,
  getVisiblePublications,
  type CommunicationFilters,
} from "@/src/data/communications";
import { useIsOnline } from "@/src/hooks/use-is-online";
import {
  isPublicationAcknowledged,
  isPublicationRead,
  useCommunicationReadState,
} from "@/src/lib/communication-read-state";
import { useSession } from "@/src/providers/session-context";

export default function CommunicationScreen() {
  const { t } = useTranslation();
  const { user } = useSession();
  const isOnline = useIsOnline();
  const readState = useCommunicationReadState();

  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<CommunicationFilters>(emptyCommunicationFilters);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const isOffline = !isOnline;
  const activeCount = countActiveCommunicationFilters(filters);

  const { regionId, districtId, wardId, villageId } = user ?? {};
  const userContext = useMemo(
    () => getCurrentUserContext({ regionId, districtId, wardId, villageId }),
    [regionId, districtId, wardId, villageId],
  );

  const visible = useMemo(() => getVisiblePublications(userContext), [userContext]);

  const results = useMemo(
    () => filterPublications(visible, filters, query, (id) => isPublicationRead(readState, id)),
    [visible, filters, query, readState],
  );

  const unreadCount = useMemo(
    () => visible.filter((publication) => !isPublicationRead(readState, publication.id)).length,
    [visible, readState],
  );

  // Pull-to-refresh stands in for "sync latest published communications when
  // internet is available". With a backend this would fetch new published
  // records into the local store; offline it is a no-op (already-synced
  // records stay viewable).
  const handleRefresh = useCallback(async () => {
    if (isOffline) return;
    setIsSyncing(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 900));
    } finally {
      setIsSyncing(false);
    }
  }, [isOffline]);

  return (
    <StyledSafeAreaView edges={["bottom"]} className="flex-1 bg-white dark:bg-gray-950">
      <View className="flex-row items-center gap-3 px-4 pt-4">
        <View className="flex-1">
          <SearchInput
            value={query}
            onChangeText={setQuery}
            onCancel={() => setQuery("")}
            placeholder={t("search_communications")}
          />
        </View>

        <Pressable
          onPress={() => setIsFilterOpen(true)}
          className="rounded-full bg-gray-100 p-2.5 dark:bg-gray-800"
        >
          <ListFilterIcon color="#6a7282" />
          {activeCount > 0 ? (
            <View className="absolute -top-1 -right-1 min-w-4 items-center rounded-full bg-gray-500 px-1">
              <Text className="text-[10px] font-semibold text-white">{activeCount}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      <View className="flex-row items-center justify-between px-4 pt-3">
        <Text className="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
          {unreadCount > 0
            ? t("unread_communications_count", { count: unreadCount })
            : t("all_caught_up")}
        </Text>
        {isOffline ? (
          <View className="flex-row items-center gap-1.5">
            <CloudOff size={13} color="#92400e" />
            <Text className="text-xs font-medium text-amber-700 dark:text-amber-500">
              {t("offline_viewing")}
            </Text>
          </View>
        ) : isSyncing ? (
          <View className="flex-row items-center gap-1.5">
            <RefreshCw size={13} color="#0d542b" />
            <Text className="text-xs font-medium text-green-800 dark:text-green-300">
              {t("syncing_communications")}
            </Text>
          </View>
        ) : null}
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-6"
        refreshControl={
          <RefreshControl refreshing={isSyncing} onRefresh={handleRefresh} tintColor="#0d542b" />
        }
      >
        {results.length > 0 ? (
          results.map((publication, index) => (
            <PublicationListItem
              key={publication.id}
              publication={publication}
              isRead={isPublicationRead(readState, publication.id)}
              isAcknowledged={isPublicationAcknowledged(readState, publication.id)}
              isLast={index === results.length - 1}
            />
          ))
        ) : (
          <View className="items-center gap-3 px-6 pt-20">
            <View className="rounded-full bg-green-100 p-4 dark:bg-green-950">
              <MessagesSquare size={28} color="#0d542b" />
            </View>
            <Text className="text-center text-sm text-gray-500 dark:text-gray-300">
              {visible.length === 0 ? t("communication_empty_state") : t("no_communications_found")}
            </Text>
          </View>
        )}
      </ScrollView>

      <CommunicationFilterSheet
        visible={isFilterOpen}
        filters={filters}
        onApply={setFilters}
        onClose={() => setIsFilterOpen(false)}
      />
    </StyledSafeAreaView>
  );
}
