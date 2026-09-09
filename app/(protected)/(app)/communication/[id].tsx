import { useLocalSearchParams } from "expo-router";
import {
  BadgeCheck,
  CheckCheck,
  Download,
  Hash,
  Link2,
  MapPin,
  ShieldCheck,
  UserRound,
} from "lucide-react-native";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, Text, View } from "react-native";

import {
  attachmentIcon,
  priorityBadgeStyles,
  priorityLabelKey,
  priorityTextStyles,
  typeIcon,
  typeLabelKey,
} from "@/src/components/communication/publication-visuals";
import StyledSafeAreaView from "@/src/components/ui/styled-safe-area-view";
import { getPublicationById, type Publication } from "@/src/data/communications";
import {
  acknowledgeCommunication,
  isPublicationAcknowledged,
  isPublicationRead,
  markCommunicationRead,
  useCommunicationReadState,
} from "@/src/lib/communication-read-state";

function formatDateTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function audienceLabelKey(audience: Publication["audience"]) {
  if (audience === "staff") return "for_staff";
  if (audience === "facilitator") return "for_facilitators";
  return "for_everyone";
}

function targetingLabelKey(publication: Publication) {
  if (publication.villageId) return "targeting_village";
  if (publication.wardId) return "targeting_ward";
  if (publication.districtId) return "targeting_district";
  if (publication.regionId) return "targeting_region";
  return "targeting_national";
}

function MetaRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View className="flex-row items-center gap-3">
      <View className="size-8 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
        {icon}
      </View>
      <View className="flex-1">
        <Text className="text-xs text-gray-500 dark:text-gray-400">{label}</Text>
        <Text className="text-sm font-medium text-gray-950 dark:text-gray-50">{value}</Text>
      </View>
    </View>
  );
}

export default function PublicationDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const publication = id ? getPublicationById(id) : undefined;
  const readState = useCommunicationReadState();

  // Mark the publication read when it is opened. `markCommunicationRead` is
  // idempotent, so this never creates a duplicate read record.
  useEffect(() => {
    const found = id ? getPublicationById(id) : undefined;
    if (found) markCommunicationRead(found.id);
  }, [id]);

  if (!publication) {
    return (
      <StyledSafeAreaView edges={["bottom"]} className="flex-1 bg-white dark:bg-gray-950">
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-sm text-gray-500 dark:text-gray-300">
            {t("publication_not_found")}
          </Text>
        </View>
      </StyledSafeAreaView>
    );
  }

  const TypeIcon = typeIcon[publication.type];
  const acknowledged = isPublicationAcknowledged(readState, publication.id);
  const read = isPublicationRead(readState, publication.id);
  const needsAcknowledgement = publication.requiresAcknowledgement && !acknowledged;

  return (
    <StyledSafeAreaView edges={["bottom"]} className="flex-1 bg-white dark:bg-gray-950">
      <ScrollView contentContainerClassName="gap-6 p-4 pb-8">
        <View className="gap-3">
          <View className="flex-row flex-wrap items-center gap-2">
            <View className="flex-row items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-1 dark:bg-green-950">
              <TypeIcon size={13} color="#0d542b" />
              <Text className="text-xs font-medium text-green-900 dark:text-green-100">
                {t(typeLabelKey[publication.type])}
              </Text>
            </View>
            <View
              className={`rounded-full px-2.5 py-1 ${priorityBadgeStyles[publication.priority]}`}
            >
              <Text className={`text-xs font-medium ${priorityTextStyles[publication.priority]}`}>
                {t(priorityLabelKey[publication.priority])}
              </Text>
            </View>
            {read ? (
              <View className="flex-row items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 dark:bg-gray-800">
                <CheckCheck size={12} color="#6a7282" />
                <Text className="text-xs font-medium text-gray-600 dark:text-gray-300">
                  {t("read")}
                </Text>
              </View>
            ) : null}
          </View>

          <View className="gap-1">
            <Text className="text-xs text-gray-400 dark:text-gray-500">
              {t("published_on", { date: formatDateTime(publication.publishedAt) })}
            </Text>

            <Text className="text-xl font-bold text-gray-950 dark:text-gray-50">
              {publication.title}
            </Text>
          </View>

          <View className="flex-row items-center gap-1.5">
            <UserRound size={14} color="#6a7282" />
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              {publication.publishedBy}
            </Text>
          </View>
        </View>

        <Text className="text-sm font-medium text-gray-700 dark:text-gray-200">
          {publication.summary}
        </Text>

        <View className="border-t border-gray-100 dark:border-gray-800" />

        <Text className="text-base leading-6 text-gray-700 dark:text-gray-300">
          {publication.content}
        </Text>

        {publication.attachments.length > 0 ? (
          <View className="gap-3">
            <Text className="text-base font-semibold text-gray-950 dark:text-gray-50">
              {t("attachments")}
            </Text>
            <View className="gap-2">
              {publication.attachments.map((attachment) => {
                const AttachmentIcon = attachmentIcon[attachment.type];
                return (
                  <Pressable
                    key={attachment.id}
                    className="flex-row items-center gap-3 rounded-2xl bg-gray-50 p-3 dark:bg-gray-900"
                  >
                    <View className="size-9 items-center justify-center rounded-lg bg-white dark:bg-gray-800">
                      <AttachmentIcon size={18} color="#0d542b" />
                    </View>
                    <View className="flex-1">
                      <Text
                        className="text-sm font-medium text-gray-950 dark:text-gray-50"
                        numberOfLines={1}
                      >
                        {attachment.name}
                      </Text>
                      <Text className="text-xs text-gray-500 dark:text-gray-400">
                        {attachment.type.toUpperCase()} · {attachment.sizeLabel}
                      </Text>
                    </View>
                    <View className="pr-2">
                      <Download size={18} color="#6a7282" />
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {publication.relatedContent ? (
          <View className="gap-3">
            <Text className="text-base font-semibold text-gray-950 dark:text-gray-50">
              {publication.relatedContent.type === "success_story"
                ? t("related_success_story")
                : t("related_communication_activity")}
            </Text>
            <View className="flex-row items-start gap-3 rounded-2xl border border-green-100 bg-green-50 p-4 dark:border-green-950 dark:bg-green-950/40">
              <Link2 size={18} color="#0d542b" />
              <View className="flex-1 gap-1">
                <Text className="text-sm font-semibold text-gray-950 dark:text-gray-50">
                  {publication.relatedContent.title}
                </Text>
                <Text className="text-xs leading-5 text-gray-600 dark:text-gray-300">
                  {publication.relatedContent.summary}
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        <View className="gap-4 rounded-2xl bg-gray-50 p-4 dark:bg-gray-900">
          <Text className="text-base font-semibold text-gray-950 dark:text-gray-50">
            {t("publication_details")}
          </Text>
          <MetaRow
            icon={<Hash size={15} color="#6a7282" />}
            label={t("reference")}
            value={publication.reference}
          />
          <MetaRow
            icon={<BadgeCheck size={15} color="#6a7282" />}
            label={t("audience")}
            value={t(audienceLabelKey(publication.audience))}
          />
          <MetaRow
            icon={<MapPin size={15} color="#6a7282" />}
            label={t("targeting")}
            value={t(targetingLabelKey(publication))}
          />
          {publication.department ? (
            <MetaRow
              icon={<ShieldCheck size={15} color="#6a7282" />}
              label={t("department")}
              value={publication.department}
            />
          ) : null}
        </View>

        {publication.requiresAcknowledgement && acknowledged ? (
          <View className="flex-row items-center gap-2 rounded-2xl bg-green-100 p-4 dark:bg-green-950">
            <CheckCheck size={18} color="#15803d" />
            <Text className="flex-1 text-sm font-medium text-green-900 dark:text-green-100">
              {t("acknowledgement_recorded")}
            </Text>
          </View>
        ) : null}
      </ScrollView>

      {needsAcknowledgement ? (
        <View className="gap-2 border-t border-gray-200 p-4 dark:border-gray-800">
          <Text className="text-xs text-gray-500 dark:text-gray-400">
            {t("acknowledgement_prompt")}
          </Text>
          <Pressable
            onPress={() => acknowledgeCommunication(publication.id)}
            className="flex-row items-center justify-center gap-2 rounded-full bg-green-900 py-3.5"
          >
            <ShieldCheck size={18} color="#ffffff" />
            <Text className="text-sm font-semibold text-white">
              {t("acknowledge_read_understood")}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </StyledSafeAreaView>
  );
}
