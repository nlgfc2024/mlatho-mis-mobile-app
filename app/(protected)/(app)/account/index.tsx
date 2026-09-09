import { Button, Host, Text as JCText } from "@expo/ui/jetpack-compose";
import { clip, fillMaxWidth, Shapes } from "@expo/ui/jetpack-compose/modifiers";
import { Link } from "expo-router";
import { ChevronRight, Plus, UserRound } from "lucide-react-native";
import { memo } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Pressable, ScrollView, Text, useColorScheme, View } from "react-native";

import AccessRoleSwitcher from "@/src/components/account/access-role-switcher";
import {
  type ActiveCountState,
  type CountState,
  useAccountLocations,
  useSyncedGrievanceCounts,
  useSyncedLocationCounts,
} from "@/src/components/account/account-screen-data";
import {
  ACCOUNT_CARET_SIZE,
  ACCOUNT_CARET_STROKE_WIDTH,
  ACCOUNT_SECTION_GAP,
  getAccountCaretColor,
} from "@/src/components/account/account-section-tokens";
import DeferredAccountSection from "@/src/components/account/deferred-account-section";
import AccountBiometricPreference from "@/src/components/preferences/biometric";
import AccountLanguagePreference from "@/src/components/preferences/language";
import AccountNotificationPreference from "@/src/components/preferences/notification";
import AccountScreenshotPreference from "@/src/components/preferences/screenshots";
import AccountThemePreference from "@/src/components/preferences/theme";
import StyledSafeAreaView from "@/src/components/ui/styled-safe-area-view";
import { type SessionUser, useSession } from "@/src/providers/session-context";

function formatCount(value: number) {
  return value.toLocaleString("en-US");
}

export default function AccountScreen() {
  const { t } = useTranslation();
  const caretColor = getAccountCaretColor(useColorScheme() === "dark");

  const { logout, user } = useSession();

  return (
    <StyledSafeAreaView edges={["bottom"]} className="flex-1 bg-gray-100 dark:bg-gray-950">
      <ScrollView className="flex-1" contentContainerClassName="flex-grow justify-between">
        <View className="flex flex-1 justify-between gap-4 p-4">
          <View className="flex flex-1 flex-col" style={{ gap: ACCOUNT_SECTION_GAP }}>
            <View>
              <View className="flex flex-row items-stretch rounded-2xl py-2">
                <View className="flex flex-1 flex-row gap-3">
                  <View className="aspect-square flex-none items-center justify-center overflow-hidden rounded-full bg-white">
                    <UserRound size={24} color={"#4a5565"} />
                  </View>

                  <View className="flex-1">
                    <Text className="text-base font-semibold text-gray-950">
                      {/* @ts-ignore */}
                      {user?.fullName?.trim()}
                    </Text>
                    <Text className="text-sm font-normal text-gray-600">{user?.email}</Text>
                  </View>
                </View>
              </View>
            </View>

            <View>
              <View className="flex flex-row items-center justify-between">
                <View className="flex-1 pl-4">
                  <Text className="text-base font-bold text-gray-900 dark:text-gray-100">
                    {t("role")}
                  </Text>
                </View>
              </View>

              <View className="mt-2">
                <AccessRoleSwitcher />
              </View>
            </View>

            <View>
              <View className="flex flex-row items-center justify-between">
                <View className="flex-1 pl-4">
                  <Text className="text-base font-bold text-gray-900 dark:text-gray-100">
                    {t("locations")}
                  </Text>
                </View>

                <Pressable>
                  <Link href={{ pathname: "/account/location/create" }} asChild>
                    <Pressable className="flex flex-row items-center gap-1 rounded-full bg-white px-2 py-2 shadow-xs">
                      <Plus size={18} strokeWidth={2.5} color={"#6a7282"} />
                    </Pressable>
                  </Link>
                </Pressable>
              </View>

              <DeferredAccountSection fallback={<AccountRowsPlaceholder rows={1} />}>
                <ActiveLocationsList user={user} caretColor={caretColor} />
              </DeferredAccountSection>
            </View>

            <View>
              <View className="flex flex-row items-center justify-between">
                <View className="flex-1 pl-4">
                  <Text className="text-base font-bold text-gray-900 dark:text-gray-100">
                    {t("synced_grievance_setup")}
                  </Text>
                </View>
              </View>

              <DeferredAccountSection fallback={<AccountRowsPlaceholder rows={3} />} frames={2}>
                <SyncedGrievanceList caretColor={caretColor} />
              </DeferredAccountSection>
            </View>

            <View>
              <View className="flex flex-row items-center justify-between">
                <View className="flex-1 pl-4">
                  <Text className="text-base font-bold text-gray-900 dark:text-gray-100">
                    {t("synced_locations")}
                  </Text>
                </View>
              </View>

              <DeferredAccountSection fallback={<AccountRowsPlaceholder rows={4} />} frames={1}>
                <SyncedLocationList caretColor={caretColor} />
              </DeferredAccountSection>
            </View>

            <View>
              <View className="flex flex-row items-center justify-between">
                <View className="flex-1 pl-4">
                  <Text className="text-base font-bold text-gray-900 dark:text-gray-100">
                    {t("account_preferences")}
                  </Text>
                </View>
              </View>

              <DeferredAccountSection fallback={<AccountRowsPlaceholder rows={5} />} frames={3}>
                <AccountPreferences />
              </DeferredAccountSection>
            </View>
          </View>

          <View className="w-full flex-none">
            <Host style={{ width: "100%", height: 44 }}>
              <Button
                modifiers={[fillMaxWidth(), clip(Shapes.RoundedCorner(100))]}
                enabled={!logout.isPending}
                colors={{ contentColor: "#fb2c36", containerColor: "#ffe2e2" }}
                onClick={() => logout.mutate({})}
              >
                <JCText>{logout.isPending ? t("loading") : t("logout")}</JCText>
              </Button>
            </Host>
          </View>
        </View>
      </ScrollView>
    </StyledSafeAreaView>
  );
}

function AccountRowsPlaceholder({ rows }: { rows: number }) {
  return (
    <View className="mt-2 overflow-hidden rounded-2xl bg-white shadow-xs dark:bg-gray-900">
      {Array.from({ length: rows }, (_, index) => (
        <View
          key={index}
          className={`items-center justify-center border-t px-4 ${index === 0 ? "border-transparent" : "border-gray-200 dark:border-gray-800"}`}
          style={{ minHeight: 68 }}
        >
          <ActivityIndicator size="small" color="#6a7282" />
        </View>
      ))}
    </View>
  );
}

const ActiveLocationsList = memo(function ActiveLocationsList({
  user,
  caretColor,
}: {
  user: SessionUser | null;
  caretColor: string;
}) {
  const { t } = useTranslation();
  const {
    activeVillageId,
    areCountsLoading,
    displayLocations,
    hasError,
    householdCountByVillageId,
    isLocationsLoading,
    isNamesLoading,
    targetedMemberCountByVillageId,
    villageById,
  } = useAccountLocations(user);

  if (isLocationsLoading) return <AccountRowsPlaceholder rows={1} />;

  return (
    <View className="mt-2 flex flex-col gap-0 overflow-hidden rounded-2xl shadow-xs">
      {displayLocations.length === 0 ? (
        <View className="bg-white px-4 py-4 dark:bg-gray-900">
          <Text className="text-base font-normal text-gray-600 dark:text-gray-300">
            {hasError ? t("error") : t("no_active_location")}
          </Text>
        </View>
      ) : null}

      {displayLocations.map((location, index) => {
        const village = location.villageId ? villageById.get(location.villageId) : null;
        const householdCount = location.villageId
          ? (householdCountByVillageId.get(location.villageId) ?? 0)
          : 0;
        const targetedMemberCount = location.villageId
          ? (targetedMemberCountByVillageId.get(location.villageId) ?? 0)
          : 0;
        const isActive = Boolean(activeVillageId && location.villageId === activeVillageId);
        const locationName =
          isNamesLoading && !village ? t("loading") : (village?.name ?? t("unknown_village"));

        return (
          <Link
            key={location.id}
            href={{
              pathname: "/account/location/[id]",
              params: { id: location.villageId ?? "" },
            }}
            asChild
          >
            <Pressable
              className={`flex flex-row items-center justify-between gap-4 border-t bg-white px-4 py-4 dark:bg-gray-900 ${index === 0 ? "border-transparent" : "border-gray-200 dark:border-gray-800"}`}
            >
              <View className="flex flex-1 flex-row items-center gap-1.5">
                <View className="min-w-0 flex-1 gap-1">
                  {isActive ? (
                    <View className="flex-row">
                      <Text className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                        {t("active")}
                      </Text>
                    </View>
                  ) : null}
                  <Text
                    className="min-w-0 shrink text-base font-normal text-gray-950 dark:text-gray-100"
                    numberOfLines={1}
                  >
                    {locationName}
                  </Text>
                  <Text className="text-xs font-normal text-gray-500 dark:text-gray-300">
                    {areCountsLoading
                      ? t("loading")
                      : hasError
                        ? t("error")
                        : `${t("household_count", {
                            count: householdCount,
                            formattedCount: formatCount(householdCount),
                          })} · ${t("targeted_member_count", {
                            count: targetedMemberCount,
                            formattedCount: formatCount(targetedMemberCount),
                          })}`}
                  </Text>
                </View>
              </View>

              <ChevronRight
                size={ACCOUNT_CARET_SIZE}
                strokeWidth={ACCOUNT_CARET_STROKE_WIDTH}
                color={caretColor}
              />
            </Pressable>
          </Link>
        );
      })}
    </View>
  );
});

function CountValue({ state }: { state: CountState }) {
  const { t } = useTranslation();

  if (state.count !== null) {
    return (
      <Text className="text-sm font-medium text-gray-600 dark:text-gray-100">
        {formatCount(state.count)}
      </Text>
    );
  }

  if (state.isError) {
    return <Text className="text-xs text-red-600">{t("error")}</Text>;
  }

  return <ActivityIndicator size="small" color="#6a7282" />;
}

const SyncedLocationList = memo(function SyncedLocationList({
  caretColor,
}: {
  caretColor: string;
}) {
  const { t } = useTranslation();
  const counts = useSyncedLocationCounts();
  const stats = [
    {
      label: t("regions"),
      state: counts.regions,
      href: "/account/synced-locations/regions",
    },
    {
      label: t("districts"),
      state: counts.districts,
      href: "/account/synced-locations/districts",
    },
    { label: t("wards"), state: counts.wards, href: "/account/synced-locations/wards" },
    {
      label: t("villages"),
      state: counts.villages,
      href: "/account/synced-locations/villages",
    },
  ] as const;

  return (
    <View className="mt-2 flex flex-col gap-0 overflow-hidden rounded-2xl bg-white shadow-xs dark:bg-gray-900">
      {stats.map((item, index) => (
        <Link key={item.label} href={item.href} asChild>
          <Pressable
            className={`flex flex-row items-center justify-between gap-4 border-t px-4 py-4 active:bg-gray-50 dark:active:bg-gray-800 ${index === 0 ? "border-transparent" : "border-gray-200 dark:border-gray-800"}`}
          >
            <Text className="text-base font-normal text-gray-950 dark:text-gray-100">
              {item.label}
            </Text>

            <View className="flex flex-row items-center gap-1">
              <CountValue state={item.state} />
              <ChevronRight
                size={ACCOUNT_CARET_SIZE}
                strokeWidth={ACCOUNT_CARET_STROKE_WIDTH}
                color={caretColor}
              />
            </View>
          </Pressable>
        </Link>
      ))}
    </View>
  );
});

function ActiveCountLabel({ state }: { state: ActiveCountState }) {
  const { t } = useTranslation();

  if (state.activeCount !== null) {
    return (
      <Text className="text-xs font-normal text-gray-500 dark:text-gray-300">
        {t("active_count", {
          count: state.activeCount,
          formattedCount: formatCount(state.activeCount),
        })}
      </Text>
    );
  }

  return (
    <Text className={state.isError ? "text-xs text-red-600" : "text-xs text-gray-500"}>
      {state.isError ? t("error") : t("loading")}
    </Text>
  );
}

const SyncedGrievanceList = memo(function SyncedGrievanceList({
  caretColor,
}: {
  caretColor: string;
}) {
  const { t } = useTranslation();
  const counts = useSyncedGrievanceCounts();
  const stats = [
    {
      label: t("categories"),
      state: counts.categories,
      href: "/account/synced-grievance-setup/categories",
    },
    {
      label: t("types"),
      state: counts.types,
      href: "/account/synced-grievance-setup/types",
    },
    {
      label: t("channels"),
      state: counts.channels,
      href: "/account/synced-grievance-setup/channels",
    },
  ] as const;

  return (
    <View className="mt-2 flex flex-col gap-0 overflow-hidden rounded-2xl bg-white shadow-xs dark:bg-gray-900">
      {stats.map((item, index) => (
        <Link key={item.label} href={item.href} asChild>
          <Pressable
            className={`flex flex-row items-center justify-between gap-4 border-t px-4 py-4 active:bg-gray-50 dark:active:bg-gray-800 ${index === 0 ? "border-transparent" : "border-gray-200 dark:border-gray-800"}`}
          >
            <View className="min-w-0 flex-1">
              <Text className="text-base font-normal text-gray-950 dark:text-gray-100">
                {item.label}
              </Text>
              <ActiveCountLabel state={item.state} />
            </View>

            <View className="flex flex-row items-center gap-1">
              <CountValue state={item.state} />
              <ChevronRight
                size={ACCOUNT_CARET_SIZE}
                strokeWidth={ACCOUNT_CARET_STROKE_WIDTH}
                color={caretColor}
              />
            </View>
          </Pressable>
        </Link>
      ))}
    </View>
  );
});

const AccountPreferences = memo(function AccountPreferences() {
  return (
    <View className="mt-2 flex flex-col overflow-hidden rounded-2xl shadow-xs">
      <AccountThemePreference />
      <AccountNotificationPreference />
      <AccountScreenshotPreference />
      <AccountBiometricPreference />
      <AccountLanguagePreference />
    </View>
  );
});
