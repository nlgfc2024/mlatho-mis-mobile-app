import type { Publication } from "@/src/data/communications";
import { Link } from "expo-router";
import { CheckCheck, Paperclip } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";

import { useRowSeparatorStyle } from "@/src/components/ui/list-separator";

import {
  priorityBadgeStyles,
  priorityLabelKey,
  priorityTextStyles,
  typeIcon,
  typeLabelKey,
} from "./publication-visuals";

function formatDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function PublicationListItem({
  publication,
  isRead,
  isAcknowledged,
  isLast = false,
}: {
  publication: Publication;
  isRead: boolean;
  isAcknowledged: boolean;
  isLast?: boolean;
}) {
  const { t } = useTranslation();
  const rowSeparatorStyle = useRowSeparatorStyle("bottom");
  const TypeIcon = typeIcon[publication.type];
  const hasAttachments = publication.attachments.length > 0;

  return (
    <Link href={`/(protected)/(app)/communication/${publication.id}`} asChild push>
      <Pressable
        style={isLast ? undefined : rowSeparatorStyle}
        className="flex-row items-start gap-3 px-4 py-3.5 focus:bg-pressed active:bg-pressed"
      >
        <View className="mt-0.5 size-9 items-center justify-center rounded-lg bg-green-100 dark:bg-green-950">
          <TypeIcon size={17} color="#0d542b" />
        </View>

        <View className="flex-1 gap-1">
          <View className="flex-row items-center gap-2">
            <Text className="text-xs font-medium text-green-900 dark:text-green-100">
              {t(typeLabelKey[publication.type])}
            </Text>
            <Text className="text-xs text-gray-400 dark:text-gray-500">·</Text>
            <Text className="text-xs text-gray-500 dark:text-gray-400">
              {formatDate(publication.publishedAt)}
            </Text>
          </View>

          <Text
            className={`text-base ${isRead ? "font-medium text-gray-700 dark:text-gray-300" : "font-semibold text-gray-950 dark:text-gray-50"}`}
            numberOfLines={2}
          >
            {publication.title}
          </Text>

          <Text className="text-sm text-gray-500 dark:text-gray-400" numberOfLines={2}>
            {publication.summary}
          </Text>

          <View className="mt-3 flex-row flex-wrap items-center gap-2">
            <View
              className={`rounded-full px-2 py-0.5 ${priorityBadgeStyles[publication.priority]}`}
            >
              <Text
                className={`text-[11px] font-medium ${priorityTextStyles[publication.priority]}`}
              >
                {t(priorityLabelKey[publication.priority])}
              </Text>
            </View>

            {publication.requiresAcknowledgement ? (
              <View
                className={`flex-row items-center gap-1 rounded-full px-2 py-0.5 ${isAcknowledged ? "bg-green-100 dark:bg-green-950" : "bg-orange-100 dark:bg-orange-950"}`}
              >
                {isAcknowledged ? <CheckCheck size={11} color="#15803d" /> : null}
                <Text
                  className={`text-[11px] font-medium ${isAcknowledged ? "text-green-800 dark:text-green-100" : "text-orange-800 dark:text-orange-100"}`}
                >
                  {isAcknowledged ? t("acknowledged") : t("acknowledgement_required")}
                </Text>
              </View>
            ) : null}

            {hasAttachments ? (
              <View className="flex-row items-center gap-1">
                <Paperclip size={12} color="#6a7282" />
                <Text className="text-[11px] text-gray-500 dark:text-gray-400">
                  {publication.attachments.length}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {!isRead ? <View className="mt-1.5 size-2.5 rounded-full bg-green-700" /> : null}
      </Pressable>
    </Link>
  );
}
