export function toISODateString(date: string | Date) {
  return new Date(date).toISOString().split("T")[0];
}

function parseLocalDate(value: string | Date | null | undefined) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

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

function getAgeInYears(birthDate: Date, asOf = new Date()) {
  let age = asOf.getFullYear() - birthDate.getFullYear();
  const birthdayThisYear = new Date(asOf.getFullYear(), birthDate.getMonth(), birthDate.getDate());

  if (asOf < birthdayThisYear) {
    age -= 1;
  }

  return age >= 0 ? age : null;
}

export function formatHouseholdMemberSummary(member: {
  dateOfBirth?: string | null;
  relationship?: string | null;
  education?: string | null;
  isDisabled?: boolean | number | null;
  disability?: string | null;
  disabilityLevel?: string | null;
  currentSchoolLevel?: string | null;
  premNumber?: string | null;
}) {
  const relationship = member.relationship?.trim() || "Member";
  const education = member.education?.trim();
  const schoolLevel =
    member.currentSchoolLevel === "primary"
      ? "in primary school"
      : member.currentSchoolLevel === "secondary"
        ? "in secondary school"
        : null;
  const premNumber = member.premNumber?.trim() ? `PREM ${member.premNumber.trim()}` : null;
  const disability =
    member.isDisabled && member.disability
      ? `Disabled: ${
          member.disabilityLevel
            ? `${member.disability} (${member.disabilityLevel})`
            : member.disability
        }`
      : null;
  const birthDate = parseLocalDate(member.dateOfBirth);

  if (!birthDate) {
    return [
      "Birthday not recorded",
      "age unknown",
      relationship,
      education,
      schoolLevel,
      premNumber,
      disability,
    ]
      .filter(Boolean)
      .join(" · ");
  }

  const birthday = birthDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const age = getAgeInYears(birthDate);

  if (age === null) {
    return [birthday, "age unknown", relationship, education, schoolLevel, premNumber, disability]
      .filter(Boolean)
      .join(" · ");
  }

  const yearsOld = `${age} ${age === 1 ? "year" : "years"} old`;
  const ageGroup = age < 18 ? "Minor" : "Adult";

  return [
    birthday,
    yearsOld,
    ageGroup,
    relationship,
    education,
    schoolLevel,
    premNumber,
    disability,
  ]
    .filter(Boolean)
    .join(" · ");
}
