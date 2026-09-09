import { isImisAdministratorRole } from "../features/access-profile/roles.ts";

export type CoordinationActivityType = "communication" | "training" | "departmental";

export type CoordinationActivityStatus =
  | "upcoming"
  | "ongoing"
  | "completed"
  | "cancelled"
  | "overdue";

export type CoordinationCalendarView = "day" | "week" | "month";

export type CoordinationVisibility = {
  roleNames?: string[];
  departments?: string[];
  assignedUserIds?: string[];
  regionId?: string;
  districtId?: string;
  wardId?: string;
  villageId?: string;
};

export type CoordinationActivity = {
  id: string;
  title: string;
  type: CoordinationActivityType;
  category:
    | "meeting"
    | "campaign"
    | "publication"
    | "stakeholder_engagement"
    | "training"
    | "field_activity"
    | "workshop"
    | "internal_activity";
  department: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  location: string;
  status: CoordinationActivityStatus;
  responsiblePerson: string;
  responsibleRole: string;
  description: string;
  participants: string[];
  trainingStage?: "planned" | "approved";
  trainer?: string;
  expectedAttendance?: number;
  actualAttendance?: number;
  materials?: string[];
  reportStatus?: "not_required" | "pending" | "submitted" | "approved";
  sourceHref?: string;
  visibility: CoordinationVisibility;
};

export type CoordinationUserContext = {
  userId: string | null;
  roleName: string | null;
  department: string | null;
  regionId: string | null;
  districtId: string | null;
  wardId: string | null;
  villageId: string | null;
};

export type CoordinationFilters = {
  type: CoordinationActivityType | null;
  department: string | null;
  status: CoordinationActivityStatus | null;
  location: string | null;
  dateFrom: string | null;
  dateTo: string | null;
};

export const emptyCoordinationFilters: CoordinationFilters = {
  type: null,
  department: null,
  status: null,
  location: null,
  dateFrom: null,
  dateTo: null,
};

// TODO: Replace with a PowerSync-backed collection when the Coordination API is available.
// The access and filtering helpers intentionally accept a source array so the UI can move to
// synced rows without changing its permission or calendar logic.
export const coordinationActivities: CoordinationActivity[] = [
  {
    id: "coord-001",
    title: "Regional grievance handling refresher",
    type: "training",
    category: "training",
    department: "Social Safeguards",
    startDate: "2026-08-05",
    endDate: "2026-08-05",
    startTime: "08:30",
    endTime: "16:00",
    location: "Dodoma Training Centre, Hall A",
    status: "ongoing",
    responsiblePerson: "Asha Mwakatobe",
    responsibleRole: "Training Coordinator",
    description:
      "A practical refresher for council grievance officers on intake, escalation, safeguarding, and offline case follow-up.",
    participants: ["Council grievance officers", "Ward focal persons"],
    trainingStage: "approved",
    trainer: "Dr. Neema Lyimo",
    expectedAttendance: 42,
    actualAttendance: 39,
    materials: ["Participant handbook", "Case simulation pack"],
    reportStatus: "pending",
    sourceHref: "/(protected)/(app)/training/1",
    visibility: {},
  },
  {
    id: "coord-002",
    title: "August programme coordination meeting",
    type: "departmental",
    category: "meeting",
    department: "Programme Operations",
    startDate: "2026-08-05",
    endDate: "2026-08-05",
    startTime: "10:00",
    endTime: "12:00",
    location: "TASAF Head Office, Boardroom 2",
    status: "ongoing",
    responsiblePerson: "Joseph Mhando",
    responsibleRole: "Programme Manager",
    description:
      "Monthly cross-department review of delivery milestones, field constraints, decisions, and actions requiring executive support.",
    participants: ["Programme Operations", "Finance", "M&E", "Communications"],
    reportStatus: "not_required",
    visibility: {},
  },
  {
    id: "coord-003",
    title: "Community radio payment-cycle briefing",
    type: "communication",
    category: "stakeholder_engagement",
    department: "Communications",
    startDate: "2026-08-06",
    endDate: "2026-08-06",
    startTime: "09:00",
    endTime: "10:30",
    location: "Dodoma FM Studio",
    status: "upcoming",
    responsiblePerson: "Rehema Kweka",
    responsibleRole: "Communication Officer",
    description:
      "Live briefing for community broadcasters on payment dates, beneficiary verification, and official grievance channels.",
    participants: ["Regional radio presenters", "Payment team", "GRM representative"],
    reportStatus: "pending",
    sourceHref: "/(protected)/(app)/communication/1",
    visibility: {},
  },
  {
    id: "coord-004",
    title: "Morogoro field implementation visit",
    type: "departmental",
    category: "field_activity",
    department: "Programme Operations",
    startDate: "2026-08-07",
    endDate: "2026-08-08",
    startTime: "07:30",
    endTime: "17:00",
    location: "Morogoro Municipal Council",
    status: "upcoming",
    responsiblePerson: "Emmanuel Peter",
    responsibleRole: "Regional Coordinator",
    description:
      "Joint supervision visit covering public works attendance, payment readiness, and household data-update controls.",
    participants: ["Regional coordination team", "Council focal officers"],
    reportStatus: "pending",
    visibility: { regionId: "region-morogoro" },
  },
  {
    id: "coord-005",
    title: "Procurement review workshop",
    type: "departmental",
    category: "workshop",
    department: "Finance and Administration",
    startDate: "2026-08-08",
    endDate: "2026-08-08",
    startTime: "09:00",
    endTime: "15:30",
    location: "TASAF Head Office, Conference Room",
    status: "cancelled",
    responsiblePerson: "Mariam Said",
    responsibleRole: "Procurement Manager",
    description:
      "Review of quarter-one procurement plans and supporting documentation. The session was cancelled pending revised guidance.",
    participants: ["Procurement officers", "Finance managers"],
    reportStatus: "not_required",
    visibility: { departments: ["Finance and Administration"] },
  },
  {
    id: "coord-006",
    title: "Social protection awareness campaign launch",
    type: "communication",
    category: "campaign",
    department: "Communications",
    startDate: "2026-08-10",
    endDate: "2026-08-10",
    startTime: "10:00",
    endTime: "13:00",
    location: "Kikuyu Community Grounds, Dodoma",
    status: "upcoming",
    responsiblePerson: "Rehema Kweka",
    responsibleRole: "Communication Officer",
    description:
      "Public launch of a multi-channel awareness campaign covering eligibility, citizen responsibilities, and safe reporting routes.",
    participants: ["Community leaders", "Media", "Beneficiary representatives"],
    reportStatus: "pending",
    visibility: {},
  },
  {
    id: "coord-007",
    title: "Facilitator financial literacy training",
    type: "training",
    category: "training",
    department: "Livelihoods",
    startDate: "2026-08-11",
    endDate: "2026-08-12",
    startTime: "08:00",
    endTime: "16:30",
    location: "Morogoro Ward Office",
    status: "upcoming",
    responsiblePerson: "John M. Kessy",
    responsibleRole: "Financial Inclusion Specialist",
    description:
      "Training of facilitators on budgeting, savings groups, responsible borrowing, and accessible session delivery.",
    participants: ["Community facilitators", "Livelihood officers"],
    trainingStage: "approved",
    trainer: "John M. Kessy",
    expectedAttendance: 35,
    actualAttendance: 0,
    materials: ["Facilitator guide", "Budget exercise cards"],
    reportStatus: "pending",
    sourceHref: "/(protected)/(app)/training/2",
    visibility: {},
  },
  {
    id: "coord-008",
    title: "Q3 field reporting notice publication",
    type: "communication",
    category: "publication",
    department: "Communications",
    startDate: "2026-08-12",
    endDate: "2026-08-12",
    startTime: "14:00",
    endTime: "14:30",
    location: "Online — Mobile app and web",
    status: "upcoming",
    responsiblePerson: "Halima Juma",
    responsibleRole: "Content Editor",
    description:
      "Scheduled publication of the revised field reporting notice across staff mobile and web channels.",
    participants: ["All staff", "Facilitators"],
    reportStatus: "not_required",
    sourceHref: "/(protected)/(app)/communication/2",
    visibility: {},
  },
  {
    id: "coord-009",
    title: "M&E data-quality clinic",
    type: "training",
    category: "training",
    department: "Monitoring and Evaluation",
    startDate: "2026-08-14",
    endDate: "2026-08-14",
    startTime: "09:00",
    endTime: "15:00",
    location: "TASAF Head Office, ICT Lab",
    status: "upcoming",
    responsiblePerson: "Paul Mrema",
    responsibleRole: "M&E Analyst",
    description:
      "Hands-on clinic for validating indicator submissions, resolving duplicates, and documenting data-quality decisions.",
    participants: ["M&E officers", "Data managers"],
    trainingStage: "planned",
    trainer: "Paul Mrema",
    expectedAttendance: 24,
    actualAttendance: 0,
    materials: ["Data-quality checklist"],
    reportStatus: "pending",
    visibility: { departments: ["Monitoring and Evaluation"] },
  },
  {
    id: "coord-010",
    title: "Executive delivery review",
    type: "departmental",
    category: "internal_activity",
    department: "Executive Office",
    startDate: "2026-08-17",
    endDate: "2026-08-17",
    startTime: "08:30",
    endTime: "11:00",
    location: "TASAF Head Office, Executive Boardroom",
    status: "upcoming",
    responsiblePerson: "Joseph Mhando",
    responsibleRole: "Programme Manager",
    description:
      "Restricted review of national delivery exceptions, risk owners, and management decisions for the next reporting cycle.",
    participants: ["Executive management", "Regional coordinators"],
    reportStatus: "not_required",
    visibility: { roleNames: ["Manager", "Programme Manager", "Executive Director"] },
  },
  {
    id: "coord-011",
    title: "July community engagement review",
    type: "communication",
    category: "meeting",
    department: "Communications",
    startDate: "2026-08-04",
    endDate: "2026-08-04",
    startTime: "11:00",
    endTime: "12:30",
    location: "TASAF Head Office, Meeting Room 4",
    status: "completed",
    responsiblePerson: "Rehema Kweka",
    responsibleRole: "Communication Officer",
    description:
      "Review of stakeholder feedback, media reach, acknowledgements, and campaign actions completed during July.",
    participants: ["Communications team", "Stakeholder engagement focal persons"],
    reportStatus: "submitted",
    visibility: {},
  },
  {
    id: "coord-012",
    title: "Council training-needs assessment submission",
    type: "training",
    category: "training",
    department: "Capacity Building",
    startDate: "2026-08-01",
    endDate: "2026-08-01",
    startTime: "17:00",
    endTime: "17:30",
    location: "Online submission",
    status: "overdue",
    responsiblePerson: "Asha Mwakatobe",
    responsibleRole: "Training Coordinator",
    description:
      "Deadline for council teams to submit consolidated training-needs assessments for the next planning cycle.",
    participants: ["Council training focal persons"],
    trainingStage: "planned",
    trainer: "To be assigned",
    expectedAttendance: 0,
    actualAttendance: 0,
    materials: ["Assessment template"],
    reportStatus: "pending",
    visibility: {},
  },
  {
    id: "coord-013",
    title: "Safeguarding focal-person workshop",
    type: "departmental",
    category: "workshop",
    department: "Social Safeguards",
    startDate: "2026-08-03",
    endDate: "2026-08-03",
    startTime: "08:30",
    endTime: "15:30",
    location: "Dodoma Training Centre, Hall B",
    status: "completed",
    responsiblePerson: "Dr. Neema Lyimo",
    responsibleRole: "Safeguarding Lead",
    description:
      "Workshop on referral pathways, confidential reporting, and survivor-centred response for designated focal persons.",
    participants: ["Safeguarding focal persons", "GRM officers"],
    reportStatus: "approved",
    visibility: {},
  },
  {
    id: "coord-014",
    title: "Assigned council action follow-up",
    type: "departmental",
    category: "internal_activity",
    department: "Programme Operations",
    startDate: "2026-08-19",
    endDate: "2026-08-19",
    startTime: "15:00",
    endTime: "16:00",
    location: "Online — Teams",
    status: "upcoming",
    responsiblePerson: "Current Officer",
    responsibleRole: "Council Coordinator",
    description:
      "Follow-up on a responsibility assigned directly to a council officer after the monthly coordination meeting.",
    participants: ["Assigned officer", "Programme manager"],
    reportStatus: "not_required",
    visibility: { assignedUserIds: ["demo-coordinator"] },
  },
];

function normalize(value: string | null | undefined) {
  return value?.trim().toLocaleLowerCase().replace(/\s+/g, " ") ?? "";
}

function matchesNamedScope(allowed: string[] | undefined, actual: string | null) {
  if (!allowed?.length) return true;
  if (!actual) return false;
  const normalizedActual = normalize(actual);
  return allowed.some((candidate) => normalize(candidate) === normalizedActual);
}

function matchesLocationScope(visibility: CoordinationVisibility, user: CoordinationUserContext) {
  if (visibility.regionId && visibility.regionId !== user.regionId) return false;
  if (visibility.districtId && visibility.districtId !== user.districtId) return false;
  if (visibility.wardId && visibility.wardId !== user.wardId) return false;
  if (visibility.villageId && visibility.villageId !== user.villageId) return false;
  return true;
}

/** Enforces location first, then direct responsibility or the role/department scope. */
export function canViewCoordinationActivity(
  activity: CoordinationActivity,
  user: CoordinationUserContext,
) {
  if (
    isImisAdministratorRole({
      id: "coordination-role",
      uuid: "coordination-role",
      name: user.roleName,
      isSystem: 0,
      isBlocked: false,
    })
  ) {
    return true;
  }

  const visibility = activity.visibility;
  if (!matchesLocationScope(visibility, user)) return false;

  if (user.userId && visibility.assignedUserIds?.includes(user.userId)) return true;
  if (visibility.assignedUserIds?.length) return false;

  return (
    matchesNamedScope(visibility.roleNames, user.roleName) &&
    matchesNamedScope(visibility.departments, user.department)
  );
}

export function getVisibleCoordinationActivities(
  user: CoordinationUserContext,
  source: CoordinationActivity[] = coordinationActivities,
) {
  return source
    .filter((activity) => canViewCoordinationActivity(activity, user))
    .sort((a, b) => `${a.startDate}T${a.startTime}`.localeCompare(`${b.startDate}T${b.startTime}`));
}

export function getCoordinationActivityById(
  id: string,
  source: CoordinationActivity[] = coordinationActivities,
) {
  return source.find((activity) => activity.id === id);
}

export function filterCoordinationActivities(
  source: CoordinationActivity[],
  filters: CoordinationFilters,
) {
  return source.filter((activity) => {
    if (filters.type && activity.type !== filters.type) return false;
    if (filters.department && activity.department !== filters.department) return false;
    if (filters.status && activity.status !== filters.status) return false;
    if (filters.location && activity.location !== filters.location) return false;
    if (filters.dateFrom && activity.endDate < filters.dateFrom) return false;
    if (filters.dateTo && activity.startDate > filters.dateTo) return false;
    return true;
  });
}

export function countActiveCoordinationFilters(filters: CoordinationFilters) {
  return Object.values(filters).filter((value) => value !== null).length;
}

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

export const coordinationFilterOptions = {
  type: ["communication", "training", "departmental"] as CoordinationActivityType[],
  status: [
    "upcoming",
    "ongoing",
    "completed",
    "cancelled",
    "overdue",
  ] as CoordinationActivityStatus[],
  department: uniqueSorted(coordinationActivities.map((activity) => activity.department)),
  location: uniqueSorted(coordinationActivities.map((activity) => activity.location)),
};

export function activityOccursOn(activity: CoordinationActivity, date: string) {
  return activity.startDate <= date && activity.endDate >= date;
}

export function getActivitiesForDate(source: CoordinationActivity[], date: string) {
  return source
    .filter((activity) => activityOccursOn(activity, date))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export function parseCalendarDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function toCalendarDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(value: string, amount: number) {
  const date = parseCalendarDate(value);
  date.setDate(date.getDate() + amount);
  return toCalendarDate(date);
}

export function getWeekDates(anchor: string) {
  const date = parseCalendarDate(anchor);
  const mondayOffset = date.getDay() === 0 ? -6 : 1 - date.getDay();
  const monday = addDays(anchor, mondayOffset);
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
}

export function getMonthGridDates(anchor: string) {
  const anchorDate = parseCalendarDate(anchor);
  const first = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - first.getDay());
  const firstDate = toCalendarDate(gridStart);
  return Array.from({ length: 42 }, (_, index) => addDays(firstDate, index));
}

export function shiftCalendarAnchor(
  anchor: string,
  view: CoordinationCalendarView,
  direction: -1 | 1,
) {
  const date = parseCalendarDate(anchor);
  if (view === "day") date.setDate(date.getDate() + direction);
  if (view === "week") date.setDate(date.getDate() + direction * 7);
  if (view === "month") {
    const targetMonth = date.getMonth() + direction;
    const lastTargetDay = new Date(date.getFullYear(), targetMonth + 1, 0).getDate();
    date.setFullYear(date.getFullYear(), targetMonth, Math.min(date.getDate(), lastTargetDay));
  }
  return toCalendarDate(date);
}
