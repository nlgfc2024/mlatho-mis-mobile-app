export const EMPTY_VALUE = "N/A";

export type TargetedMemberLocation = {
  id?: string | null;
  uuid?: string | null;
  code?: string | null;
  name?: string | null;
  type?: string | null;
  parent?: TargetedMemberLocation | null;
};

export type LocalTargetedMember = {
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  dateOfBirth?: string | null;
  updatedAt?: string | null;
  locationJson?: string | null;
  groupIdsJson?: string | null;
};

function parseJson<T>(value?: string | null): T | null {
  if (!value) return null;

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function getTargetedMemberName(member?: LocalTargetedMember | null) {
  if (member?.fullName?.trim()) return member.fullName.trim();

  const fullName = [member?.firstName, member?.lastName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");

  return fullName || "Unnamed targeted member";
}

export function formatTargetedMemberDate(value?: string | null) {
  if (!value) return EMPTY_VALUE;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return EMPTY_VALUE;

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

export function getTargetedMemberLocation(member?: LocalTargetedMember | null) {
  return parseJson<TargetedMemberLocation>(member?.locationJson);
}

export function formatLocationHierarchy(location?: TargetedMemberLocation | null) {
  if (!location) return EMPTY_VALUE;

  const hierarchy: TargetedMemberLocation[] = [];
  let current: TargetedMemberLocation | null | undefined = location;

  while (current) {
    hierarchy.push(current);
    current = current.parent;
  }

  const names = hierarchy
    .reverse()
    .map((item) => item.name?.trim())
    .filter(Boolean);

  return names.length > 0 ? names.join(" · ") : EMPTY_VALUE;
}

export function formatLocationHierarchyExcludingVillage(location?: TargetedMemberLocation | null) {
  if (!location?.parent) return EMPTY_VALUE;

  const hierarchy: TargetedMemberLocation[] = [];
  let current: TargetedMemberLocation | null | undefined = location.parent;

  while (current) {
    hierarchy.push(current);
    current = current.parent;
  }

  const names = hierarchy
    .reverse()
    .map((item) => item.name?.trim())
    .filter(Boolean);

  return names.length > 0 ? names.join(" · ") : EMPTY_VALUE;
}

export function formatVillageName(member?: LocalTargetedMember | null) {
  const location = getTargetedMemberLocation(member);
  if (!location) return EMPTY_VALUE;

  let current: TargetedMemberLocation | null | undefined = location;

  while (current) {
    if (current.type?.trim().toLowerCase() === "village") {
      return current.name?.trim() || EMPTY_VALUE;
    }
    current = current.parent;
  }

  return location.name?.trim() || EMPTY_VALUE;
}

export function getTargetedMemberGroups(member?: LocalTargetedMember | null) {
  const groups = parseJson<string[]>(member?.groupIdsJson) ?? [];
  return Array.from(new Set(groups.filter(Boolean)));
}
