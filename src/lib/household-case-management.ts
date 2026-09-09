import type { HouseholdMemberRecord } from "@/src/powersync/schema";
import { randomUUID } from "expo-crypto";

import { enqueueHouseholdChangeRequest } from "@/src/powersync/mutations";

export type HouseholdChangeType =
  | "household_details_update"
  | "household_address_change"
  | "household_deactivated"
  | "payment_phone_update_requested"
  | "payment_phone_updated"
  | "member_added"
  | "member_updated"
  | "member_deactivated";

export const MEMBER_DEACTIVATION_REASONS = [
  "Moved out of household",
  "Deceased",
  "Duplicate member record",
  "No longer eligible",
  "Incorrectly added to household",
  "Requested removal",
] as const;

export const HOUSEHOLD_DEACTIVATION_REASONS = [
  "PMT status changed to non-poor",
  "Moved out of program area",
  "Duplicate household record",
  "Household dissolved",
  "Incorrectly added to program",
  "Requested removal",
] as const;

export type MemberDeactivationReason = (typeof MEMBER_DEACTIVATION_REASONS)[number];
export type HouseholdDeactivationReason = (typeof HOUSEHOLD_DEACTIVATION_REASONS)[number];

type QueueHouseholdChangeInput = {
  householdUuid: string;
  memberUuid?: string | null;
  type: HouseholdChangeType;
  payload: Record<string, unknown>;
};

type HouseholdJsonExt = {
  head?: unknown;
  head_id?: unknown;
  primary_recipient?: unknown;
  primary_recipient_id?: unknown;
  members?: unknown;
};

function parseHouseholdJsonExt(jsonExt: string | null | undefined): HouseholdJsonExt | null {
  if (!jsonExt) return null;

  try {
    const data = typeof jsonExt === "string" ? JSON.parse(jsonExt) : jsonExt;
    return data && typeof data === "object" ? (data as HouseholdJsonExt) : null;
  } catch (error) {
    console.error("Failed to parse household jsonExt:", error);
    return null;
  }
}

function getString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getMembers(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function getMemberName(members: Record<string, unknown> | null, uuid: string | null) {
  if (!members || !uuid) return null;

  return getString(members[uuid]);
}

export function getHouseholdRepresentativeName(
  jsonExt: string | null | undefined,
  fallbackName?: string | null,
) {
  const data = parseHouseholdJsonExt(jsonExt);
  if (!data) return fallbackName?.trim() || null;

  const members = getMembers(data.members);
  const representativeId = getString(data.primary_recipient_id);
  const headId = getString(data.head_id);

  return (
    getString(data.primary_recipient) ??
    getMemberName(members, representativeId) ??
    getMemberName(members, headId) ??
    fallbackName?.trim() ??
    null
  );
}

export function getHouseholdChangeTitle(type: HouseholdChangeType) {
  switch (type) {
    case "household_details_update":
      return "Household details updated";
    case "household_address_change":
      return "Household address changed";
    case "household_deactivated":
      return "Household deactivated";
    case "payment_phone_update_requested":
      return "Payment phone update requested";
    case "payment_phone_updated":
      return "Payment phone updated";
    case "member_added":
      return "Household member added";
    case "member_updated":
      return "Household member updated";
    case "member_deactivated":
      return "Household member deactivated";
  }
}

export function queueHouseholdChange({
  householdUuid,
  memberUuid = null,
  type,
  payload,
}: QueueHouseholdChangeInput) {
  return enqueueHouseholdChangeRequest({
    householdUuid,
    memberUuid,
    type,
    payload,
  });
}

export function parseHouseholdMembers(
  jsonExt: string | null | undefined,
  householdUuid: string,
): HouseholdMemberRecord[] {
  const data = parseHouseholdJsonExt(jsonExt);
  if (!data) return [];

  const members = getMembers(data.members);

  if (!members) {
    return [];
  }

  const headId = getString(data.head_id);
  const representativeId = getString(data.primary_recipient_id) ?? headId;

  return Object.entries(members)
    .filter((entry): entry is [string, string] => {
      const [, fullName] = entry;
      return typeof fullName === "string" && fullName.trim() !== "" && fullName !== "##N/A##";
    })
    .map(([uuid, fullName]) => ({
      id: uuid,
      uuid,
      householdUuid,
      fullName: fullName.trim(),
      middleName: null,
      dateOfBirth: null,
      gender: "unknown",
      relationship: null,
      education: null,
      isDisabled: 0,
      disability: null,
      disabilityLevel: null,
      currentSchoolLevel: null,
      premNumber: null,
      avatarUri: null,
      identityType: null,
      identityNumber: null,
      identityScanUri: null,
      phoneNumber: null,
      isHead: headId === uuid ? 1 : 0,
      isRepresentative: representativeId === uuid ? 1 : 0,
      isActive: 1,
      deactivationReason: null,
      synchronizedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    }));
}

export function createLocalMemberUuid() {
  return randomUUID();
}
