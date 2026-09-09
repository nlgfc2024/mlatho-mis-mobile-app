import {
  Building2,
  GraduationCap,
  MessagesSquare,
  type LucideIcon,
} from "lucide-react-native";

import {
  type CoordinationActivityStatus,
  type CoordinationActivityType,
} from "@/src/data/coordination";

export const activityTypeIcon: Record<CoordinationActivityType, LucideIcon> = {
  communication: MessagesSquare,
  training: GraduationCap,
  departmental: Building2,
};

export const activityTypeLabelKey: Record<CoordinationActivityType, string> = {
  communication: "coordination_type_communication",
  training: "coordination_type_training",
  departmental: "coordination_type_departmental",
};

export const activityTypeColor: Record<CoordinationActivityType, string> = {
  communication: "#2563eb",
  training: "#7c3aed",
  departmental: "#d97706",
};

export const activityTypeSurfaceClass: Record<CoordinationActivityType, string> = {
  communication: "bg-blue-50 dark:bg-blue-950/50",
  training: "bg-violet-50 dark:bg-violet-950/50",
  departmental: "bg-amber-50 dark:bg-amber-950/50",
};

export const activityTypeTextClass: Record<CoordinationActivityType, string> = {
  communication: "text-blue-700 dark:text-blue-200",
  training: "text-violet-700 dark:text-violet-200",
  departmental: "text-amber-700 dark:text-amber-200",
};

export const activityStatusLabelKey: Record<CoordinationActivityStatus, string> = {
  upcoming: "coordination_status_upcoming",
  ongoing: "coordination_status_ongoing",
  completed: "coordination_status_completed",
  cancelled: "coordination_status_cancelled",
  overdue: "coordination_status_overdue",
};

export const activityStatusSurfaceClass: Record<CoordinationActivityStatus, string> = {
  upcoming: "bg-blue-100 dark:bg-blue-950",
  ongoing: "bg-emerald-100 dark:bg-emerald-950",
  completed: "bg-gray-100 dark:bg-gray-800",
  cancelled: "bg-rose-100 dark:bg-rose-950",
  overdue: "bg-orange-100 dark:bg-orange-950",
};

export const activityStatusTextClass: Record<CoordinationActivityStatus, string> = {
  upcoming: "text-blue-800 dark:text-blue-100",
  ongoing: "text-emerald-800 dark:text-emerald-100",
  completed: "text-gray-700 dark:text-gray-200",
  cancelled: "text-rose-800 dark:text-rose-100",
  overdue: "text-orange-800 dark:text-orange-100",
};

export const activityStatusDotColor: Record<CoordinationActivityStatus, string> = {
  upcoming: "#2563eb",
  ongoing: "#059669",
  completed: "#6b7280",
  cancelled: "#e11d48",
  overdue: "#ea580c",
};
