import type { HouseholdMemberRecord } from "@/src/powersync/schema";
import type { TFunction } from "i18next";

import { getDateLocale, translateDeactivationReason, translateStatus } from "@/src/i18n/helpers";

export type HouseholdMember = Partial<HouseholdMemberRecord> & {
  id: string;
  uuid?: string | null;
  fullName?: string | null;
  householdUuid?: string | null;
};

const ADULT_AGE = 18;
type Translator = TFunction | undefined;

export type HouseholdMemberDetailRow = {
  label: string;
  value: string | null | undefined;
  mutedValue?: string | null | undefined;
  destructive?: boolean;
};

export type HouseholdMemberDetailSection = {
  title: string;
  rows: HouseholdMemberDetailRow[];
};

function parseMemberDate(value: string | null | undefined) {
  if (!value) return null;

  const trimmed = value.trim();
  const dateOnlyMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(trimmed);

  if (dateOnlyMatch) {
    const [, yearValue, monthValue, dayValue] = dateOnlyMatch;
    const year = Number(yearValue);
    const month = Number(monthValue);
    const day = Number(dayValue);
    const date = new Date(year, month - 1, day);

    if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
      return date;
    }

    return null;
  }

  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getAgeInYears(value: string | null | undefined) {
  const birthDate = parseMemberDate(value);
  if (!birthDate) return null;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const birthdayThisYear = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());

  if (today < birthdayThisYear) {
    age -= 1;
  }

  return age >= 0 ? age : null;
}

function translate(
  t: Translator,
  key: string,
  fallback: string,
  options?: Record<string, unknown>,
) {
  return t ? String(t(key, options as any)) : fallback;
}

export function translateMemberOption(t: Translator, value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase();

  switch (normalized) {
    case "male":
      return translate(t, "male", "Male");
    case "female":
      return translate(t, "female", "Female");
    case "no":
      return translate(t, "no", "No");
    case "spouse":
      return translate(t, "relationship_spouse", "Spouse");
    case "child":
      return translate(t, "relationship_child", "Child");
    case "parent":
      return translate(t, "relationship_parent", "Parent");
    case "sibling":
      return translate(t, "relationship_sibling", "Sibling");
    case "grandchild":
      return translate(t, "relationship_grandchild", "Grandchild");
    case "grandparent":
      return translate(t, "relationship_grandparent", "Grandparent");
    case "other relative":
      return translate(t, "relationship_other_relative", "Other relative");
    case "non-relative":
      return translate(t, "relationship_non_relative", "Non-relative");
    case "no formal education":
      return translate(t, "education_no_formal", "No formal education");
    case "primary":
      return translate(t, "primary", "Primary");
    case "secondary":
      return translate(t, "secondary", "Secondary");
    case "vocational":
      return translate(t, "education_vocational", "Vocational");
    case "diploma":
      return translate(t, "education_diploma", "Diploma");
    case "university":
      return translate(t, "education_university", "University");
    case "postgraduate":
      return translate(t, "education_postgraduate", "Postgraduate");
    case "visual impairment":
      return translate(t, "disability_visual_impairment", "Visual impairment");
    case "hearing impairment":
      return translate(t, "disability_hearing_impairment", "Hearing impairment");
    case "mobility impairment":
      return translate(t, "disability_mobility_impairment", "Mobility impairment");
    case "self-care difficulty":
      return translate(t, "disability_self_care_difficulty", "Self-care difficulty");
    case "communication difficulty":
      return translate(t, "disability_communication_difficulty", "Communication difficulty");
    case "memory or cognition difficulty":
      return translate(
        t,
        "disability_memory_or_cognition_difficulty",
        "Memory or cognition difficulty",
      );
    case "albinism":
      return translate(t, "disability_albinism", "Albinism");
    case "some difficulty":
      return translate(t, "difficulty_some", "Some difficulty");
    case "a lot of difficulty":
      return translate(t, "difficulty_a_lot", "A lot of difficulty");
    case "cannot do at all":
      return translate(t, "difficulty_cannot_do", "Cannot do at all");
    case "national id / nida":
      return translate(t, "document_national_id", "National ID / NIDA");
    case "voter id":
      return translate(t, "document_voter_id", "Voter ID");
    case "passport":
      return translate(t, "document_passport", "Passport");
    case "driving license":
      return translate(t, "document_driving_license", "Driving License");
    case "birth certificate":
      return translate(t, "document_birth_certificate", "Birth Certificate");
    case "bima ya afya":
      return translate(t, "document_health_insurance", "Bima ya afya");
    case "other":
      return translate(t, "other", "Other");
    default:
      return value;
  }
}

function formatDateLabel(value: string | null | undefined, language?: string) {
  const date = parseMemberDate(value);
  if (!date) return null;

  return date.toLocaleDateString(getDateLocale(language), {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatAgeLabel(value: string | null | undefined, t?: Translator) {
  const age = getAgeInYears(value);
  if (age === null) return null;

  return translate(t, "year_old_count", `${age} ${age === 1 ? "year" : "years"} old`, {
    count: age,
  });
}

function formatBirthdayAgeLabel(
  value: string | null | undefined,
  t?: Translator,
  language?: string,
) {
  const age = formatAgeLabel(value, t);
  const birthday = formatDateLabel(value, language);

  if (age && birthday) {
    return {
      value: age,
      mutedValue: `(${birthday})`,
    };
  }

  return { value: age ?? birthday };
}

export function getHouseholdMemberAgeGroup(value: string | null | undefined, t?: Translator) {
  const age = getAgeInYears(value);
  if (age === null) return translate(t, "age_unknown", "age unknown");

  return age < ADULT_AGE ? translate(t, "minor", "Minor") : translate(t, "adult", "Adult");
}

export function isHouseholdMemberAdult(value: string | null | undefined) {
  const age = getAgeInYears(value);
  return age !== null && age >= ADULT_AGE;
}

export function getHouseholdMemberInitials(name: string | null | undefined) {
  const parts =
    name
      ?.trim()
      .split(/[\s_-]+/)
      .filter(Boolean) ?? [];
  if (!parts.length) return "??";

  const initials =
    parts.length > 1
      ? parts
          .slice(0, 2)
          .map((part) => Array.from(part)[0] ?? "")
          .join("")
      : Array.from(parts[0] ?? "")
          .slice(0, 2)
          .join("");

  const normalized = initials.toUpperCase();
  return normalized.length >= 2 ? normalized : `${normalized}${normalized}`.slice(0, 2);
}

function formatTitleCase(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  return trimmed
    .split(/\s+/)
    .map((word) => word.slice(0, 1).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function formatGenderSummary(value: string | null | undefined, t?: Translator) {
  const gender = formatTitleCase(value);

  if (!gender || gender === "Unknown") return translate(t, "gender_unknown", "Gender unknown");

  if (gender.toLowerCase() === "male") return translate(t, "male", "Male");
  if (gender.toLowerCase() === "female") return translate(t, "female", "Female");

  return gender;
}

function formatSchoolLevel(value: string | null | undefined, t?: Translator) {
  if (value === "primary") return translate(t, "primary", "Primary");
  if (value === "secondary") return translate(t, "secondary", "Secondary");

  return translateMemberOption(t, value);
}

function hasText(value: string | null | undefined) {
  return Boolean(value?.trim());
}

function getHouseholdMemberNameParts(member: HouseholdMember) {
  const parts = (member.fullName ?? "").trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0] ?? "";
  const lastName = parts.length > 1 ? (parts.at(-1) ?? "") : "";
  const middleName =
    member.middleName?.trim() || (parts.length > 2 ? parts.slice(1, -1).join(" ") : "");

  return { firstName, middleName, lastName };
}

export function getHouseholdMemberProfileCompletion(member: HouseholdMember) {
  const { firstName, middleName, lastName } = getHouseholdMemberNameParts(member);
  const isAdult = isHouseholdMemberAdult(member.dateOfBirth);
  const isInSchool =
    member.currentSchoolLevel === "primary" || member.currentSchoolLevel === "secondary";
  const fields = [
    hasText(firstName),
    hasText(middleName),
    hasText(lastName),
    hasText(member.relationship),
    hasText(member.dateOfBirth),
    hasText(member.gender) && member.gender !== "unknown",
    hasText(member.education),
    typeof member.isDisabled === "boolean" || typeof member.isDisabled === "number",
  ];

  if (isAdult) {
    fields.push(hasText(member.identityType), hasText(member.identityNumber));
  }

  if (isInSchool) {
    fields.push(hasText(member.premNumber));
  }

  if (Boolean(member.isDisabled)) {
    fields.push(hasText(member.disability), hasText(member.disabilityLevel));
  }

  const completedFields = fields.filter(Boolean).length;
  const totalFields = fields.length;
  const percentage = totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 0;

  return {
    completedFields,
    totalFields,
    percentage,
  };
}

export function formatHouseholdMemberRowSummary(member: HouseholdMember, t?: Translator) {
  const ageGroup = getHouseholdMemberAgeGroup(member.dateOfBirth, t);
  const gender = formatGenderSummary(member.gender, t);
  const relationship =
    translateMemberOption(t, member.relationship) || translate(t, "member", "Member");

  return `${ageGroup} · ${gender} · ${relationship}`;
}

export function getHouseholdMemberRoleLabel(
  member: Pick<HouseholdMember, "isHead" | "isRepresentative">,
  t?: Translator,
) {
  const roles = [
    member.isHead ? translate(t, "head", "Head") : null,
    member.isRepresentative ? translate(t, "representative", "Representative") : null,
  ].filter(Boolean);

  return roles.length ? roles.join(" | ") : translate(t, "member", "Member");
}

export function buildHouseholdMemberDetailSections(
  member: HouseholdMember,
  t?: Translator,
  language?: string,
): HouseholdMemberDetailSection[] {
  const isAdult = isHouseholdMemberAdult(member.dateOfBirth);
  const disabilityDetails: HouseholdMemberDetailRow[] = member.isDisabled
    ? [
        { label: translate(t, "disabled", "Disabled"), value: translate(t, "yes", "Yes") },
        {
          label: translate(t, "disability", "Disability"),
          value: translateMemberOption(t, member.disability),
        },
        {
          label: translate(t, "disability_level", "Disability level"),
          value: translateMemberOption(t, member.disabilityLevel),
        },
      ]
    : [];

  const sections: HouseholdMemberDetailSection[] = [
    {
      title: translate(t, "personal_information", "Personal information"),
      rows: [
        {
          label: translate(t, "birthday", "Birthday"),
          ...formatBirthdayAgeLabel(member.dateOfBirth, t, language),
        },
        {
          label: translate(t, "age_group", "Age group"),
          value: getHouseholdMemberAgeGroup(member.dateOfBirth, t),
        },
        { label: translate(t, "gender", "Gender"), value: formatGenderSummary(member.gender, t) },
        { label: translate(t, "phone_number", "Phone number"), value: member.phoneNumber },
      ],
    },
    {
      title: translate(t, "household_role", "Household role"),
      rows: [
        {
          label: translate(t, "relationship", "Relationship"),
          value: translateMemberOption(t, member.relationship),
        },
        {
          label: translate(t, "head_of_household", "Head of household"),
          value: member.isHead ? translate(t, "yes", "Yes") : translate(t, "no", "No"),
        },
        {
          label: translate(t, "household_representative", "Household representative"),
          value: member.isRepresentative ? translate(t, "yes", "Yes") : translate(t, "no", "No"),
        },
      ],
    },
    ...(isAdult
      ? [
          {
            title: translate(t, "identity", "Identity"),
            rows: [
              {
                label: translate(t, "id_type", "ID type"),
                value: translateMemberOption(t, member.identityType),
              },
              { label: translate(t, "id_number", "ID number"), value: member.identityNumber },
              {
                label: translate(t, "id_scan", "ID scan"),
                value: member.identityScanUri ? translate(t, "captured", "Captured") : null,
              },
            ],
          },
        ]
      : [
          {
            title: translate(t, "documents", "Documents"),
            rows: [
              {
                label: translate(t, "document_type", "Document type"),
                value: translateMemberOption(t, member.identityType),
              },
              {
                label: translate(t, "document_number", "Document number"),
                value: member.identityNumber,
              },
              {
                label: translate(t, "document_scan", "Document scan"),
                value: member.identityScanUri ? translate(t, "captured", "Captured") : null,
              },
            ],
          },
        ]),
    {
      title: translate(t, "education", "Education"),
      rows: [
        {
          label: translate(t, "education", "Education"),
          value: translateMemberOption(t, member.education),
        },
        {
          label: translate(t, "current_school", "Current school"),
          value: formatSchoolLevel(member.currentSchoolLevel, t),
        },
        { label: translate(t, "prem_number", "PREM number"), value: member.premNumber },
      ],
    },
    {
      title: translate(t, "disability", "Disability"),
      rows: disabilityDetails,
    },
    {
      title: translate(t, "status", "Status"),
      rows: [
        {
          label: translate(t, "status", "Status"),
          value: t
            ? translateStatus(t, member.isActive ? "active" : "inactive")
            : member.isActive
              ? "Active"
              : "Inactive",
        },
        {
          label: translate(t, "deactivation_reason", "Deactivation reason"),
          value: member.deactivationReason
            ? t
              ? translateDeactivationReason(t, member.deactivationReason)
              : member.deactivationReason
            : member.deactivationReason,
          destructive: true,
        },
      ],
    },
  ];

  return sections.filter((section) => section.rows.length > 0);
}

export function buildHouseholdMemberDetails(
  member: HouseholdMember,
  t?: Translator,
): HouseholdMemberDetailRow[] {
  return buildHouseholdMemberDetailSections(member, t).flatMap((section) => section.rows);
}
