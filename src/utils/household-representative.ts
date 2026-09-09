import type { HouseholdMember } from "@/src/utils/household-member";

import { getHouseholdMemberAgeGroup } from "@/src/utils/household-member";

const PREFERRED_REPRESENTATIVE_RELATIONSHIPS = new Set(["wife", "mother", "mom"]);
const FEMALE_PREFERRED_REPRESENTATIVE_RELATIONSHIPS = new Set(["spouse", "parent"]);

function normalizeName(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function getRelationshipPriority(member: HouseholdMember) {
  const relationshipTokens =
    member.relationship
      ?.toLowerCase()
      .split(/[^a-z]+/)
      .filter(Boolean) ?? [];
  const isFemale = member.gender?.toLowerCase() === "female";

  if (
    relationshipTokens.some((token) => PREFERRED_REPRESENTATIVE_RELATIONSHIPS.has(token)) ||
    (isFemale &&
      relationshipTokens.some((token) => FEMALE_PREFERRED_REPRESENTATIVE_RELATIONSHIPS.has(token)))
  ) {
    return 0;
  }

  return 1;
}

function getAgePriority(member: HouseholdMember) {
  return getHouseholdMemberAgeGroup(member.dateOfBirth) === "Adult" ? 0 : 1;
}

function getGenderPriority(member: HouseholdMember) {
  const gender = member.gender?.toLowerCase();

  if (gender === "female") return 0;
  if (gender === "male") return 1;

  return 2;
}

export function isHouseholdRepresentative(
  member: HouseholdMember,
  householdRepresentativeName: string | null | undefined,
  householdHeadName?: string | null | undefined,
) {
  const representativeName = normalizeName(householdRepresentativeName);
  const headName = normalizeName(householdHeadName);
  const isUsingHeadFallback = !representativeName || representativeName === headName;

  return (
    Boolean(member.isRepresentative) ||
    normalizeName(member.fullName) === representativeName ||
    (isUsingHeadFallback && (member.isHead || normalizeName(member.fullName) === headName))
  );
}

export function getHouseholdRepresentativeDisplayName(household: {
  representativeName?: string | null;
  headName?: string | null;
}) {
  return household.representativeName?.trim() || household.headName?.trim() || null;
}

export function sortHouseholdRepresentativeCandidates(members: HouseholdMember[]) {
  return [...members].sort((first, second) => {
    const relationshipPriority = getRelationshipPriority(first) - getRelationshipPriority(second);
    if (relationshipPriority !== 0) return relationshipPriority;

    const agePriority = getAgePriority(first) - getAgePriority(second);
    if (agePriority !== 0) return agePriority;

    const genderPriority = getGenderPriority(first) - getGenderPriority(second);
    if (genderPriority !== 0) return genderPriority;

    return (first.fullName ?? "").localeCompare(second.fullName ?? "");
  });
}
