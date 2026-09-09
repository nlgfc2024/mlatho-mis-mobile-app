import { Button, Host, Text as JCText } from "@expo/ui/jetpack-compose";
import { clip, fillMaxWidth, Shapes } from "@expo/ui/jetpack-compose/modifiers";
import NetInfo from "@react-native-community/netinfo";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { useMutation } from "@tanstack/react-query";
import { Check, CircleAlert, Clock3, RefreshCw } from "lucide-react-native";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";

import Select from "@/src/components/form/select";
import Headline from "@/src/components/ui/headline";
import StyledSafeAreaView from "@/src/components/ui/styled-safe-area-view";
import { accessProfileHasPermission } from "@/src/features/access-profile/permissions";
import { useHandleExpiredToken } from "@/src/hooks/use-handle-expired-token";
import { useIsOnline } from "@/src/hooks/use-is-online";
import {
  getHouseholdSyncKey,
  getMetadataStatus,
  getTargetedMembersSyncKey,
  GRIEVANCE_CATEGORIES_SYNC_KEY,
  GRIEVANCE_CHANNELS_SYNC_KEY,
  GRIEVANCE_TYPES_SYNC_KEY,
  ensureGrievanceSetupSyncMetadata,
  ensureLocationSyncMetadata,
  ensureVillageScopedSyncMetadata,
  isCompletedStatus,
  isGrievanceStepSynced,
  ONBOARDING_SYNC_STEP_KEYS,
  type OnboardingSyncStepKey,
} from "@/src/onboarding/state";
import {
  districtsCollection,
  grievanceCategoriesCollection,
  grievanceChannelsCollection,
  grievanceTypesCollection,
  householdsCollection,
  regionsCollection,
  syncMetadataCollection,
  targetedMembersCollection,
  userLocationsCollection,
  villagesCollection,
  wardsCollection,
} from "@/src/powersync/collections";
import { upsertLocalRecord } from "@/src/powersync/remote-sync";
import { useSession } from "@/src/providers/session-context";
import { createLocationScopeKey } from "@/src/sync/current-user-location-scope";
import { syncDistricts } from "@/src/sync/sync-districts";
import {
  syncGrievanceCategories,
  syncGrievanceChannels,
  syncGrievanceTypes,
} from "@/src/sync/sync-grievance-categories";
import { syncRegions } from "@/src/sync/sync-regions";
import { syncTargetedMembersForVillage } from "@/src/sync/sync-targeted-members";
import { syncVillageHouseholds } from "@/src/sync/sync-village-groups";
import { syncVillages } from "@/src/sync/sync-villages";
import { syncWards } from "@/src/sync/sync-wards";
import { getGraphQLErrorMessage, isTokenExpiredError } from "@/src/utils/graphql-errors";

type SyncStatus =
  | "idle"
  | "syncing"
  | "completed"
  | "error"
  | "blocked"
  | "requires-internet"
  | "requires-village-selection";

type VillageRow = {
  id: string;
  name?: string | null;
  code?: string | null;
  wardId?: string | null;
  uuid?: string | null;
  reference?: string | null;
  deletedAt?: string | null;
};

type RegionRow = { id: string; name?: string | null; deletedAt?: string | null };
type DistrictRow = {
  id: string;
  name?: string | null;
  regionId?: string | null;
  deletedAt?: string | null;
};
type WardRow = {
  id: string;
  name?: string | null;
  districtId?: string | null;
  deletedAt?: string | null;
};

const statusStyles: Record<
  SyncStatus,
  { labelKey: string; bg: string; text: string; icon: string }
> = {
  idle: { labelKey: "pending", bg: "bg-gray-100", text: "text-gray-700", icon: "#374151" },
  syncing: {
    labelKey: "synchronizing",
    bg: "bg-blue-100",
    text: "text-blue-700",
    icon: "#1d4ed8",
  },
  completed: { labelKey: "complete", bg: "bg-green-100", text: "text-green-700", icon: "#15803d" },
  error: { labelKey: "failed", bg: "bg-red-100", text: "text-red-700", icon: "#b91c1c" },
  blocked: { labelKey: "disabled", bg: "bg-gray-100", text: "text-gray-500", icon: "#6b7280" },
  "requires-internet": {
    labelKey: "requires_internet",
    bg: "bg-amber-100",
    text: "text-amber-800",
    icon: "#92400e",
  },
  "requires-village-selection": {
    labelKey: "requires_village",
    bg: "bg-amber-100",
    text: "text-amber-800",
    icon: "#92400e",
  },
};

function isDeleted(record: { deletedAt?: string | null; isDeleted?: number | null }) {
  return Boolean(record.deletedAt || record.isDeleted);
}

function statusFromValue(
  value: string | null | undefined,
  disabled: boolean | SyncStatus,
): SyncStatus {
  if (disabled) return typeof disabled === "string" ? disabled : "blocked";
  if (value === "completed") return "completed";
  if (value === "syncing") return "syncing";
  if (value === "error" || value === "failed") return "error";
  return "idle";
}

function StatusBadge({ status }: { status: SyncStatus }) {
  const { t } = useTranslation();
  const styles = statusStyles[status];
  const color = styles.icon;

  return (
    <View className={`flex-row items-center gap-1 rounded-full p-1 ${styles.bg}`}>
      {status === "completed" ? (
        <Check size={12} color={color} strokeWidth={2.5} />
      ) : status === "error" ? (
        <CircleAlert size={12} color={color} strokeWidth={2.5} />
      ) : status === "syncing" ? (
        <RefreshCw size={12} color={color} strokeWidth={2.5} />
      ) : (
        <Clock3 size={12} color={color} strokeWidth={2.5} />
      )}
      <Text className={`px-1 text-xs font-semibold ${styles.text}`}>{t(styles.labelKey)}</Text>
    </View>
  );
}

function StepCard({
  title,
  description,
  status,
  count,
  error,
  disabled,
  children,
}: {
  title: string;
  description: string;
  status: SyncStatus;
  count: number;
  error?: string | null;
  disabled?: boolean;
  children?: ReactNode;
}) {
  const { i18n } = useTranslation();

  return (
    <View className="gap-3">
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1 gap-1">
          <Text
            className={
              disabled ? "text-lg font-bold text-gray-500" : "text-lg font-bold text-gray-950"
            }
          >
            ({count.toLocaleString(i18n.language.startsWith("sw") ? "sw-TZ" : "en-US")}) {title}
          </Text>
          <Text className={disabled ? "text-sm text-gray-400" : "text-sm text-gray-600"}>
            {description}
          </Text>
        </View>
        <StatusBadge status={status} />
      </View>

      {error ? (
        <View className="rounded-md bg-red-50 p-3">
          <Text selectable className="text-sm text-red-700">
            {error}
          </Text>
        </View>
      ) : null}

      {children}
    </View>
  );
}

function SelectRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View className="gap-1.5">
      <Text className="text-xs font-semibold tracking-wide text-gray-500 uppercase">{label}</Text>
      {children}
    </View>
  );
}

function VillageSelection({
  regions,
  districts,
  wards,
  villages,
  selectedVillageId,
  activeVillageId,
  disabled,
  onSelect,
}: {
  regions: RegionRow[];
  districts: DistrictRow[];
  wards: WardRow[];
  villages: VillageRow[];
  selectedVillageId: string | null;
  activeVillageId: string | null;
  disabled: boolean;
  onSelect: (villageId: string | null) => void;
}) {
  const { t } = useTranslation();
  // Walk up the parent chain from the current (or active) village so the
  // selectors land on the saved location when the screen re-opens.
  const initialChain = useMemo(() => {
    const startId = selectedVillageId ?? activeVillageId;
    if (!startId) return { regionId: null, districtId: null, wardId: null };

    const village = villages.find((v) => v.id === startId);
    const ward = village?.wardId ? wards.find((w) => w.id === village.wardId) : undefined;
    const district = ward?.districtId ? districts.find((d) => d.id === ward.districtId) : undefined;
    const region = district?.regionId ? regions.find((r) => r.id === district.regionId) : undefined;

    return {
      regionId: region?.id ?? null,
      districtId: district?.id ?? null,
      wardId: ward?.id ?? null,
    };
  }, [activeVillageId, districts, regions, selectedVillageId, villages, wards]);

  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(initialChain.regionId);
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(
    initialChain.districtId,
  );
  const [selectedWardId, setSelectedWardId] = useState<string | null>(initialChain.wardId);

  const visibleRegions = useMemo(() => regions.filter((r) => !isDeleted(r)), [regions]);

  const visibleDistricts = useMemo(
    () =>
      districts.filter(
        (d) => !isDeleted(d) && (!selectedRegionId || d.regionId === selectedRegionId),
      ),
    [districts, selectedRegionId],
  );

  const visibleWards = useMemo(
    () =>
      wards.filter(
        (w) => !isDeleted(w) && (!selectedDistrictId || w.districtId === selectedDistrictId),
      ),
    [wards, selectedDistrictId],
  );

  const visibleVillages = useMemo(
    () => villages.filter((v) => !isDeleted(v) && (!selectedWardId || v.wardId === selectedWardId)),
    [selectedWardId, villages],
  );

  const handleRegionChange = (regionId: string) => {
    setSelectedRegionId(regionId);
    setSelectedDistrictId(null);
    setSelectedWardId(null);
    onSelect(null);
  };

  const handleDistrictChange = (districtId: string) => {
    setSelectedDistrictId(districtId);
    setSelectedWardId(null);
    onSelect(null);
  };

  const handleWardChange = (wardId: string) => {
    setSelectedWardId(wardId);
    onSelect(null);
  };

  return (
    <View className="gap-3 border-t border-gray-100 pt-3">
      <SelectRow label={t("region")}>
        <Select
          value={selectedRegionId ?? undefined}
          onValueChange={handleRegionChange}
          placeholder={t("select_region")}
          disabled={disabled || visibleRegions.length === 0}
          searchable
          searchPlaceholder={t("search_regions")}
          emptyMessage={t("no_regions_available")}
        >
          {visibleRegions.map((r) => (
            <Select.Option key={r.id} item={r.id} searchText={r.name ?? ""}>
              {r.name ?? t("unnamed_region")}
            </Select.Option>
          ))}
        </Select>
      </SelectRow>

      <SelectRow label={t("district")}>
        <Select
          value={selectedDistrictId ?? undefined}
          onValueChange={handleDistrictChange}
          placeholder={selectedRegionId ? t("select_district") : t("select_region_first")}
          disabled={disabled || !selectedRegionId || visibleDistricts.length === 0}
          searchable
          searchPlaceholder={t("search_districts")}
          emptyMessage={t("no_districts_in_region")}
        >
          {visibleDistricts.map((d) => (
            <Select.Option key={d.id} item={d.id} searchText={d.name ?? ""}>
              {d.name ?? t("unnamed_district")}
            </Select.Option>
          ))}
        </Select>
      </SelectRow>

      <SelectRow label={t("ward")}>
        <Select
          value={selectedWardId ?? undefined}
          onValueChange={handleWardChange}
          placeholder={selectedDistrictId ? t("select_ward") : t("select_district_first")}
          disabled={disabled || !selectedDistrictId || visibleWards.length === 0}
          searchable
          searchPlaceholder={t("search_wards")}
          emptyMessage={t("no_wards_in_district")}
        >
          {visibleWards.map((w) => (
            <Select.Option key={w.id} item={w.id} searchText={w.name ?? ""}>
              {w.name ?? t("unnamed_ward")}
            </Select.Option>
          ))}
        </Select>
      </SelectRow>

      <SelectRow label={t("village")}>
        <Select
          value={selectedVillageId ?? undefined}
          onValueChange={(villageId) => onSelect(villageId)}
          placeholder={selectedWardId ? t("select_village") : t("select_ward_first")}
          disabled={disabled || !selectedWardId || visibleVillages.length === 0}
          searchable
          searchPlaceholder={t("search_villages")}
          emptyMessage={t("no_villages_in_ward")}
        >
          {visibleVillages.map((v) => (
            <Select.Option key={v.id} item={v.id} searchText={v.name ?? ""}>
              {v.name ?? t("unnamed_village")}
              {activeVillageId === v.id ? ` · ${t("active")}` : ""}
            </Select.Option>
          ))}
        </Select>
      </SelectRow>
    </View>
  );
}

export default function OnboardingSyncScreen() {
  const { t } = useTranslation();
  const isOnline = useIsOnline();
  const { user, accessProfile, location: sessionLocation } = useSession();
  const handleIfExpired = useHandleExpiredToken();
  const [syncStepInFlight, setSyncStepInFlight] = useState(false);
  const [selectedVillageOverride, setSelectedVillageOverride] = useState<string | null>(null);

  const userReference = user?.reference ?? user?.id ?? null;
  const locationScopeKey = useMemo(() => {
    if (!userReference || !accessProfile) return null;
    const districtUuids = (accessProfile.userDistricts ?? [])
      .map((district) => district?.uuid?.trim() ?? "")
      .filter(Boolean);
    return createLocationScopeKey(String(userReference), districtUuids);
  }, [accessProfile, userReference]);
  const activeVillageId = user?.villageId ? String(user.villageId) : null;
  const householdSyncRequired = accessProfileHasPermission(accessProfile, [
    "gql_group_search_perms",
  ]);
  const targetedMembersSyncRequired = accessProfileHasPermission(accessProfile, [
    "gql_individual_search_perms",
  ]);
  const onboardingStepKeys = useMemo(
    () =>
      ONBOARDING_SYNC_STEP_KEYS.filter(
        (step) =>
          (step !== "households" || householdSyncRequired) &&
          (step !== "targeted-members" || targetedMembersSyncRequired),
      ),
    [householdSyncRequired, targetedMembersSyncRequired],
  );

  const { data: metadata = [] } = useLiveQuery((q) => q.from({ meta: syncMetadataCollection }));
  const { data: regions = [] } = useLiveQuery((q) =>
    q.from({ region: regionsCollection }).orderBy(({ region }) => region.name, "asc"),
  );
  const { data: districts = [] } = useLiveQuery((q) =>
    q.from({ district: districtsCollection }).orderBy(({ district }) => district.name, "asc"),
  );
  const { data: wards = [] } = useLiveQuery((q) =>
    q.from({ ward: wardsCollection }).orderBy(({ ward }) => ward.name, "asc"),
  );
  const { data: villages = [] } = useLiveQuery((q) =>
    q.from({ village: villagesCollection }).orderBy(({ village }) => village.name, "asc"),
  );
  const { data: grievanceCategories = [] } = useLiveQuery((q) =>
    q
      .from({ category: grievanceCategoriesCollection })
      .orderBy(({ category }) => category.name, "asc"),
  );
  const { data: grievanceTypes = [] } = useLiveQuery((q) =>
    q.from({ type: grievanceTypesCollection }).orderBy(({ type }) => type.name, "asc"),
  );
  const { data: grievanceChannels = [] } = useLiveQuery((q) =>
    q.from({ channel: grievanceChannelsCollection }).orderBy(({ channel }) => channel.name, "asc"),
  );
  const { data: households = [] } = useLiveQuery(
    (q) => {
      if (!activeVillageId) return undefined;
      return q
        .from({ household: householdsCollection })
        .where(({ household }) => eq(household.villageId, activeVillageId));
    },
    [activeVillageId],
  );
  const { data: targetedMembers = [] } = useLiveQuery(
    (q) => {
      if (!activeVillageId) return undefined;
      return q
        .from({ member: targetedMembersCollection })
        .where(({ member }) => eq(member.villageId, activeVillageId));
    },
    [activeVillageId],
  );

  const activeVillage = useMemo(() => {
    return (
      villages.find((village) => village.id === activeVillageId && !isDeleted(village)) ?? null
    );
  }, [activeVillageId, villages]);

  useEffect(() => {
    if (!userReference) return;

    Promise.all([
      ensureLocationSyncMetadata(userReference, locationScopeKey),
      ensureGrievanceSetupSyncMetadata(),
    ]).catch((error) => {
      console.error("Failed to initialize onboarding sync metadata", error);
    });
  }, [locationScopeKey, userReference]);

  useEffect(() => {
    if (!activeVillageId || !userReference) return;

    ensureVillageScopedSyncMetadata(activeVillageId, userReference).catch((error) => {
      console.error("Failed to initialize village sync metadata", error);
    });
  }, [activeVillageId, userReference]);

  const metadataRows = useMemo(
    () =>
      metadata.map((row) => ({
        key: row.key ?? row.id,
        value: row.value,
        status: row.status,
        cursor: row.cursor,
        userId: row.userId,
        error: row.error,
        syncedCount: row.syncedCount,
      })),
    [metadata],
  );

  const statusFor = (key: string, disabled: boolean | SyncStatus = false) =>
    statusFromValue(getMetadataStatus(metadataRows, key), disabled);
  const metadataFor = (key: string) => metadataRows.find((row) => row.key === key);
  const syncCountFor = (key: string, fallback: number) => {
    const row = metadataFor(key);
    const status = row?.value ?? row?.status;

    return status === "syncing" && typeof row?.syncedCount === "number"
      ? row.syncedCount
      : fallback;
  };
  const syncErrorFor = (key: string) => {
    const error = metadataFor(key)?.error;
    if (typeof error === "string" && isTokenExpiredError(error)) {
      return t("previous_session_expired_retry_sync");
    }
    return error ? getGraphQLErrorMessage(error, t("sync_failed")) : null;
  };

  const activeHouseholdKey = activeVillageId
    ? getHouseholdSyncKey(activeVillageId, userReference)
    : null;
  const activeTargetedMembersKey = activeVillageId
    ? getTargetedMembersSyncKey(activeVillageId, userReference)
    : null;
  const selectedVillageId = selectedVillageOverride ?? activeVillageId;

  const grievanceCompleted = {
    categories: isGrievanceStepSynced(metadataRows, GRIEVANCE_CATEGORIES_SYNC_KEY),
    types: isGrievanceStepSynced(metadataRows, GRIEVANCE_TYPES_SYNC_KEY),
    channels: isGrievanceStepSynced(metadataRows, GRIEVANCE_CHANNELS_SYNC_KEY),
  };

  const completed = {
    regions: isCompletedStatus(getMetadataStatus(metadataRows, "regions")),
    districts: isCompletedStatus(getMetadataStatus(metadataRows, "districts")),
    wards: isCompletedStatus(getMetadataStatus(metadataRows, "wards")),
    villages: isCompletedStatus(getMetadataStatus(metadataRows, "villages")),
    grievanceSetup:
      grievanceCompleted.categories && grievanceCompleted.types && grievanceCompleted.channels,
    selectedVillage: Boolean(activeVillage),
    households:
      !householdSyncRequired ||
      Boolean(
        activeHouseholdKey &&
        isCompletedStatus(getMetadataStatus(metadataRows, activeHouseholdKey)),
      ),
    targetedMembers:
      !targetedMembersSyncRequired ||
      Boolean(
        activeTargetedMembersKey &&
        isCompletedStatus(getMetadataStatus(metadataRows, activeTargetedMembersKey)),
      ),
  };

  const visibleCounts = {
    regions: regions.filter((item) => !isDeleted(item)).length,
    districts: districts.filter((item) => !isDeleted(item)).length,
    wards: wards.filter((item) => !isDeleted(item)).length,
    villages: villages.filter((item) => !isDeleted(item)).length,
    grievanceCategories: grievanceCategories.filter((item) => !isDeleted(item)).length,
    grievanceTypes: grievanceTypes.filter((item) => !isDeleted(item)).length,
    grievanceChannels: grievanceChannels.filter((item) => !isDeleted(item)).length,
    households: households.filter((item) => !isDeleted(item)).length,
    targetedMembers: targetedMembers.filter((item) => !isDeleted(item)).length,
  };

  const regionById = useMemo(
    () => new Map(regions.map((region) => [region.id, region])),
    [regions],
  );
  const districtById = useMemo(
    () => new Map(districts.map((district) => [district.id, district])),
    [districts],
  );
  const wardById = useMemo(() => new Map(wards.map((ward) => [ward.id, ward])), [wards]);

  const syncMutation = useMutation<void, Error, string>({
    mutationKey: ["MandatoryOnboardingSync", activeVillageId, userReference],
    mutationFn: async (step) => {
      const networkState = await NetInfo.fetch();
      if (!networkState.isConnected || networkState.isInternetReachable === false) {
        throw new Error(t("initial_setup_requires_internet"));
      }

      if (step === "regions") return syncRegions();
      if (step === "districts") return syncDistricts();
      if (step === "wards") return syncWards();
      if (step === "villages") return syncVillages();
      if (step === "grievance-categories") return syncGrievanceCategories();
      if (step === "grievance-types") return syncGrievanceTypes();
      if (step === "grievance-channels") return syncGrievanceChannels();

      if (!activeVillage) {
        throw new Error(t("select_active_working_village_before_sync"));
      }

      if (step === "households") {
        return syncVillageHouseholds(activeVillage, userReference);
      }
      if (step === "targeted-members") {
        return syncTargetedMembersForVillage(activeVillage, userReference);
      }
    },
    onError: async (error) => {
      if (await handleIfExpired(error)) return;
      console.error("[Onboarding Sync] Failed:", error);
    },
    onSettled: () => {
      setSyncStepInFlight(false);
    },
  });

  const selectVillageMutation = useMutation<void, Error, string>({
    mutationKey: ["SelectWorkingVillage", user?.reference],
    mutationFn: async (villageId) => {
      const reference = user?.reference;
      if (!reference) {
        throw new Error(t("user_required_before_selecting_working_village"));
      }

      const village = villages.find((item) => item.id === villageId && !isDeleted(item));
      const ward = village?.wardId ? wardById.get(village.wardId) : undefined;
      const district = ward?.districtId ? districtById.get(ward.districtId) : undefined;
      const region = district?.regionId ? regionById.get(district.regionId) : undefined;

      if (!village || !ward || !district || !region) {
        throw new Error(t("select_village_complete_hierarchy"));
      }

      await sessionLocation.mutateAsync({
        regionId: region.id,
        districtId: district.id,
        wardId: ward.id,
        villageId: village.id,
      });

      const currentUserId = user?.id;
      if (currentUserId) {
        const timestamp = new Date().toISOString();
        await upsertLocalRecord(userLocationsCollection, {
          id: `${currentUserId}:${village.id}`,
          userId: currentUserId,
          regionId: region.id,
          districtId: district.id,
          wardId: ward.id,
          villageId: village.id,
          synchronizedAt: null,
          createdAt: timestamp,
          updatedAt: timestamp,
          deletedAt: null,
        });
      }

      await ensureVillageScopedSyncMetadata(village.id, userReference);
    },
    onSuccess: () => {
      setSelectedVillageOverride(null);
    },
  });

  const isOffline = !isOnline;

  const stepCompletion: Record<OnboardingSyncStepKey, boolean> = {
    regions: completed.regions,
    districts: completed.districts,
    wards: completed.wards,
    villages: completed.villages,
    "grievance-categories": grievanceCompleted.categories,
    "grievance-types": grievanceCompleted.types,
    "grievance-channels": grievanceCompleted.channels,
    "select-village": completed.selectedVillage,
    households: completed.households,
    "targeted-members": completed.targetedMembers,
  };
  const stepDisabled: Record<OnboardingSyncStepKey, boolean> = {
    regions: isOffline,
    districts: !completed.regions || isOffline,
    wards: !completed.districts || isOffline,
    villages: !completed.wards || isOffline,
    "grievance-categories": !completed.villages || isOffline,
    "grievance-types": !grievanceCompleted.categories || isOffline,
    "grievance-channels": !grievanceCompleted.types || isOffline,
    "select-village": !completed.grievanceSetup,
    households: !activeVillage || isOffline,
    "targeted-members": !activeVillage || !completed.households || isOffline,
  };
  const allComplete = onboardingStepKeys.every((key) => stepCompletion[key]);
  const activeStepIndex = onboardingStepKeys.findIndex((key) => !stepCompletion[key]);
  const activeStep = activeStepIndex >= 0 ? onboardingStepKeys[activeStepIndex] : null;

  const showOfflineMessage = isOffline && !allComplete;

  type BottomAction = { label: string; enabled: boolean; onPress: () => void };
  const bottomAction: BottomAction | null = !activeStep
    ? null
    : activeStep === "select-village"
      ? {
          label: selectVillageMutation.isPending ? t("saving") : t("save_working_village"),
          enabled:
            Boolean(selectedVillageId) &&
            !selectVillageMutation.isPending &&
            !syncMutation.isPending &&
            completed.grievanceSetup,
          onPress: () => {
            if (selectedVillageId && !syncMutation.isPending) {
              selectVillageMutation.mutate(selectedVillageId);
            }
          },
        }
      : (() => {
          const stepKey =
            activeStep === "households"
              ? (activeHouseholdKey ?? "__missing__")
              : activeStep === "targeted-members"
                ? (activeTargetedMembersKey ?? "__missing__")
                : activeStep === "grievance-categories"
                  ? GRIEVANCE_CATEGORIES_SYNC_KEY
                  : activeStep === "grievance-types"
                    ? GRIEVANCE_TYPES_SYNC_KEY
                    : activeStep === "grievance-channels"
                      ? GRIEVANCE_CHANNELS_SYNC_KEY
                      : activeStep;
          const status = statusFor(stepKey, stepDisabled[activeStep]);
          const isAnySyncRunning = syncMutation.isPending || syncStepInFlight;
          return {
            label: isAnySyncRunning
              ? t("synchronizing")
              : status === "error"
                ? t("retry")
                : t("synchronize"),
            enabled: !isAnySyncRunning && !stepDisabled[activeStep],
            onPress: () => {
              if (syncStepInFlight || syncMutation.isPending) return;

              setSyncStepInFlight(true);
              syncMutation.mutate(activeStep);
            },
          };
        })();

  return (
    <StyledSafeAreaView className="flex-1 bg-white">
      <View className="flex-1">
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerClassName="gap-4 p-4"
        >
          <View className="gap-2">
            <Headline>{t("onboarding_synchronization")}</Headline>
            <Text className="text-sm text-gray-600">{t("complete_each_local_setup_step")}</Text>
          </View>

          {activeStep ? (
            <View className="flex-row items-center justify-between gap-3 py-1">
              <View className="flex-row items-center gap-2">
                {onboardingStepKeys.map((key, idx) => {
                  const isDone = stepCompletion[key];
                  const isCurrent = idx === activeStepIndex;
                  const isActive = isDone || isCurrent;
                  return (
                    <View
                      key={key}
                      style={{
                        width: isCurrent ? 24 : 8,
                        height: 8,
                        borderRadius: 999,
                        backgroundColor: isActive ? "#15803d" : "#d1d5db",
                        borderColor: isActive ? "#15803d" : "#9ca3af",
                        borderWidth: isActive ? 0 : StyleSheet.hairlineWidth,
                      }}
                    />
                  );
                })}
              </View>
              <Text className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                {t("step")} {activeStepIndex + 1} {t("of")} {onboardingStepKeys.length}
              </Text>
            </View>
          ) : null}

          {showOfflineMessage ? (
            <View className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <Text className="text-sm font-medium text-amber-900">
                {t("initial_setup_requires_internet_reconnect")}
              </Text>
            </View>
          ) : null}

          {!activeStep ? (
            <View className="rounded-lg border border-green-200 bg-green-50 p-3">
              <Text className="text-sm font-semibold text-green-800">
                {t("all_onboarding_steps_complete")}
              </Text>
            </View>
          ) : null}

          {activeStep === "regions" ? (
            <StepCard
              title={t("synchronize_regions")}
              description={t("synchronize_regions_description")}
              status={statusFor("regions", isOffline ? "requires-internet" : false)}
              count={syncCountFor("regions", visibleCounts.regions)}
              error={syncErrorFor("regions")}
              disabled={isOffline}
            />
          ) : null}

          {activeStep === "districts" ? (
            <StepCard
              title={t("synchronize_districts")}
              description={t("synchronize_districts_description")}
              status={statusFor("districts", isOffline ? "requires-internet" : !completed.regions)}
              count={syncCountFor("districts", visibleCounts.districts)}
              error={syncErrorFor("districts")}
              disabled={!completed.regions || isOffline}
            />
          ) : null}

          {activeStep === "wards" ? (
            <StepCard
              title={t("synchronize_wards")}
              description={t("synchronize_wards_description")}
              status={statusFor("wards", isOffline ? "requires-internet" : !completed.districts)}
              count={syncCountFor("wards", visibleCounts.wards)}
              error={syncErrorFor("wards")}
              disabled={!completed.districts || isOffline}
            />
          ) : null}

          {activeStep === "villages" ? (
            <StepCard
              title={t("synchronize_villages")}
              description={t("synchronize_villages_description")}
              status={statusFor("villages", isOffline ? "requires-internet" : !completed.wards)}
              count={syncCountFor("villages", visibleCounts.villages)}
              error={syncErrorFor("villages")}
              disabled={!completed.wards || isOffline}
            />
          ) : null}

          {activeStep === "grievance-categories" ? (
            <StepCard
              title={t("synchronize_grievance_categories")}
              description={t("synchronize_grievance_categories_description")}
              status={statusFor(
                GRIEVANCE_CATEGORIES_SYNC_KEY,
                isOffline ? "requires-internet" : !completed.villages,
              )}
              count={syncCountFor(GRIEVANCE_CATEGORIES_SYNC_KEY, visibleCounts.grievanceCategories)}
              error={syncErrorFor(GRIEVANCE_CATEGORIES_SYNC_KEY)}
              disabled={!completed.villages || isOffline}
            />
          ) : null}

          {activeStep === "grievance-types" ? (
            <StepCard
              title={t("synchronize_grievance_types")}
              description={t("synchronize_grievance_types_description")}
              status={statusFor(
                GRIEVANCE_TYPES_SYNC_KEY,
                isOffline ? "requires-internet" : !grievanceCompleted.categories,
              )}
              count={syncCountFor(GRIEVANCE_TYPES_SYNC_KEY, visibleCounts.grievanceTypes)}
              error={syncErrorFor(GRIEVANCE_TYPES_SYNC_KEY)}
              disabled={!grievanceCompleted.categories || isOffline}
            />
          ) : null}

          {activeStep === "grievance-channels" ? (
            <StepCard
              title={t("synchronize_grievance_channels")}
              description={t("synchronize_grievance_channels_description")}
              status={statusFor(
                GRIEVANCE_CHANNELS_SYNC_KEY,
                isOffline ? "requires-internet" : !grievanceCompleted.types,
              )}
              count={syncCountFor(GRIEVANCE_CHANNELS_SYNC_KEY, visibleCounts.grievanceChannels)}
              error={syncErrorFor(GRIEVANCE_CHANNELS_SYNC_KEY)}
              disabled={!grievanceCompleted.types || isOffline}
            />
          ) : null}

          {activeStep === "select-village" ? (
            <StepCard
              title={t("select_working_village")}
              description={t("select_working_village_description")}
              status={
                !completed.grievanceSetup
                  ? "blocked"
                  : activeVillage
                    ? "completed"
                    : activeVillageId
                      ? "error"
                      : "idle"
              }
              count={activeVillage ? 1 : 0}
              disabled={!completed.grievanceSetup}
              error={
                activeVillageId && !activeVillage
                  ? t("selected_village_no_longer_exists")
                  : selectVillageMutation.error?.message
              }
            >
              {completed.grievanceSetup ? (
                <VillageSelection
                  key={[
                    selectedVillageId ?? "",
                    activeVillageId ?? "",
                    regions.length,
                    districts.length,
                    wards.length,
                    villages.length,
                  ].join(":")}
                  regions={regions}
                  districts={districts}
                  wards={wards}
                  villages={villages}
                  selectedVillageId={selectedVillageId}
                  activeVillageId={activeVillageId}
                  disabled={selectVillageMutation.isPending}
                  onSelect={setSelectedVillageOverride}
                />
              ) : null}
            </StepCard>
          ) : null}

          {activeStep === "households" ? (
            <StepCard
              title={t("synchronize_households")}
              description={t("synchronize_households_description")}
              status={statusFor(
                activeHouseholdKey ?? "__missing__",
                !activeVillage
                  ? "requires-village-selection"
                  : isOffline
                    ? "requires-internet"
                    : false,
              )}
              count={
                activeHouseholdKey
                  ? syncCountFor(activeHouseholdKey, visibleCounts.households)
                  : visibleCounts.households
              }
              error={activeHouseholdKey ? syncErrorFor(activeHouseholdKey) : null}
              disabled={!activeVillage || isOffline}
            />
          ) : null}

          {activeStep === "targeted-members" ? (
            <StepCard
              title={t("synchronize_targeted_members")}
              description={t("synchronize_targeted_members_description")}
              status={statusFor(
                activeTargetedMembersKey ?? "__missing__",
                !activeVillage
                  ? "requires-village-selection"
                  : isOffline
                    ? "requires-internet"
                    : !completed.households,
              )}
              count={
                activeTargetedMembersKey
                  ? syncCountFor(activeTargetedMembersKey, visibleCounts.targetedMembers)
                  : visibleCounts.targetedMembers
              }
              error={activeTargetedMembersKey ? syncErrorFor(activeTargetedMembersKey) : null}
              disabled={!activeVillage || !completed.households || isOffline}
            />
          ) : null}
        </ScrollView>

        {syncMutation.isPending ? (
          <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
            <ActivityIndicator size="large" color="#0d542b" />
          </View>
        ) : null}

        {bottomAction ? (
          <View className="px-4 pt-4">
            <Host style={{ width: "100%", height: 44 }}>
              <Button
                modifiers={[fillMaxWidth(), clip(Shapes.RoundedCorner(100))]}
                colors={{ contentColor: "#ffffff", containerColor: "#0d542b" }}
                enabled={bottomAction.enabled}
                onClick={bottomAction.onPress}
              >
                <JCText>{bottomAction.label}</JCText>
              </Button>
            </Host>
          </View>
        ) : null}
      </View>
    </StyledSafeAreaView>
  );
}
