import { type Href } from "expo-router";
import {
  Banknote,
  ClipboardCheck,
  GraduationCap,
  Headset,
  LineChart,
  MapPinned,
  MessageSquarePlus,
  MessagesSquare,
  type LucideIcon,
} from "lucide-react-native";

import { isImisAdministratorRole } from "@/src/features/access-profile/roles";
import { type AccessRole } from "@/src/features/access-profile/types";

import { dashboardRoleNamesMatch, getTemporaryDashboardForRole } from "./dashboard-role-mapping";
import { type ModuleTileId } from "./module-tiles";

/**
 * Role-based dashboards. Each "group" is a tailored dashboard surfaced to a set
 * of staff roles (see the TASAF role → dashboard mapping). For demonstration
 * the active group is chosen manually through the dashboard switcher rather than
 * derived from the signed-in user's role.
 */
export type DashboardGroupId =
  | "field_operations"
  | "grm"
  | "programme_operations"
  | "training"
  | "communication_feed"
  | "payment_monitoring"
  | "executive_me";

export type DashboardStat = {
  id: string;
  labelKey: string;
  value: string;
};

/** Primary call-to-action button surfaced at the top of a dashboard. */
export type DashboardAction = {
  id: string;
  labelKey: string;
  icon: LucideIcon;
  href: Href;
  permissionModules: string[];
};

const NEW_GRIEVANCE_ACTION: DashboardAction = {
  id: "new_grievance",
  labelKey: "add_grievance",
  icon: MessageSquarePlus,
  href: "/(protected)/(app)/grievance/create",
  permissionModules: ["ticket"],
};

const TAKE_ATTENDANCE_ACTION: DashboardAction = {
  id: "take_attendance",
  labelKey: "take_attendance",
  icon: ClipboardCheck,
  href: "/(protected)/(app)/pwp/create",
  permissionModules: ["pwp", "public_works"],
};

export type DashboardGroup = {
  id: DashboardGroupId;
  icon: LucideIcon;
  /** Short label for the switcher pill. */
  shortTitleKey: string;
  titleKey: string;
  subtitleKey: string;
  /** Roles that see this dashboard, shown as chips. */
  roles: string[];
  /** Mock summary tiles specific to this dashboard. */
  stats: DashboardStat[];
  /** Module tiles surfaced for this dashboard, in order. */
  tileIds: ModuleTileId[];
  /** Primary CTA buttons shown above the quick-actions grid. */
  actions?: DashboardAction[];
  /** Executive / M&E style dashboards are read-only summaries. */
  readOnly?: boolean;
};

export const DASHBOARD_GROUPS: DashboardGroup[] = [
  {
    id: "field_operations",
    icon: MapPinned,
    shortTitleKey: "dashboard_field_operations_short",
    titleKey: "dashboard_field_operations",
    subtitleKey: "dashboard_field_operations_subtitle",
    roles: [
      "Village Executive Officer",
      "Ward Executive Officer",
      "Council Coordinator",
      "Assistant Monitoring Officer",
    ],
    stats: [
      { id: "households", labelKey: "households", value: "642" },
      { id: "beneficiaries", labelKey: "beneficiaries", value: "1,248" },
      { id: "pending_field_tasks", labelKey: "pending_field_tasks", value: "17" },
      { id: "verification_tasks", labelKey: "verification_tasks", value: "9" },
      { id: "grievances", labelKey: "grievances", value: "5" },
      { id: "pending_sync", labelKey: "pending_sync", value: "12" },
    ],
    tileIds: [
      "grievance",
      "payments",
      "data_update",
      "training",
      "pwp",
      "communication",
      "coordination",
      "community_session",
    ],
    actions: [NEW_GRIEVANCE_ACTION, TAKE_ATTENDANCE_ACTION],
  },
  {
    id: "grm",
    icon: Headset,
    shortTitleKey: "dashboard_grm_short",
    titleKey: "dashboard_grm",
    subtitleKey: "dashboard_grm_subtitle",
    roles: [
      "Grievance Officer",
      "Grievance Redress Officer",
      "Council Coordinator",
      "Ward Executive Officer",
      "Village Executive Officer",
    ],
    stats: [
      { id: "new_grievances", labelKey: "new_grievances", value: "8" },
      { id: "assigned_grievances", labelKey: "assigned_grievances", value: "14" },
      { id: "overdue_grievances", labelKey: "overdue_grievances", value: "3" },
      { id: "resolved_grievances", labelKey: "resolved_grievances", value: "41" },
    ],
    tileIds: ["grievance", "training", "communication", "coordination"],
    actions: [NEW_GRIEVANCE_ACTION],
  },
  {
    id: "programme_operations",
    icon: ClipboardCheck,
    shortTitleKey: "dashboard_programme_operations_short",
    titleKey: "dashboard_programme_operations",
    subtitleKey: "dashboard_programme_operations_subtitle",
    roles: ["Programme Delivery Officer", "Programme Manager", "Director of Programs"],
    stats: [
      { id: "enrolment_batches", labelKey: "enrolment_batches", value: "6" },
      { id: "pending_checks", labelKey: "pending_checks", value: "11" },
      { id: "pending_reviews", labelKey: "pending_reviews", value: "7" },
      { id: "approval_queue", labelKey: "approval_queue", value: "4" },
      { id: "training_summaries", labelKey: "training_summaries", value: "8" },
    ],
    tileIds: [
      "pwp",
      "training",
      "targeting",
      "data_update",
      "quick_information",
      "communication",
      "coordination",
    ],
    actions: [TAKE_ATTENDANCE_ACTION],
  },
  {
    id: "training",
    icon: GraduationCap,
    shortTitleKey: "dashboard_training_short",
    titleKey: "dashboard_training",
    subtitleKey: "dashboard_training_subtitle",
    roles: [
      "Programme Delivery Officer",
      "Programme Manager",
      "Assistant Monitoring Officer",
      "Director of Programs",
    ],
    stats: [
      { id: "planned_trainings", labelKey: "planned_trainings", value: "5" },
      { id: "ongoing_trainings", labelKey: "ongoing_trainings", value: "2" },
      { id: "completed_trainings", labelKey: "completed_trainings", value: "18" },
      { id: "attendance_rate", labelKey: "attendance_rate", value: "92%" },
      { id: "pending_reports", labelKey: "pending_reports", value: "3" },
      { id: "overdue_reports", labelKey: "overdue_reports", value: "1" },
    ],
    tileIds: [
      "training",
      "community_session",
      "quick_information",
      "communication",
      "coordination",
    ],
    actions: [TAKE_ATTENDANCE_ACTION],
  },
  {
    id: "communication_feed",
    icon: MessagesSquare,
    shortTitleKey: "dashboard_communication_feed_short",
    titleKey: "dashboard_communication_feed",
    subtitleKey: "dashboard_communication_feed_subtitle",
    roles: [
      "Staff",
      "Facilitators",
      "Communication Officer",
      "Communication Manager",
      "Coordination Officer (maker)",
      "Executive roles",
    ],
    stats: [
      { id: "unread_messages", labelKey: "unread_messages", value: "4" },
      { id: "priority_notices", labelKey: "priority_notices", value: "2" },
      { id: "acknowledgements_required", labelKey: "acknowledgements_required", value: "3" },
      { id: "published_communications", labelKey: "published_communications", value: "27" },
    ],
    tileIds: ["communication", "coordination", "quick_information", "training"],
  },
  {
    id: "payment_monitoring",
    icon: Banknote,
    shortTitleKey: "dashboard_payment_monitoring_short",
    titleKey: "dashboard_payment_monitoring",
    subtitleKey: "dashboard_payment_monitoring_subtitle",
    roles: [
      "Accountant",
      "Payment Officer",
      "Finance Manager",
      "Director of Finance & Administration",
      "Council Coordinator",
    ],
    stats: [
      { id: "active_cycles", labelKey: "active_cycles", value: "1" },
      { id: "disbursed", labelKey: "disbursed", value: "89%" },
      { id: "reconciliation_pending", labelKey: "reconciliation_pending", value: "6" },
      { id: "council_confirmations", labelKey: "council_confirmations", value: "4" },
      { id: "payment_alerts", labelKey: "payment_alerts", value: "2" },
    ],
    tileIds: ["payments", "quick_information", "training", "communication", "coordination"],
  },
  {
    id: "executive_me",
    icon: LineChart,
    shortTitleKey: "dashboard_executive_me_short",
    titleKey: "dashboard_executive_me",
    subtitleKey: "dashboard_executive_me_subtitle",
    roles: [
      "Executive Director",
      "National Steering Committee",
      "Internal Audit",
      "M&E Analyst",
      "Regional Coordinator",
    ],
    stats: [
      { id: "programme_coverage", labelKey: "programme_coverage", value: "94%" },
      { id: "active_regions", labelKey: "active_regions", value: "26" },
      { id: "open_escalations", labelKey: "open_escalations", value: "5" },
      { id: "exceptions", labelKey: "exceptions", value: "8" },
      { id: "reports", labelKey: "reports", value: "12" },
    ],
    tileIds: [
      "quick_information",
      "payments",
      "grievance",
      "training",
      "communication",
      "coordination",
    ],
    readOnly: true,
  },
];

export const DASHBOARD_GROUP_IDS: DashboardGroupId[] = DASHBOARD_GROUPS.map((group) => group.id);

export const DASHBOARD_GROUP_BY_ID: Record<DashboardGroupId, DashboardGroup> = Object.fromEntries(
  DASHBOARD_GROUPS.map((group) => [group.id, group]),
) as Record<DashboardGroupId, DashboardGroup>;

export const DEFAULT_DASHBOARD_GROUP_ID: DashboardGroupId = DASHBOARD_GROUPS[0].id;

export function getDashboardGroupsForRole(
  roleName: string | null | undefined,
  systemRoleFlag?: number | null,
) {
  const role = {
    id: "dashboard-role",
    uuid: "dashboard-role",
    name: roleName,
    isSystem: systemRoleFlag ?? 0,
    isBlocked: false,
  } satisfies AccessRole;
  if (isImisAdministratorRole(role)) return DASHBOARD_GROUPS;

  if (!roleName?.trim() && !systemRoleFlag) return [];
  const temporaryDashboardId = getTemporaryDashboardForRole(roleName, systemRoleFlag);
  if (temporaryDashboardId) {
    return DASHBOARD_GROUPS.filter((group) => group.id === temporaryDashboardId);
  }

  if (!roleName?.trim()) return [];
  return DASHBOARD_GROUPS.filter((group) =>
    group.roles.some((role) => dashboardRoleNamesMatch(role, roleName)),
  );
}
