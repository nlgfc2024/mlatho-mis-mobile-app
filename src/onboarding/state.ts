import type { SyncMetadataRecord } from "@/src/powersync/schema";

import { syncMetadataCollection } from "@/src/powersync/collections";
import { waitForCollection } from "@/src/powersync/remote-sync";
import { updateStatus } from "@/src/sync/update-status";

export const LOCATION_SYNC_KEYS = ["regions", "districts", "wards", "villages"] as const;
/** Legacy combined grievance-setup key, kept read-only for users who synced before the split. */
export const GRIEVANCE_SETUP_SYNC_KEY = "grievance_setup" as const;
export const GRIEVANCE_CATEGORIES_SYNC_KEY = "grievance_categories" as const;
export const GRIEVANCE_TYPES_SYNC_KEY = "grievance_types" as const;
export const GRIEVANCE_CHANNELS_SYNC_KEY = "grievance_channels" as const;
export const GRIEVANCE_SYNC_KEYS = [
  GRIEVANCE_CATEGORIES_SYNC_KEY,
  GRIEVANCE_TYPES_SYNC_KEY,
  GRIEVANCE_CHANNELS_SYNC_KEY,
] as const;

export const ONBOARDING_SYNC_STEP_KEYS = [
  "regions",
  "districts",
  "wards",
  "villages",
  "grievance-categories",
  "grievance-types",
  "grievance-channels",
  "select-village",
  "households",
  "targeted-members",
] as const;

export type LocationSyncKey = (typeof LOCATION_SYNC_KEYS)[number];
export type OnboardingSyncStepKey = (typeof ONBOARDING_SYNC_STEP_KEYS)[number];

type MetadataRecord = Partial<Pick<SyncMetadataRecord, "key" | "value" | "cursor">> & {
  status?: string | null;
  locationId?: string | null;
  userId?: string | null;
  error?: string | null;
};

function cleanScope(value: number | string | null | undefined) {
  return String(value ?? "unknown").replace(/[^a-zA-Z0-9_-]/g, "_");
}

export function getHouseholdSyncKey(
  villageId: number | string,
  userReference?: number | string | null,
) {
  return `households_village_${cleanScope(villageId)}_user_${cleanScope(userReference)}`;
}

export function getTargetedMembersSyncKey(
  villageId: number | string,
  userReference?: number | string | null,
) {
  return `targeted_members_village_${cleanScope(villageId)}_user_${cleanScope(userReference)}`;
}

export function getMetadataStatus(metadata: MetadataRecord[], key: string) {
  const record = metadata.find((item) => item.key === key);
  return record?.value ?? record?.status ?? "idle";
}

export function isCompletedStatus(value: string | null | undefined) {
  return value === "completed";
}

export function isLocationHierarchySynced(
  metadata: MetadataRecord[],
  userReference?: number | string | null,
  locationScopeKey?: string | null,
) {
  const expectedUserId = userReference == null ? null : String(userReference);
  return LOCATION_SYNC_KEYS.every((key) => {
    const record = metadata.find((item) => item.key === key);
    return (
      isCompletedStatus(record?.value ?? record?.status) &&
      (!expectedUserId || record?.userId === expectedUserId) &&
      (!locationScopeKey || record?.locationId === locationScopeKey)
    );
  });
}

export function isGrievanceStepSynced(metadata: MetadataRecord[], key: string) {
  return (
    isCompletedStatus(getMetadataStatus(metadata, GRIEVANCE_SETUP_SYNC_KEY)) ||
    isCompletedStatus(getMetadataStatus(metadata, key))
  );
}

export function isGrievanceSetupSynced(metadata: MetadataRecord[]) {
  return GRIEVANCE_SYNC_KEYS.every((key) => isGrievanceStepSynced(metadata, key));
}

export function isVillageScopedSyncComplete(
  metadata: MetadataRecord[],
  villageId: number | string | null | undefined,
  userReference?: number | string | null,
  requirements: { households?: boolean; targetedMembers?: boolean } = {},
) {
  if (!villageId) return false;

  const householdsRequired = requirements.households ?? true;
  const targetedMembersRequired = requirements.targetedMembers ?? true;

  return (
    (!householdsRequired ||
      isCompletedStatus(
        getMetadataStatus(metadata, getHouseholdSyncKey(villageId, userReference)),
      )) &&
    (!targetedMembersRequired ||
      isCompletedStatus(
        getMetadataStatus(metadata, getTargetedMembersSyncKey(villageId, userReference)),
      ))
  );
}

export function isOnboardingComplete({
  metadata,
  hasSelectedVillage,
  activeVillageExists,
  villageId,
  userReference,
  locationScopeKey,
  householdSyncRequired,
  targetedMembersSyncRequired,
}: {
  metadata: MetadataRecord[];
  hasSelectedVillage: boolean;
  activeVillageExists: boolean;
  villageId?: number | string | null;
  userReference?: number | string | null;
  locationScopeKey?: string | null;
  householdSyncRequired?: boolean;
  targetedMembersSyncRequired?: boolean;
}) {
  return (
    isLocationHierarchySynced(metadata, userReference, locationScopeKey) &&
    isGrievanceSetupSynced(metadata) &&
    hasSelectedVillage &&
    activeVillageExists &&
    isVillageScopedSyncComplete(metadata, villageId, userReference, {
      households: householdSyncRequired,
      targetedMembers: targetedMembersSyncRequired,
    })
  );
}

async function ensureSyncMetadataKey(
  key: string,
  options?: { module?: string | null; locationId?: string | null; userId?: string | null },
) {
  await waitForCollection(syncMetadataCollection);

  if (!syncMetadataCollection.has(key)) {
    await updateStatus(key, "idle", null, options);
  }
}

export async function ensureLocationSyncMetadata(
  userReference?: number | string | null,
  locationScopeKey?: string | null,
) {
  const userId = userReference == null ? null : String(userReference);
  for (const key of LOCATION_SYNC_KEYS) {
    await ensureSyncMetadataKey(key, { module: "location-hierarchy", userId });
    const existing = syncMetadataCollection.get(key);
    if (
      userId &&
      (existing?.userId !== userId ||
        (locationScopeKey != null && existing?.locationId !== locationScopeKey))
    ) {
      await updateStatus(key, "idle", null, {
        module: "location-hierarchy",
        locationId: locationScopeKey ?? null,
        userId,
        syncedCount: 0,
      });
    }
  }
}

export async function ensureGrievanceSetupSyncMetadata() {
  for (const key of GRIEVANCE_SYNC_KEYS) {
    await ensureSyncMetadataKey(key, { module: "grievances" });
  }
}

export async function ensureVillageScopedSyncMetadata(
  villageId: number | string,
  userReference?: number | string | null,
) {
  await ensureSyncMetadataKey(getHouseholdSyncKey(villageId, userReference), {
    module: "households",
    locationId: String(villageId),
    userId: userReference ? String(userReference) : null,
  });
  await ensureSyncMetadataKey(getTargetedMembersSyncKey(villageId, userReference), {
    module: "targeted-members",
    locationId: String(villageId),
    userId: userReference ? String(userReference) : null,
  });
}
