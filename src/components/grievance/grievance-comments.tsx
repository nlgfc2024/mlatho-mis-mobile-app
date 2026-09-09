import type { GrievanceTicketComment } from "@/src/powersync/grievance-api";
import { useQuery } from "@tanstack/react-query";
import { MessageSquareText } from "lucide-react-native";
import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Pressable, Text, useColorScheme, View } from "react-native";

import { getGrievanceTicket } from "@/src/powersync/grievance-api";
import {
  buildGrievanceBackendUpdate,
  parseGrievanceComments,
} from "@/src/powersync/grievance-sync";
import { applyGrievanceBackendUpdate } from "@/src/powersync/sync-pending-grievances";

function commenterName(value: unknown, fallback: string): string {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return fallback;

    try {
      return commenterName(JSON.parse(trimmed), trimmed);
    } catch {
      return trimmed;
    }
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;

  const commenter = value as Record<string, unknown>;
  const username = commenter.username ?? commenter.loginName ?? commenter.login_name;
  if (typeof username === "string" && username.trim()) return username.trim();

  const fullName = [
    commenter.firstName ?? commenter.first_name ?? commenter.otherNames ?? commenter.other_names,
    commenter.lastName ?? commenter.last_name,
  ]
    .filter((name): name is string => typeof name === "string" && name.trim().length > 0)
    .map((name) => name.trim())
    .join(" ");

  if (fullName) return fullName;

  const label = commenter.name;
  return typeof label === "string" && label.trim() ? label.trim() : fallback;
}

// Undated comments sort last (latest first overall).
function commentTimestamp(comment: { dateCreated?: string | null }) {
  if (!comment.dateCreated) return Number.NEGATIVE_INFINITY;

  const time = new Date(comment.dateCreated).getTime();
  return Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time;
}

function formatCommentDate(value: string | null | undefined, locale: string) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleString(locale, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  });
}

function commentAuthorName(comment: GrievanceTicketComment, fallback: string): string {
  const parsed = commenterName(comment.commenter, "");
  if (parsed) return parsed;

  const fullName = [comment.commenterFirstName, comment.commenterLastName]
    .filter((name): name is string => typeof name === "string" && name.trim().length > 0)
    .map((name) => name.trim())
    .join(" ");
  if (fullName) return fullName;

  const typeName = comment.commenterTypeName?.trim();
  return typeName || fallback;
}

function commenterInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function CommentItem({ comment }: { comment: GrievanceTicketComment }) {
  const { t, i18n } = useTranslation();
  const dateLabel = formatCommentDate(comment.dateCreated, i18n.resolvedLanguage ?? i18n.language);
  const name = commentAuthorName(comment, t("unknown"));

  return (
    <View className="flex-row gap-3">
      <View className="size-9 flex-none items-center justify-center rounded-full bg-green-100 dark:bg-green-950">
        <Text className="text-xs font-semibold text-green-800 dark:text-green-300">
          {commenterInitials(name)}
        </Text>
      </View>
      <View className="flex-1 gap-1">
        <View className="flex-row items-start justify-between gap-3">
          <Text selectable className="flex-1 text-sm font-semibold text-gray-950 dark:text-gray-50">
            {name}
          </Text>
          {dateLabel && (
            <Text selectable className="text-xs text-gray-500 dark:text-gray-400">
              {dateLabel}
            </Text>
          )}
        </View>
        <Text selectable className="text-sm leading-5 text-gray-700 dark:text-gray-300">
          {comment.comment}
        </Text>
      </View>
    </View>
  );
}

export default function GrievanceComments({
  ticketId,
  grievanceId,
  cachedComments,
}: {
  ticketId?: string | null;
  grievanceId: string;
  cachedComments?: unknown;
}) {
  const { t } = useTranslation();
  const isDark = useColorScheme() === "dark";
  const ticketQuery = useQuery({
    queryKey: ["GetTickets", ticketId],
    queryFn: () => getGrievanceTicket(ticketId!),
    enabled: Boolean(ticketId),
    staleTime: 30_000,
  });

  useEffect(() => {
    const ticket = ticketQuery.data;
    if (!ticket) return;

    void applyGrievanceBackendUpdate(
      grievanceId,
      buildGrievanceBackendUpdate({
        id: ticket.id,
        clientMutationId: ticket.clientMutationId,
        status: ticket.status,
        resolution: ticket.resolution,
        dateUpdated: ticket.dateUpdated,
        comments: (ticket.commentSet?.edges ?? []).map((edge) => {
          const comment = edge.node;
          if (!comment) return null;

          return {
            id: comment.id,
            comment: comment.comment,
            isResolution: Boolean(comment.isResolution),
            commenter:
              typeof comment.commenter === "string"
                ? comment.commenter
                : comment.commenter != null
                  ? JSON.stringify(comment.commenter)
                  : null,
            commenterTypeName: comment.commenterTypeName,
            commenterFirstName: comment.commenterFirstName,
            commenterLastName: comment.commenterLastName,
            dateCreated: comment.dateCreated,
            dateUpdated: comment.dateUpdated,
          };
        }),
      }),
    ).catch((error) => {
      console.error("[Grievance Sync] Failed to cache ticket updates:", error);
    });
  }, [grievanceId, ticketQuery.data]);

  const comments = useMemo(() => {
    const remoteComments = ticketQuery.data?.commentSet?.edges
      ?.map((edge) => edge.node)
      .filter((comment): comment is GrievanceTicketComment => Boolean(comment));
    const cached = parseGrievanceComments(cachedComments).map((comment) => ({
      id: comment.id,
      comment: comment.comment,
      commenter: comment.commenter ?? {
        firstName: comment.commenterFirstName,
        lastName: comment.commenterLastName,
        name: comment.commenterTypeName,
      },
      commenterFirstName: comment.commenterFirstName,
      commenterLastName: comment.commenterLastName,
      commenterTypeName: comment.commenterTypeName,
      dateCreated: comment.dateUpdated ?? comment.dateCreated,
    }));

    return (remoteComments ?? cached)
      .slice()
      .sort((a, b) => commentTimestamp(b) - commentTimestamp(a));
  }, [cachedComments, ticketQuery.data]);

  if (!ticketId && comments.length === 0) return null;

  return (
    <View className="mt-6 gap-3">
      <View className="flex-row items-center gap-1.5">
        <MessageSquareText size={16} strokeWidth={2.25} color={isDark ? "#9ca3af" : "#6a7282"} />
        <Text className="text-sm font-semibold text-gray-950 dark:text-gray-50">
          {t("comments")} ({comments.length})
        </Text>
      </View>

      {ticketQuery.isPending && comments.length === 0 ? (
        <View className="items-center py-4">
          <ActivityIndicator colorClassName="accent-green-700 dark:accent-green-400" />
          <Text className="pt-2 text-sm text-gray-500 dark:text-gray-400">
            {t("loading_comments")}
          </Text>
        </View>
      ) : ticketQuery.isError && comments.length === 0 ? (
        <View className="items-start rounded-2xl bg-red-50 px-4 py-3 dark:bg-red-950/40">
          <Text selectable className="text-sm text-red-700 dark:text-red-300">
            {t("comments_unavailable")}
          </Text>
          <Pressable
            accessibilityLabel={t("retry")}
            accessibilityRole="button"
            onPress={() => ticketQuery.refetch()}
            className="mt-2 rounded-lg px-1 py-1 active:opacity-60"
          >
            <Text className="text-sm font-semibold text-red-700 dark:text-red-300">
              {t("retry")}
            </Text>
          </Pressable>
        </View>
      ) : comments.length === 0 ? (
        <Text className="py-2 text-sm text-gray-500 dark:text-gray-400">{t("no_comments")}</Text>
      ) : (
        <View className="gap-3">
          {comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} />
          ))}
        </View>
      )}
    </View>
  );
}
