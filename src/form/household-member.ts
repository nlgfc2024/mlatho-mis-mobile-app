import { parsePhoneNumberFromString } from "libphonenumber-js";
import * as z from "zod";

export const RELATIONSHIP_OPTIONS = [
  "Spouse",
  "Child",
  "Parent",
  "Sibling",
  "Grandchild",
  "Grandparent",
  "Other relative",
  "Non-relative",
] as const;

export const EDUCATION_OPTIONS = [
  "No formal education",
  "Primary",
  "Secondary",
  "Vocational",
  "Diploma",
  "University",
  "Postgraduate",
] as const;

export const DISABILITY_OPTIONS = [
  "Visual impairment",
  "Hearing impairment",
  "Mobility impairment",
  "Self-care difficulty",
  "Communication difficulty",
  "Memory or cognition difficulty",
  "Albinism",
] as const;

export const DISABILITY_LEVEL_OPTIONS = [
  "Some difficulty",
  "A lot of difficulty",
  "Cannot do at all",
] as const;

export const GENDER_VALUES = ["male", "female"] as const;
export const CURRENT_IN_SCHOOL_VALUES = ["no", "primary", "secondary"] as const;
export const IDENTITY_TYPE_OPTIONS = [
  "National ID / NIDA",
  "Voter ID",
  "Passport",
  "Driving License",
  "Other",
] as const;
export const MINOR_DOCUMENT_TYPE_OPTIONS = ["Birth Certificate", "Bima ya afya"] as const;
export const REQUIRE_IDENTITY_SCAN = false;

const ADULT_AGE = 18;

export const HOUSEHOLD_MEMBER_STEPS = [
  {
    id: "personal",
    title: "Personal information",
    fields: ["gender", "firstName", "middleName", "lastName", "relationship", "birthday"],
  },
  {
    id: "identity",
    title: "Identity information",
    fields: ["identityType", "identityNumber", "identityScanUri"],
  },
  {
    id: "education",
    title: "Education",
    fields: ["education", "currentInSchool", "premNumber"],
  },
  {
    id: "disability",
    title: "Disability information",
    fields: ["isDisabled", "disability", "disabilityLevel"],
  },
  {
    id: "review",
    title: "Review",
    fields: ["phoneNumber"],
  },
] as const;

export type HouseholdMemberStep = (typeof HOUSEHOLD_MEMBER_STEPS)[number];

const optionMessage = (label: string) => `${label} is required`;

function hasOption(options: readonly string[], value: unknown) {
  return typeof value === "string" && options.includes(value);
}

function requiredOption(options: readonly string[], label: string) {
  return z
    .string()
    .trim()
    .refine((value) => hasOption(options, value), optionMessage(label));
}

export function formatDateValue(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getDateFromValue(value: string | null | undefined) {
  if (!value) return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;

  const [, yearValue, monthValue, dayValue] = match;
  const year = Number(yearValue);
  const month = Number(monthValue);
  const day = Number(dayValue);
  const date = new Date(year, month - 1, day);

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  return date;
}

export function isAdultFromBirthday(value: string | null | undefined) {
  const birthDate = getDateFromValue(value);
  if (!birthDate) return false;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const birthdayThisYear = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());

  if (today < birthdayThisYear) {
    age -= 1;
  }

  return age >= ADULT_AGE;
}

export function isMinorFromBirthday(value: string | null | undefined) {
  const birthDate = getDateFromValue(value);
  return Boolean(birthDate && !isAdultFromBirthday(value));
}

export function formatDateLabel(value: string | null | undefined) {
  const date = getDateFromValue(value);
  if (!date) return "Select birthday";

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function isValidDateValue(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return false;

  const date = getDateFromValue(value);

  return Boolean(date && date <= new Date());
}

function isReasonablePhoneNumber(value: string) {
  const normalized = value.trim();
  if (!normalized) return true;

  const phone = parsePhoneNumberFromString(normalized, "TZ");
  if (phone?.isValid()) return true;

  return /^\+?[0-9][0-9\s().-]{6,18}[0-9]$/.test(normalized);
}

export const householdMemberFormSchema = z
  .object({
    firstName: z.string().trim().min(1, "First name is required"),
    middleName: z.string().trim().min(1, "Middle name is required"),
    lastName: z.string().trim().min(1, "Last name is required"),
    relationship: requiredOption(RELATIONSHIP_OPTIONS, "Relationship"),
    birthday: z
      .string()
      .trim()
      .min(1, "Birthday is required")
      .refine(isValidDateValue, "Select a valid birthday"),
    gender: requiredOption(GENDER_VALUES, "Gender"),
    education: requiredOption(EDUCATION_OPTIONS, "Education"),
    currentInSchool: requiredOption(CURRENT_IN_SCHOOL_VALUES, "Current in school"),
    premNumber: z.string().trim(),
    isDisabled: z.boolean({ error: "Disability status is required" }),
    disability: z.string().trim(),
    disabilityLevel: z.string().trim(),
    identityType: z.string().trim(),
    identityNumber: z.string().trim(),
    identityScanUri: z.string().nullable(),
    phoneNumber: z
      .string()
      .trim()
      .refine(isReasonablePhoneNumber, "Enter a valid Tanzanian phone number or phone format"),
  })
  .superRefine((data, ctx) => {
    if (data.isDisabled) {
      if (!hasOption(DISABILITY_OPTIONS, data.disability)) {
        ctx.addIssue({
          code: "custom",
          path: ["disability"],
          message: "Disability is required",
        });
      }

      if (!hasOption(DISABILITY_LEVEL_OPTIONS, data.disabilityLevel)) {
        ctx.addIssue({
          code: "custom",
          path: ["disabilityLevel"],
          message: "Disability level is required",
        });
      }
    }

    if (isMinorFromBirthday(data.birthday)) {
      const hasMinorDocumentDetails = Boolean(
        data.identityType.trim() || data.identityNumber.trim() || data.identityScanUri?.trim(),
      );

      if (hasMinorDocumentDetails && !hasOption(MINOR_DOCUMENT_TYPE_OPTIONS, data.identityType)) {
        ctx.addIssue({
          code: "custom",
          path: ["identityType"],
          message: "Document type must be Birth Certificate or Bima ya afya",
        });
      }

      return;
    }

    if (!isAdultFromBirthday(data.birthday)) return;

    if (!hasOption(IDENTITY_TYPE_OPTIONS, data.identityType)) {
      ctx.addIssue({
        code: "custom",
        path: ["identityType"],
        message: "ID type is required for adult members",
      });
    }

    if (!data.identityNumber.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["identityNumber"],
        message: "ID number is required for adult members",
      });
    }

    if (REQUIRE_IDENTITY_SCAN && !data.identityScanUri?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["identityScanUri"],
        message: "ID scan is required for adult members",
      });
    }
  });

export type HouseholdMemberFormValues = z.infer<typeof householdMemberFormSchema>;

export const householdMemberDefaultValues: HouseholdMemberFormValues = {
  firstName: "",
  middleName: "",
  lastName: "",
  relationship: "",
  birthday: "",
  gender: "",
  education: "",
  currentInSchool: "no",
  premNumber: "",
  isDisabled: false,
  disability: "",
  disabilityLevel: "",
  identityType: "",
  identityNumber: "",
  identityScanUri: null,
  phoneNumber: "",
};

export function getHouseholdMemberVisibleSteps(
  values: Pick<HouseholdMemberFormValues, "birthday">,
) {
  if (getDateFromValue(values.birthday)) return HOUSEHOLD_MEMBER_STEPS;

  return HOUSEHOLD_MEMBER_STEPS.filter((step) => step.id !== "identity");
}

export function getHouseholdMemberStepAt(
  values: Pick<HouseholdMemberFormValues, "birthday">,
  stepIndex: number,
) {
  const steps = getHouseholdMemberVisibleSteps(values);
  const lastStepIndex = Math.max(steps.length - 1, 0);

  return steps[Math.min(stepIndex, lastStepIndex)] ?? steps[0];
}

export function getHouseholdMemberStepFields(step: HouseholdMemberStep) {
  return step.fields;
}

export function getHouseholdMemberStepValidationError(
  values: HouseholdMemberFormValues,
  step: HouseholdMemberStep,
) {
  const result = householdMemberFormSchema.safeParse(values);
  if (result.success) return undefined;

  const stepFields = new Set<string>(getHouseholdMemberStepFields(step));
  const fields = result.error.issues.reduce<Record<string, { message: string }[]>>((acc, issue) => {
    const fieldName = issue.path[0];
    if (typeof fieldName !== "string" || !stepFields.has(fieldName)) return acc;

    acc[fieldName] = [...(acc[fieldName] ?? []), { message: issue.message }];
    return acc;
  }, {});

  if (Object.keys(fields).length === 0) return undefined;

  return { fields };
}

export function isHouseholdMemberStepValid(
  values: HouseholdMemberFormValues,
  step: HouseholdMemberStep,
) {
  return !getHouseholdMemberStepValidationError(values, step);
}
