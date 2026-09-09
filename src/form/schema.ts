import type { GrievanceComplaintValues } from "./grievance-mode.ts";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import * as z from "zod";

import {
  MAX_GRIEVANCE_DESCRIPTION_WORDS,
  MIN_GRIEVANCE_DESCRIPTION_WORDS,
  grievanceDescriptionWordCount,
} from "../powersync/grievance-sync.ts";

const grievanceDescriptionSchema = z
  .string()
  .trim()
  .min(1, "The description is required.")
  .refine((value) => {
    if (!value) return true;
    const wordCount = grievanceDescriptionWordCount(value);
    return (
      wordCount >= MIN_GRIEVANCE_DESCRIPTION_WORDS && wordCount <= MAX_GRIEVANCE_DESCRIPTION_WORDS
    );
  }, `The description must contain between ${MIN_GRIEVANCE_DESCRIPTION_WORDS} and ${MAX_GRIEVANCE_DESCRIPTION_WORDS} words.`);

const phoneSchema = z.string().transform((value, ctx) => {
  const phone = parsePhoneNumberFromString(value, "TZ");
  if (!phone || !phone.isValid()) {
    ctx.issues.push({
      code: "custom",
      message: "Invalid phone number.",
      input: value,
    });
    return z.NEVER;
  }
  return phone.formatInternational();
});

const bulkComplaintSchema = z.object({
  // These keys remain in the form value shape, but z.any deliberately gives
  // inactive individual fields no validation rules in bulk mode.
  id: z.any(),
  fullname: z.any(),
  phone: z.any(),
  email: z.any(),
  isBeneficiary: z.any(),
  isBulk: z.literal(true),
});

const singleComplaintSchema = z
  .object({
    id: z.string().nullable(),
    fullname: z.string().nullable(),
    phone: phoneSchema,
    email: z.string().nullable(),
    isBeneficiary: z.boolean(),
    isBulk: z.literal(false),
  })
  .superRefine((data, ctx) => {
    if (data.isBeneficiary) {
      if (!data.id || data.id.trim() === "") {
        ctx.addIssue({
          code: "custom",
          message: "The household field is required.",
          path: ["id"],
        });
      }
      return;
    }

    if (!data.fullname || data.fullname.trim() === "") {
      ctx.addIssue({
        code: "custom",
        message: "The complaint name field is required.",
        path: ["fullname"],
      });
    }
  });

export const complaintSchema = z.object({
  complaint: z.discriminatedUnion("isBulk", [singleComplaintSchema, bulkComplaintSchema]),
});

export const detailsSchema = z.object({
  details: z.object({
    priority: z.string(),
    flag: z.string(),
    channel: z.string(),
    description: grievanceDescriptionSchema,
    type: z.string().min(1, "The grievance type field is required."),
    category: z.string().min(1, "The grievance category field is required."),
    dateOfIncident: z.date(),
    paymentWindowYear: z
      .number()
      .int()
      .min(2026, "Year must be after 1900")
      .max(2100, "Year must be before 2100")
      .nullable()
      .optional(),
    paymentWindowPeriod: z.string().optional(),
  }),
});

export const locationSchema = z.object({
  location: z.object({
    region: z.string().trim().min(1, "The region is required."),
    district: z.string().trim().min(1, "The district is required."),
    ward: z.string().trim().min(1, "The ward is required."),
    village: z.string().trim().min(1, "The village is required."),
  }),
});

export const evidenceSchema = z.object({
  evidence: z.object({
    images: z.array(z.any()),
    videos: z.array(z.any()),
    audios: z.array(z.any()),
  }),
});

export const formSchema = z
  .object({
    section: z.enum(["complaint", "details", "evidence", "confirmation"]),
    ...complaintSchema.shape,
    ...detailsSchema.shape,
    ...evidenceSchema.shape,
  })
  .superRefine((data, ctx) => {
    if (data.complaint.isBulk) {
      const evidenceCount =
        data.evidence.images.length + data.evidence.videos.length + data.evidence.audios.length;
      if (evidenceCount === 0) {
        ctx.addIssue({
          code: "custom",
          message: "Evidence is required for bulk grievances.",
          path: ["evidence", "images"],
        });
      }
    }
  });

export type FormValues = {
  section: "complaint" | "details" | "evidence" | "confirmation";
  complaint: GrievanceComplaintValues;
  details: z.infer<typeof detailsSchema>["details"];
  evidence: z.infer<typeof evidenceSchema>["evidence"];
};
