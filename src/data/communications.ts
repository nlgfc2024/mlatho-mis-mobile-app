/**
 * Published Communications Feed (TASAF Communications Module).
 *
 * Models the records a logged-in staff member or facilitator may see in the
 * mobile app. The feed only ever surfaces records that are:
 *   - `status: "published"`
 *   - `channel: "mobile_app"`
 *   - targeted at the current user's audience type (staff / facilitator / both)
 *   - within the current user's location scope (when location targeting is set)
 *
 * TODO: Replace the in-memory `publications` array with a live source
 * (PowerSync `communicationsCollection` / GraphQL) once it is available. The
 * filtering helpers below are written against the record shape so they can be
 * reused unchanged with synced rows.
 */

export type PublicationStatus = "draft" | "published" | "archived";

export type PublicationChannel = "mobile_app" | "web" | "sms" | "email";

export type TargetAudience = "staff" | "facilitator" | "both";

export type PublicationType =
  | "announcement"
  | "news"
  | "success_story"
  | "activity"
  | "policy"
  | "event"
  | "newsletter";

export type PublicationPriority = "low" | "normal" | "high" | "urgent";

export type AttachmentType = "pdf" | "image" | "video" | "audio" | "doc";

export type Attachment = {
  id: string;
  name: string;
  type: AttachmentType;
  sizeLabel: string;
};

export type RelatedContentType = "communication_activity" | "success_story";

export type RelatedContent = {
  type: RelatedContentType;
  title: string;
  summary: string;
};

export type Publication = {
  id: string;
  title: string;
  summary: string;
  /** Full body shown on the detail screen. */
  content: string;
  type: PublicationType;
  /** ISO datetime string. */
  publishedAt: string;
  priority: PublicationPriority;
  status: PublicationStatus;
  channel: PublicationChannel;
  audience: TargetAudience;
  /** Optional department targeting. `null` = all departments. */
  department: string | null;
  /** Location targeting. `null` at a level = not scoped to that level. */
  regionId: string | null;
  districtId: string | null;
  wardId: string | null;
  villageId: string | null;
  requiresAcknowledgement: boolean;
  attachments: Attachment[];
  relatedContent: RelatedContent | null;
  publishedBy: string;
  reference: string;
};

/** The current user's audience type. */
export type CommunicationUserType = "staff" | "facilitator";

/** Subset of session data needed to scope the feed to the current user. */
export type CommunicationUserContext = {
  userType: CommunicationUserType;
  department: string | null;
  regionId: string | null;
  districtId: string | null;
  wardId: string | null;
  villageId: string | null;
};

/** Normalize a possibly-empty string id into `null`. */
function normalizeId(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Build the feed scope from the logged-in session user. `userType` is not yet
 * carried on the local user record, so it defaults to `"staff"`.
 * TODO: derive `userType`/`department` from the authenticated officer profile.
 */
export function getCurrentUserContext(
  user:
    | {
        regionId?: string | null;
        districtId?: string | null;
        wardId?: string | null;
        villageId?: string | null;
        userType?: CommunicationUserType | null;
        department?: string | null;
      }
    | null
    | undefined,
): CommunicationUserContext {
  return {
    userType: user?.userType ?? "staff",
    department: normalizeId(user?.department),
    regionId: normalizeId(user?.regionId),
    districtId: normalizeId(user?.districtId),
    wardId: normalizeId(user?.wardId),
    villageId: normalizeId(user?.villageId),
  };
}

function audienceMatches(audience: TargetAudience, userType: CommunicationUserType): boolean {
  return audience === "both" || audience === userType;
}

function departmentMatches(
  department: string | null,
  userDepartment: string | null,
): boolean {
  // A publication with no department targeting reaches everyone.
  if (!department) return true;
  return department === userDepartment;
}

function locationMatches(publication: Publication, user: CommunicationUserContext): boolean {
  // Each level that the publication scopes must match the user's location.
  // Levels left `null` on the publication are treated as "all".
  if (publication.regionId && publication.regionId !== user.regionId) return false;
  if (publication.districtId && publication.districtId !== user.districtId) return false;
  if (publication.wardId && publication.wardId !== user.wardId) return false;
  if (publication.villageId && publication.villageId !== user.villageId) return false;
  return true;
}

/**
 * Records visible to the current user, newest first. Applies the published /
 * mobile-app / audience / department / location rules in one place.
 */
export function getVisiblePublications(
  user: CommunicationUserContext,
  source: Publication[] = publications,
): Publication[] {
  return source
    .filter((publication) => publication.status === "published")
    .filter((publication) => publication.channel === "mobile_app")
    .filter((publication) => audienceMatches(publication.audience, user.userType))
    .filter((publication) => departmentMatches(publication.department, user.department))
    .filter((publication) => locationMatches(publication, user))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export function getPublicationById(id: string): Publication | undefined {
  return publications.find((publication) => publication.id === id);
}

export type ReadStatusFilter = "read" | "unread";

export type CommunicationFilters = {
  type: PublicationType | null;
  priority: PublicationPriority | null;
  readStatus: ReadStatusFilter | null;
  requiresAcknowledgement: boolean | null;
};

export const emptyCommunicationFilters: CommunicationFilters = {
  type: null,
  priority: null,
  readStatus: null,
  requiresAcknowledgement: null,
};

export const communicationFilterOptions = {
  type: [
    "announcement",
    "news",
    "success_story",
    "activity",
    "policy",
    "event",
    "newsletter",
  ] as PublicationType[],
  priority: ["urgent", "high", "normal", "low"] as PublicationPriority[],
};

export function countActiveCommunicationFilters(filters: CommunicationFilters): number {
  return Object.values(filters).filter((value) => value !== null).length;
}

/**
 * Apply search + filter chips on top of the already audience-scoped feed.
 * `isRead` is supplied by the caller from the persisted read-state store so the
 * data layer stays free of UI concerns.
 */
export function filterPublications(
  source: Publication[],
  filters: CommunicationFilters,
  query: string,
  isRead: (id: string) => boolean,
): Publication[] {
  const normalizedQuery = query.trim().toLowerCase();

  return source.filter((publication) => {
    if (filters.type && publication.type !== filters.type) return false;
    if (filters.priority && publication.priority !== filters.priority) return false;
    if (
      filters.requiresAcknowledgement !== null &&
      publication.requiresAcknowledgement !== filters.requiresAcknowledgement
    ) {
      return false;
    }
    if (filters.readStatus) {
      const read = isRead(publication.id);
      if (filters.readStatus === "read" && !read) return false;
      if (filters.readStatus === "unread" && read) return false;
    }

    if (normalizedQuery) {
      const haystack = [publication.title, publication.summary, publication.publishedBy]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(normalizedQuery)) return false;
    }

    return true;
  });
}

export const publications: Publication[] = [
  {
    id: "1",
    title: "2026 cash transfer payment schedule released",
    summary:
      "The national payment calendar for the third quarter is now confirmed. Review the cycle dates before mobilising beneficiaries.",
    content:
      "TASAF has confirmed the third-quarter cash transfer schedule for all participating councils. Payments will run from 15 July to 30 August 2026 across two cycles.\n\nField teams should complete beneficiary verification at least five days before each payment window opens and ensure pay points are communicated to community leaders. Any household flagged during verification must be resolved through the grievance module before the cycle closes.\n\nThe detailed council-by-council calendar is attached.",
    type: "announcement",
    publishedAt: "2026-06-28T08:30:00Z",
    priority: "urgent",
    status: "published",
    channel: "mobile_app",
    audience: "both",
    department: null,
    regionId: null,
    districtId: null,
    wardId: null,
    villageId: null,
    requiresAcknowledgement: true,
    attachments: [
      { id: "a1", name: "Q3-2026-payment-calendar.pdf", type: "pdf", sizeLabel: "412 KB" },
    ],
    relatedContent: null,
    publishedBy: "TASAF Head Office — Operations",
    reference: "COMM-2026-0412",
  },
  {
    id: "2",
    title: "Revised facilitator field reporting guidelines",
    summary:
      "Updated guidance on weekly activity reports, including the new offline submission flow for areas with limited connectivity.",
    content:
      "Facilitators are required to adopt the revised weekly reporting format effective 1 July 2026. The update introduces an offline-first submission flow: reports captured without connectivity are queued locally and synced automatically once the device is back online.\n\nPlease read the full guideline document and confirm your acknowledgement so your council coordinator can track adoption.",
    type: "policy",
    publishedAt: "2026-06-25T06:00:00Z",
    priority: "high",
    status: "published",
    channel: "mobile_app",
    audience: "facilitator",
    department: null,
    regionId: null,
    districtId: null,
    wardId: null,
    villageId: null,
    requiresAcknowledgement: true,
    attachments: [
      { id: "a2", name: "facilitator-reporting-v3.pdf", type: "pdf", sizeLabel: "1.1 MB" },
      { id: "a3", name: "reporting-quick-reference.png", type: "image", sizeLabel: "240 KB" },
    ],
    relatedContent: {
      type: "communication_activity",
      title: "Facilitator onboarding refresher",
      summary:
        "A short refresher activity covering the revised reporting steps is scheduled for the second week of July.",
    },
    publishedBy: "Community Engagement Unit",
    reference: "COMM-2026-0408",
  },
  {
    id: "3",
    title: "Success story: savings group transforms Ipagala households",
    summary:
      "A village savings and loan association in Dodoma has helped 38 households launch small businesses in under a year.",
    content:
      "What started as a small savings circle of twelve women in Ipagala has grown into a thriving village savings and loan association supporting 38 households. Members have used pooled savings to start tailoring, poultry, and food-vending businesses.\n\n\"For the first time we can plan beyond the next meal,\" says group chairperson Asha. The group now mentors two neighbouring villages.\n\nShare this story during your next community session to encourage savings group formation.",
    type: "success_story",
    publishedAt: "2026-06-22T09:15:00Z",
    priority: "normal",
    status: "published",
    channel: "mobile_app",
    audience: "both",
    department: null,
    regionId: null,
    districtId: null,
    wardId: null,
    villageId: null,
    requiresAcknowledgement: false,
    attachments: [
      { id: "a4", name: "ipagala-savings-group.jpg", type: "image", sizeLabel: "680 KB" },
    ],
    relatedContent: {
      type: "success_story",
      title: "Ipagala VSLA — full case study",
      summary:
        "Read how the group structured its savings cycles and managed its first round of loans.",
    },
    publishedBy: "TASAF Communications",
    reference: "COMM-2026-0399",
  },
  {
    id: "4",
    title: "Staff data quality drive — household records",
    summary:
      "Action required: clear outstanding household verification flags before the quarterly data freeze on 10 July.",
    content:
      "Ahead of the quarterly data freeze on 10 July 2026, all staff must review and resolve outstanding household verification flags in their assigned councils.\n\nPrioritise duplicate national-ID matches and missing location assignments. Records left unresolved at the freeze will be excluded from the next payment run.",
    type: "activity",
    publishedAt: "2026-06-20T07:45:00Z",
    priority: "high",
    status: "published",
    channel: "mobile_app",
    audience: "staff",
    department: null,
    regionId: null,
    districtId: null,
    wardId: null,
    villageId: null,
    requiresAcknowledgement: false,
    attachments: [],
    relatedContent: {
      type: "communication_activity",
      title: "Quarterly data quality drive",
      summary: "Tracks verification flag resolution across all participating councils.",
    },
    publishedBy: "MIS Department",
    reference: "COMM-2026-0390",
  },
  {
    id: "5",
    title: "Dodoma region: community sensitisation week",
    summary:
      "Region-wide sensitisation meetings on the new grievance channels run from 7 to 11 July. Facilitators to mobilise communities.",
    content:
      "Dodoma region will hold a community sensitisation week from 7 to 11 July 2026, focused on the new grievance reporting channels available through the mobile app.\n\nFacilitators should schedule at least one meeting per ward and record attendance through the community session module. Posters and a talking-points sheet are attached.",
    type: "event",
    publishedAt: "2026-06-18T05:30:00Z",
    priority: "normal",
    status: "published",
    channel: "mobile_app",
    audience: "both",
    department: null,
    // Location-targeted: only visible to users assigned to this region.
    regionId: "dodoma",
    districtId: null,
    wardId: null,
    villageId: null,
    requiresAcknowledgement: false,
    attachments: [
      { id: "a5", name: "sensitisation-poster.pdf", type: "pdf", sizeLabel: "850 KB" },
    ],
    relatedContent: null,
    publishedBy: "Dodoma Regional Coordinator",
    reference: "COMM-2026-0381",
  },
  {
    id: "6",
    title: "June newsletter: programme highlights",
    summary:
      "This month's roundup of programme milestones, field stories, and upcoming activities across all regions.",
    content:
      "Welcome to the June 2026 edition of the TASAF programme newsletter.\n\nInside: third-quarter payment readiness, two new facilitator success stories, a spotlight on the offline reporting rollout, and a calendar of upcoming community activities.\n\nDownload the full newsletter below.",
    type: "newsletter",
    publishedAt: "2026-06-15T10:00:00Z",
    priority: "low",
    status: "published",
    channel: "mobile_app",
    audience: "both",
    department: null,
    regionId: null,
    districtId: null,
    wardId: null,
    villageId: null,
    requiresAcknowledgement: false,
    attachments: [
      { id: "a6", name: "tasaf-newsletter-june-2026.pdf", type: "pdf", sizeLabel: "2.3 MB" },
    ],
    relatedContent: null,
    publishedBy: "TASAF Communications",
    reference: "COMM-2026-0372",
  },
];
