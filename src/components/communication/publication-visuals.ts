import {
  CalendarClock,
  FileAudio,
  FileText,
  Film,
  Image as ImageIcon,
  Megaphone,
  Newspaper,
  Paperclip,
  ScrollText,
  Sparkles,
  Trophy,
  type LucideIcon,
} from "lucide-react-native";

import type {
  AttachmentType,
  PublicationPriority,
  PublicationType,
} from "@/src/data/communications";

export const typeIcon: Record<PublicationType, LucideIcon> = {
  announcement: Megaphone,
  news: Newspaper,
  success_story: Trophy,
  activity: Sparkles,
  policy: ScrollText,
  event: CalendarClock,
  newsletter: FileText,
};

/** i18n keys for each publication type label. */
export const typeLabelKey: Record<PublicationType, string> = {
  announcement: "comm_type_announcement",
  news: "comm_type_news",
  success_story: "comm_type_success_story",
  activity: "comm_type_activity",
  policy: "comm_type_policy",
  event: "comm_type_event",
  newsletter: "comm_type_newsletter",
};

export const priorityLabelKey: Record<PublicationPriority, string> = {
  low: "priority_low",
  normal: "priority_normal",
  high: "priority_high",
  urgent: "priority_urgent",
};

export const priorityBadgeStyles: Record<PublicationPriority, string> = {
  low: "bg-gray-100 dark:bg-gray-800",
  normal: "bg-blue-100 dark:bg-blue-950",
  high: "bg-amber-100 dark:bg-amber-950",
  urgent: "bg-red-100 dark:bg-red-950",
};

export const priorityTextStyles: Record<PublicationPriority, string> = {
  low: "text-gray-700 dark:text-gray-200",
  normal: "text-blue-800 dark:text-blue-100",
  high: "text-amber-800 dark:text-amber-100",
  urgent: "text-red-800 dark:text-red-100",
};

export const attachmentIcon: Record<AttachmentType, LucideIcon> = {
  pdf: FileText,
  image: ImageIcon,
  video: Film,
  audio: FileAudio,
  doc: Paperclip,
};
