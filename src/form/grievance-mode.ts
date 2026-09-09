export type GrievanceComplaintValues = {
  id: string | null;
  fullname: string | null;
  phone: string;
  email: string | null;
  isBeneficiary: boolean;
  isBulk: boolean;
};

export const CONDITIONAL_COMPLAINT_FIELDS = [
  "complaint.id",
  "complaint.fullname",
  "complaint.phone",
  "complaint.email",
  "complaint.isBeneficiary",
] as const;

export type ConditionalComplaintField = (typeof CONDITIONAL_COMPLAINT_FIELDS)[number];

/**
 * Resetting a field clears both its value and its TanStack Form metadata. This
 * prevents errors from an unmounted individual field from surviving in bulk
 * mode and keeps individual mode deterministic when it is enabled again.
 */
export function resetConditionalComplaintFields(
  resetField: (field: ConditionalComplaintField) => void,
) {
  for (const field of CONDITIONAL_COMPLAINT_FIELDS) {
    resetField(field);
  }
}

export function resetComplaintFieldForBeneficiaryType(
  resetField: (field: ConditionalComplaintField) => void,
  isBeneficiary: boolean,
) {
  resetField(isBeneficiary ? "complaint.fullname" : "complaint.id");
}

export type GrievanceReporterFields = {
  householdId: string | null;
  reporterName: string | null;
  reporterPhone: string | null;
  reporterType: "bulk" | "individual";
};

function optionalText(value: string | null | undefined) {
  const text = value?.trim();
  return text || null;
}

/** Derive persisted reporter data only from fields active in the selected mode. */
export function grievanceReporterFields(
  complaint: GrievanceComplaintValues,
): GrievanceReporterFields {
  if (complaint.isBulk) {
    return {
      householdId: null,
      reporterName: null,
      reporterPhone: null,
      reporterType: "bulk",
    };
  }

  return {
    householdId: complaint.isBeneficiary ? optionalText(complaint.id) : null,
    reporterName: complaint.isBeneficiary ? null : optionalText(complaint.fullname),
    reporterPhone: optionalText(complaint.phone),
    reporterType: "individual",
  };
}
