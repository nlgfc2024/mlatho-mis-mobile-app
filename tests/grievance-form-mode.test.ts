// @ts-nocheck
import assert from "node:assert/strict";
import test from "node:test";

import {
  CONDITIONAL_COMPLAINT_FIELDS,
  grievanceReporterFields,
  resetConditionalComplaintFields,
} from "../src/form/grievance-mode.ts";
import { complaintSchema, detailsSchema } from "../src/form/schema.ts";

const words = (count: number) =>
  Array.from({ length: count }, (_, index) => `word${index}`).join(" ");

const grievanceDetails = (description: string) => ({
  details: {
    priority: "Low",
    flag: "Investigation",
    channel: "Mobile app",
    description,
    type: "Payment delay",
    category: "Payments",
    dateOfIncident: new Date("2026-08-05T00:00:00.000Z"),
  },
});

test("grievance description validation accepts 45 to 150 words inclusively", () => {
  assert.equal(detailsSchema.safeParse(grievanceDetails(words(44))).success, false);
  assert.equal(detailsSchema.safeParse(grievanceDetails(words(45))).success, true);
  assert.equal(detailsSchema.safeParse(grievanceDetails(words(100))).success, true);
  assert.equal(detailsSchema.safeParse(grievanceDetails(words(150))).success, true);

  const overLimit = detailsSchema.safeParse(grievanceDetails(words(151)));
  assert.equal(overLimit.success, false);
  if (overLimit.success) return;

  assert.ok(
    overLimit.error.issues.some(
      (issue) =>
        issue.path.join(".") === "details.description" &&
        issue.message === "The description must contain between 45 and 150 words.",
    ),
  );
});

test("bulk complaint validation excludes inactive individual fields", () => {
  const result = complaintSchema.safeParse({
    complaint: {
      isBulk: true,
      id: 123,
      fullname: { invalid: true },
      phone: "not-a-phone-number",
      email: false,
      isBeneficiary: "invalid",
    },
  });

  assert.equal(result.success, true);
});

test("individual complaint validation is restored after switching back", () => {
  const bulkResult = complaintSchema.safeParse({ complaint: { isBulk: true } });
  const individualResult = complaintSchema.safeParse({
    complaint: {
      isBulk: false,
      id: "",
      fullname: "",
      phone: "+255 712 345 678",
      email: null,
      isBeneficiary: true,
    },
  });

  assert.equal(bulkResult.success, true);
  assert.equal(individualResult.success, false);
  if (individualResult.success) return;

  const paths = individualResult.error.issues.map((issue) => issue.path.join("."));
  assert.ok(paths.includes("complaint.id"));

  const invalidPhoneResult = complaintSchema.safeParse({
    complaint: {
      isBulk: false,
      id: "household-id",
      fullname: "",
      phone: "invalid",
      email: null,
      isBeneficiary: true,
    },
  });
  assert.equal(invalidPhoneResult.success, false);
  if (invalidPhoneResult.success) return;
  assert.ok(
    invalidPhoneResult.error.issues.some((issue) => issue.path.join(".") === "complaint.phone"),
  );
});

test("mode cleanup resets every conditional value and its field metadata", () => {
  const resetFields: string[] = [];

  resetConditionalComplaintFields((field) => {
    resetFields.push(field);
  });
  resetConditionalComplaintFields((field) => {
    resetFields.push(field);
  });

  assert.deepEqual(resetFields, [...CONDITIONAL_COMPLAINT_FIELDS, ...CONDITIONAL_COMPLAINT_FIELDS]);
});

test("bulk reporter payload excludes stale individual complainant values", () => {
  assert.deepEqual(
    grievanceReporterFields({
      isBulk: true,
      isBeneficiary: false,
      id: "stale-household",
      fullname: "Stale Person",
      phone: "not-a-phone-number",
      email: "stale@example.com",
    }),
    {
      householdId: null,
      reporterName: null,
      reporterPhone: null,
      reporterType: "bulk",
    },
  );
});

test("individual reporter payload includes only the active complainant type", () => {
  assert.deepEqual(
    grievanceReporterFields({
      isBulk: false,
      isBeneficiary: true,
      id: "household-id",
      fullname: "stale manual name",
      phone: "+255 712 345 678",
      email: null,
    }),
    {
      householdId: "household-id",
      reporterName: null,
      reporterPhone: "+255 712 345 678",
      reporterType: "individual",
    },
  );

  assert.deepEqual(
    grievanceReporterFields({
      isBulk: false,
      isBeneficiary: false,
      id: "stale-household-id",
      fullname: "Jane Doe",
      phone: "+255 712 345 678",
      email: null,
    }),
    {
      householdId: null,
      reporterName: "Jane Doe",
      reporterPhone: "+255 712 345 678",
      reporterType: "individual",
    },
  );
});
