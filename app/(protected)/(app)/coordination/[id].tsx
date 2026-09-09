import { Link, type Href, useLocalSearchParams } from "expo-router";
import {
  CalendarDays,
  Clock3,
  FileCheck2,
  MapPin,
  PackageOpen,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react-native";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, Text, View } from "react-native";

import {
  activityStatusLabelKey,
  activityStatusSurfaceClass,
  activityStatusTextClass,
  activityTypeColor,
  activityTypeIcon,
  activityTypeLabelKey,
  activityTypeSurfaceClass,
  activityTypeTextClass,
} from "@/src/components/coordination/coordination-visuals";
import StyledSafeAreaView from "@/src/components/ui/styled-safe-area-view";
import {
  canViewCoordinationActivity,
  getCoordinationActivityById,
  parseCalendarDate,
  type CoordinationUserContext,
} from "@/src/data/coordination";
import { useSession } from "@/src/providers/session-context";

function optionalString(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  return String(value);
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-row items-start gap-3">
      <View className="size-9 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">
        {icon}
      </View>
      <View className="flex-1 gap-0.5">
        <Text selectable className="text-xs text-gray-500 dark:text-gray-400">
          {label}
        </Text>
        <Text selectable className="text-sm font-medium text-gray-950 dark:text-gray-50">
          {value}
        </Text>
      </View>
    </View>
  );
}

export default function CoordinationDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { activeRole, user } = useSession();
  const activity = getCoordinationActivityById(id);
  const sessionUser = user as
    | (typeof user & {
        department?: string | null;
        regionId?: string | number | null;
        districtId?: string | number | null;
        wardId?: string | number | null;
        villageId?: string | number | null;
      })
    | null;
  const context: CoordinationUserContext = useMemo(
    () => ({
      userId: optionalString(sessionUser?.id),
      roleName: activeRole?.name ?? null,
      department: sessionUser?.department ?? null,
      regionId: optionalString(sessionUser?.regionId),
      districtId: optionalString(sessionUser?.districtId),
      wardId: optionalString(sessionUser?.wardId),
      villageId: optionalString(sessionUser?.villageId),
    }),
    [activeRole?.name, sessionUser],
  );

  if (!activity || !canViewCoordinationActivity(activity, context)) {
    return (
      <StyledSafeAreaView edges={["bottom"]} className="flex-1 bg-white dark:bg-gray-950">
        <View className="flex-1 items-center justify-center gap-3 p-6">
          <ShieldCheck size={28} color="#6a7282" />
          <Text selectable className="text-center text-sm text-gray-500 dark:text-gray-300">
            {t("coordination_activity_unavailable")}
          </Text>
        </View>
      </StyledSafeAreaView>
    );
  }

  const TypeIcon = activityTypeIcon[activity.type];
  const startDate = parseCalendarDate(activity.startDate);
  const endDate = parseCalendarDate(activity.endDate);
  const dateLabel =
    activity.startDate === activity.endDate
      ? startDate.toLocaleDateString(undefined, {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : `${startDate.toLocaleDateString(undefined, { day: "numeric", month: "long" })} – ${endDate.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}`;

  return (
    <StyledSafeAreaView edges={["bottom"]} className="flex-1 bg-white dark:bg-gray-950">
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="gap-5 px-4 py-4 pb-8 md:px-8"
      >
        <View className="mx-auto w-full max-w-3xl gap-5">
          <View className="gap-4 border-b border-gray-200 pb-5 dark:border-gray-800">
            <View className="flex-row flex-wrap items-center gap-2">
              <View
                className={`flex-row items-center gap-1.5 rounded-full px-2.5 py-1 ${activityTypeSurfaceClass[activity.type]}`}
              >
                <TypeIcon size={14} color={activityTypeColor[activity.type]} />
                <Text
                  selectable
                  className={`text-xs font-semibold ${activityTypeTextClass[activity.type]}`}
                >
                  {t(activityTypeLabelKey[activity.type])}
                </Text>
              </View>
              <View
                className={`rounded-full px-2.5 py-1 ${activityStatusSurfaceClass[activity.status]}`}
              >
                <Text
                  selectable
                  className={`text-xs font-semibold ${activityStatusTextClass[activity.status]}`}
                >
                  {t(activityStatusLabelKey[activity.status])}
                </Text>
              </View>
            </View>
            <View className="gap-1">
              <Text selectable className="text-2xl font-bold text-gray-950 dark:text-gray-50">
                {activity.title}
              </Text>
              <Text selectable className="text-sm text-gray-500 dark:text-gray-400">
                {activity.department} · {t(`coordination_category_${activity.category}`)}
              </Text>
            </View>
            <Text selectable className="text-sm leading-6 text-gray-700 dark:text-gray-300">
              {activity.description}
            </Text>
          </View>

          <View className="gap-4 border-b border-gray-200 pb-5 dark:border-gray-800">
            <Text selectable className="text-base font-semibold text-gray-950 dark:text-gray-50">
              {t("activity_information")}
            </Text>
            <DetailRow
              icon={<CalendarDays size={17} color="#6a7282" />}
              label={t("date")}
              value={dateLabel}
            />
            <DetailRow
              icon={<Clock3 size={17} color="#6a7282" />}
              label={t("time")}
              value={`${activity.startTime}–${activity.endTime}`}
            />
            <DetailRow
              icon={<MapPin size={17} color="#6a7282" />}
              label={t("location")}
              value={activity.location}
            />
            <DetailRow
              icon={<UserRound size={17} color="#6a7282" />}
              label={t("responsible_person")}
              value={`${activity.responsiblePerson} · ${activity.responsibleRole}`}
            />
          </View>

          <View className="gap-4 border-b border-gray-200 pb-5 dark:border-gray-800">
            <View className="flex-row items-center gap-2">
              <UsersRound size={18} color="#0d542b" />
              <Text selectable className="text-base font-semibold text-gray-950 dark:text-gray-50">
                {t("participants")}
              </Text>
            </View>
            {activity.participants.map((participant) => (
              <View key={participant} className="flex-row items-center gap-2">
                <View className="size-1.5 rounded-full bg-green-700" />
                <Text selectable className="flex-1 text-sm text-gray-700 dark:text-gray-300">
                  {participant}
                </Text>
              </View>
            ))}
          </View>

          {activity.type === "training" ? (
            <View className="gap-4 border-b border-gray-200 pb-5 dark:border-gray-800">
              <View className="flex-row items-center gap-2">
                <PackageOpen size={18} color="#7c3aed" />
                <Text selectable className="text-base font-semibold text-gray-950 dark:text-gray-50">
                  {t("training_information")}
                </Text>
              </View>
              <DetailRow
                icon={<UserRound size={17} color="#6a7282" />}
                label={t("trainer")}
                value={activity.trainer ?? t("not_available")}
              />
              <DetailRow
                icon={<FileCheck2 size={17} color="#6a7282" />}
                label={t("status")}
                value={activity.trainingStage ? t(activity.trainingStage) : t("not_available")}
              />
              <DetailRow
                icon={<UsersRound size={17} color="#6a7282" />}
                label={t("attendance")}
                value={`${activity.actualAttendance ?? 0} / ${activity.expectedAttendance ?? 0}`}
              />
              <DetailRow
                icon={<FileCheck2 size={17} color="#6a7282" />}
                label={t("report_status")}
                value={activity.reportStatus ? t(activity.reportStatus) : t("not_available")}
              />
              {activity.materials?.length ? (
                <View className="gap-2">
                  <Text selectable className="text-xs text-gray-500 dark:text-gray-400">
                    {t("materials")}
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {activity.materials.map((material) => (
                      <View key={material} className="rounded-full bg-violet-50 px-3 py-1.5 dark:bg-violet-950/50">
                        <Text selectable className="text-xs font-medium text-violet-800 dark:text-violet-100">
                          {material}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}
            </View>
          ) : null}

          <View className="gap-3 border-b border-gray-200 pb-5 dark:border-gray-800">
            <Text selectable className="text-base font-semibold text-gray-950 dark:text-gray-50">
              {t("reporting")}
            </Text>
            <DetailRow
              icon={<FileCheck2 size={17} color="#6a7282" />}
              label={t("report_status")}
              value={activity.reportStatus ? t(activity.reportStatus) : t("not_available")}
            />
          </View>

          {activity.sourceHref ? (
            <Link href={activity.sourceHref as Href} asChild push>
              <Pressable className="items-center rounded-full bg-green-900 py-3.5 active:bg-green-800">
                <Text selectable className="text-sm font-semibold text-white">
                  {activity.type === "training"
                    ? t("open_training_record")
                    : activity.type === "communication"
                      ? t("open_communication_record")
                      : t("open_source_record")}
                </Text>
              </Pressable>
            </Link>
          ) : null}
        </View>
      </ScrollView>
    </StyledSafeAreaView>
  );
}
