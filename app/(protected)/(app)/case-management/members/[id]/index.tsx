import { eq, useLiveQuery } from "@tanstack/react-db";
import * as Haptics from "expo-haptics";
import { Image as ExpoImage } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  Accessibility,
  BadgeCheck,
  GraduationCap,
  House,
  IdCard,
  UserRound,
  type LucideIcon,
} from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Pressable,
  Image as RNImage,
  ScrollView,
  Text,
  useColorScheme,
  View,
} from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInRight,
  FadeOutLeft,
  LinearTransition,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { useRowSeparatorStyle } from "@/src/components/ui/list-separator";
import StyledSafeAreaView from "@/src/components/ui/styled-safe-area-view";
import { translateStatus } from "@/src/i18n/helpers";
import { goBackOrReplace } from "@/src/lib/navigation";
import { householdMembersCollection, householdsCollection } from "@/src/powersync/collections";
import { enqueueHouseholdChangeRequest } from "@/src/powersync/mutations";
import {
  buildHouseholdMemberDetailSections,
  formatHouseholdMemberRowSummary,
  getHouseholdMemberInitials,
  type HouseholdMember,
  type HouseholdMemberDetailRow,
  type HouseholdMemberDetailSection,
} from "@/src/utils/household-member";

const IDENTITY_AVATAR_PLACEHOLDER = require("@/assets/images/identity-card-avatar-placeholder.png");
const TANZANIA_COAT_OF_ARMS = require("@/assets/images/tanzania-coat-of-arms.png");
const TANZANIA_FLAG = require("@/assets/images/tanzania-flag.png");
const DETAIL_TAB_ACTIVE_MAX_WIDTH = 120;
const DETAIL_TAB_ACTIVE_MIN_WIDTH = 96;
const DETAIL_TAB_HORIZONTAL_PADDING = 16;
const DETAIL_TAB_ITEM_GAP = 8;

type HouseholdRouteItem = {
  id?: number | string | null;
  uuid?: string | null;
  headName?: string | null;
  representativeName?: string | null;
  groupCode?: string | null;
  status?: string | null;
};

function parseHouseholdParam(value: string | undefined) {
  try {
    return value ? (JSON.parse(value) as HouseholdRouteItem) : null;
  } catch {
    return null;
  }
}

function parseMemberParam(value: string | undefined) {
  try {
    return value ? (JSON.parse(value) as HouseholdMember) : null;
  } catch {
    return null;
  }
}

function getAvatarAccessibilityLabel(
  member: HouseholdMember,
  t: (key: string, options?: any) => string,
) {
  return member.avatarUri
    ? t("replace_member_avatar", { name: member.fullName ?? t("member") })
    : t("upload_member_avatar", { name: member.fullName ?? t("member") });
}

function getIdentityCardNameParts(member: HouseholdMember) {
  const fullName = member.fullName ?? "";
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0] ?? fullName;
  const lastName = parts.length > 1 ? parts[parts.length - 1] : null;
  const middleName =
    member.middleName?.trim() || (parts.length > 2 ? parts.slice(1, -1).join(" ") : null);

  return { firstName, middleName, lastName };
}

function formatIdentityCardGender(value: HouseholdMember["gender"]) {
  if (value === "male") return "M";
  if (value === "female") return "F";
  if (value === "other") return "O";
  return "—";
}

function formatIdentityCardValue(value: string | null | undefined, emptyLabel: string) {
  return value?.trim() || emptyLabel;
}

function hasIdentityDetails(section: HouseholdMemberDetailSection) {
  return section.rows.some((detail) => Boolean(detail.value?.trim()));
}

function IdentityCardField({
  label,
  helper,
  value,
}: {
  label: string;
  helper: string;
  value: string | null | undefined;
}) {
  const { t } = useTranslation();

  return (
    <View className="flex-row items-end gap-2">
      <View className="w-24 shrink-0 gap-0.5">
        <Text className="text-[10px] font-semibold tracking-wide text-gray-700 uppercase dark:text-gray-300">
          {label}
        </Text>
        <Text className="text-[10px] text-gray-500 italic dark:text-gray-400">{helper}</Text>
      </View>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.78}
        className="min-w-0 flex-1 text-base font-bold text-gray-950 dark:text-gray-50"
      >
        {formatIdentityCardValue(value, t("not_provided"))}
      </Text>
    </View>
  );
}

function IdentityCardPortrait({ member }: { member: HouseholdMember }) {
  const { t } = useTranslation();

  return (
    <View className="h-28 w-24 overflow-hidden">
      {member.avatarUri ? (
        <ExpoImage source={{ uri: member.avatarUri }} className="size-full" contentFit="cover" />
      ) : (
        <RNImage
          source={IDENTITY_AVATAR_PLACEHOLDER}
          resizeMode="cover"
          accessibilityLabel={t("default_identity_avatar")}
          style={{ height: "100%", width: "100%" }}
        />
      )}
    </View>
  );
}

function IdentityFlagMark() {
  const { t } = useTranslation();

  return (
    <RNImage
      source={TANZANIA_FLAG}
      resizeMode="cover"
      accessibilityLabel={t("tanzania_flag")}
      style={{ borderRadius: 2, flexShrink: 0, height: 40, width: 64 }}
    />
  );
}

function HouseholdMemberIdentityCard({ member }: { member: HouseholdMember }) {
  const { t } = useTranslation();
  const { firstName, middleName, lastName } = getIdentityCardNameParts(member);
  const hasIdentityScan = Boolean(member.identityScanUri);

  return (
    <View className="overflow-hidden rounded-xl border border-gray-300 bg-emerald-50 dark:border-gray-800 dark:bg-emerald-950">
      <View
        className="relative overflow-hidden px-3 py-3"
        style={{ aspectRatio: 1.45, minHeight: 248 }}
      >
        <View className="absolute -top-10 -left-10 size-36 rounded-full bg-emerald-200/55 dark:bg-emerald-900/40" />
        <View className="absolute -right-8 bottom-4 size-40 rounded-full bg-sky-200/55" />
        <View className="absolute right-0 bottom-0 left-0 h-20 bg-white/45" />

        <View className="flex-row items-start gap-2">
          <RNImage
            source={TANZANIA_COAT_OF_ARMS}
            resizeMode="contain"
            accessibilityLabel={t("tanzania_coat_of_arms")}
            style={{ flexShrink: 0, height: 56, width: 48 }}
          />

          <View className="min-w-0 flex-1 items-center">
            <Text
              numberOfLines={1}
              className="text-[9px] font-semibold tracking-wide text-gray-700 uppercase dark:text-gray-300"
            >
              JAMHURI YA MUUNGANO WA TANZANIA
            </Text>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.72}
              className="text-lg font-black tracking-wide text-blue-900 uppercase dark:text-blue-300"
            >
              KITAMBULISHO CHA TAIFA
            </Text>
            <Text
              numberOfLines={1}
              className="text-[9px] font-semibold tracking-wide text-gray-700 uppercase dark:text-gray-300"
            >
              THE UNITED REPUBLIC OF TANZANIA
            </Text>
            <Text
              numberOfLines={1}
              className="text-xs font-black tracking-wide text-blue-800 uppercase dark:text-blue-300"
            >
              CITIZEN IDENTITY CARD
            </Text>
          </View>

          <IdentityFlagMark />
        </View>

        <View className="mt-3">
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.65}
            className="text-lg font-black text-gray-950 dark:text-gray-50"
          >
            {formatIdentityCardValue(member.identityNumber, t("not_provided"))}
          </Text>
        </View>

        <View className="mt-2 flex-1 flex-row gap-3">
          <View className="min-w-0 flex-1 justify-between">
            <IdentityCardField label="JINA LA KWANZA" helper={t("first_name")} value={firstName} />
            <IdentityCardField
              label="MAJINA YA KATI"
              helper={t("middle_name")}
              value={middleName}
            />
            <IdentityCardField label="JINA LA MWISHO" helper={t("last_name")} value={lastName} />

            <View className="flex-row items-center gap-2">
              <View className="w-24 shrink-0 gap-0.5">
                <Text className="text-[10px] font-semibold tracking-wide text-gray-700 uppercase dark:text-gray-300">
                  JINSI
                </Text>
                <Text className="text-[10px] text-gray-500 italic dark:text-gray-400">
                  {t("sex")}
                </Text>
              </View>
              <Text className="text-base font-black text-gray-950 dark:text-gray-50">
                {formatIdentityCardGender(member.gender)}
              </Text>
            </View>
          </View>

          <View className="items-end justify-end gap-2">
            <IdentityCardPortrait member={member} />
            <View
              className={
                hasIdentityScan
                  ? "rounded-full bg-green-100 px-2 py-1 dark:bg-green-950"
                  : "rounded-full bg-gray-100 px-2 py-1 dark:bg-gray-800"
              }
            >
              <Text
                className={
                  hasIdentityScan
                    ? "text-[10px] font-bold tracking-wide text-green-700 uppercase dark:text-green-300"
                    : "text-[10px] font-bold tracking-wide text-gray-600 uppercase dark:text-gray-400"
                }
              >
                {hasIdentityScan ? t("scan_captured") : t("no_scan")}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

function DetailRow({ item, last }: { item: HouseholdMemberDetailRow; last: boolean }) {
  const value = item.value?.trim() || "—";
  const mutedValue = item.mutedValue?.trim();
  const rowSeparatorStyle = useRowSeparatorStyle("bottom");

  return (
    <View
      className="flex-row items-start justify-between gap-4 py-4"
      style={last ? undefined : rowSeparatorStyle}
    >
      <Text className="flex-1 text-sm text-gray-500 dark:text-gray-400">{item.label}</Text>
      <Text
        className={`max-w-[58%] text-right text-sm font-medium ${
          item.destructive && value !== "—"
            ? "text-red-600 dark:text-red-400"
            : "text-gray-950 dark:text-gray-50"
        }`}
      >
        {value}
        {mutedValue && value !== "—" ? (
          <Text className="text-sm font-normal text-gray-600 dark:text-gray-400">
            {" "}
            {mutedValue}
          </Text>
        ) : null}
      </Text>
    </View>
  );
}

function DetailSection({ section }: { section: HouseholdMemberDetailSection }) {
  const { t } = useTranslation();

  if (section.title === t("identity")) {
    return null;
  }

  return (
    <View className="border-t border-gray-200 dark:border-gray-800">
      {section.rows.map((detail, index) => (
        <DetailRow key={detail.label} item={detail} last={index === section.rows.length - 1} />
      ))}
    </View>
  );
}

function IdentityDetailSection({
  section,
  member,
}: {
  section: HouseholdMemberDetailSection;
  member: HouseholdMember;
}) {
  const { t } = useTranslation();

  if (!hasIdentityDetails(section)) {
    return (
      <View className="min-h-40 items-center justify-center py-8">
        <Text className="text-center text-sm font-medium text-gray-500 dark:text-gray-400">
          {t("not_provided")}
        </Text>
      </View>
    );
  }

  return (
    <View className="gap-4">
      <HouseholdMemberIdentityCard member={member} />
      <View className="border-t border-gray-200 dark:border-gray-800">
        {section.rows.map((detail, index) => (
          <DetailRow key={detail.label} item={detail} last={index === section.rows.length - 1} />
        ))}
      </View>
    </View>
  );
}

function getDetailSectionIcon(title: string, t: (key: string) => string): LucideIcon {
  switch (title) {
    case "Household role":
    case t("household_role"):
      return House;
    case "Identity":
    case t("identity"):
    case "Documents":
    case t("documents"):
      return IdCard;
    case "Education":
    case t("education"):
      return GraduationCap;
    case "Disability":
    case t("disability"):
      return Accessibility;
    case "Status":
    case t("status"):
      return BadgeCheck;
    default:
      return UserRound;
  }
}

function DetailSectionTabs({
  sections,
  selectedIndex,
  onSelect,
}: {
  sections: HouseholdMemberDetailSection[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}) {
  const { t } = useTranslation();
  const isDark = useColorScheme() === "dark";
  const [viewportWidth, setViewportWidth] = useState(0);
  const [activeTabWidths, setActiveTabWidths] = useState<Record<string, number>>({});
  const hasPositionedIndicator = useRef(false);
  const indicatorX = useSharedValue(0);
  const indicatorWidth = useSharedValue(0);
  const indicatorOpacity = useSharedValue(0);

  const selectedSection = sections[selectedIndex];
  const activeTabWidth = selectedSection
    ? (activeTabWidths[selectedSection.title] ?? DETAIL_TAB_ACTIVE_MAX_WIDTH)
    : DETAIL_TAB_ACTIVE_MAX_WIDTH;
  const inactiveTabWidth =
    viewportWidth > 0 && sections.length > 1
      ? Math.max(
          0,
          (viewportWidth -
            DETAIL_TAB_HORIZONTAL_PADDING * 2 -
            DETAIL_TAB_ITEM_GAP * (sections.length - 1) -
            activeTabWidth) /
            (sections.length - 1),
        )
      : null;
  const indicatorTargetX =
    DETAIL_TAB_HORIZONTAL_PADDING +
    (inactiveTabWidth === null
      ? 0
      : (inactiveTabWidth + DETAIL_TAB_ITEM_GAP) * Math.max(0, selectedIndex));

  useEffect(() => {
    if (!viewportWidth) return;

    if (!hasPositionedIndicator.current) {
      indicatorX.value = indicatorTargetX;
      indicatorWidth.value = activeTabWidth;
      indicatorOpacity.value = 1;
      hasPositionedIndicator.current = true;
    } else {
      indicatorX.value = withSpring(indicatorTargetX, {
        damping: 22,
        stiffness: 280,
        mass: 0.8,
        reduceMotion: ReduceMotion.System,
      });
      indicatorWidth.value = withTiming(activeTabWidth, {
        duration: 180,
        easing: Easing.out(Easing.cubic),
        reduceMotion: ReduceMotion.System,
      });
    }
  }, [
    activeTabWidth,
    indicatorOpacity,
    indicatorTargetX,
    indicatorWidth,
    indicatorX,
    viewportWidth,
  ]);

  const indicatorStyle = useAnimatedStyle(() => ({
    opacity: indicatorOpacity.value,
    width: indicatorWidth.value,
    transform: [{ translateX: indicatorX.value }],
  }));

  return (
    <View
      accessibilityRole="tablist"
      style={{ marginHorizontal: -16 }}
      onLayout={(event) => setViewportWidth(event.nativeEvent.layout.width)}
    >
      <View className="relative flex-row gap-2 px-4">
        <Animated.View
          pointerEvents="none"
          className="absolute top-2 left-0 h-10 rounded-full bg-gray-100 dark:bg-gray-800"
          style={indicatorStyle}
        />
        <View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          className="absolute top-0 left-0 opacity-0"
        >
          {sections.map((section) => {
            const SectionIcon = getDetailSectionIcon(section.title, t);

            return (
              <View
                key={`measure-${section.title}`}
                collapsable={false}
                className="flex-row items-center justify-center gap-2 self-start"
                style={{
                  maxWidth: DETAIL_TAB_ACTIVE_MAX_WIDTH,
                  minWidth: DETAIL_TAB_ACTIVE_MIN_WIDTH,
                  padding: 10,
                  paddingRight: 14,
                }}
                onLayout={(event) => {
                  const { width } = event.nativeEvent.layout;
                  setActiveTabWidths((currentWidths) =>
                    Math.abs((currentWidths[section.title] ?? 0) - width) < 0.5
                      ? currentWidths
                      : { ...currentWidths, [section.title]: width },
                  );
                }}
              >
                <SectionIcon size={20} strokeWidth={2.2} color="#000000" />
                <Text numberOfLines={1} className="shrink text-sm font-medium">
                  {section.title}
                </Text>
              </View>
            );
          })}
        </View>
        {sections.map((section, index) => {
          const isSelected = selectedIndex === index;
          const SectionIcon = getDetailSectionIcon(section.title, t);

          return (
            <Animated.View
              key={section.title}
              layout={LinearTransition.duration(220)
                .easing(Easing.inOut(Easing.cubic))
                .reduceMotion(ReduceMotion.System)}
              className="h-14 items-center justify-center"
              style={
                isSelected
                  ? { flexShrink: 0, width: activeTabWidth }
                  : inactiveTabWidth === null
                    ? { flexBasis: 0, flexGrow: 1, flexShrink: 1, minWidth: 0 }
                    : { width: inactiveTabWidth }
              }
            >
              <Pressable
                onPress={() => {
                  if (isSelected) return;
                  if (process.env.EXPO_OS === "ios") {
                    void Haptics.selectionAsync();
                  }
                  onSelect(index);
                }}
                accessibilityRole="tab"
                accessibilityLabel={section.title}
                accessibilityState={{ selected: isSelected }}
                hitSlop={8}
                className={
                  isSelected
                    ? "items-center justify-center"
                    : "h-14 items-center justify-center self-stretch"
                }
                style={
                  isSelected
                    ? {
                        maxWidth: DETAIL_TAB_ACTIVE_MAX_WIDTH,
                        minWidth: DETAIL_TAB_ACTIVE_MIN_WIDTH,
                        padding: 10,
                        paddingRight: 14,
                      }
                    : undefined
                }
              >
                <Animated.View
                  layout={LinearTransition.duration(220)
                    .easing(Easing.out(Easing.cubic))
                    .reduceMotion(ReduceMotion.System)}
                  className={
                    isSelected
                      ? "flex-row items-center justify-center gap-2"
                      : "h-full items-center justify-center self-stretch"
                  }
                >
                  <Animated.View
                    layout={LinearTransition.duration(220)
                      .easing(Easing.out(Easing.cubic))
                      .reduceMotion(ReduceMotion.System)}
                  >
                    <SectionIcon
                      size={20}
                      strokeWidth={2.2}
                      color={
                        isSelected
                          ? isDark
                            ? "#f9fafb"
                            : "#111827"
                          : isDark
                            ? "#9ca3af"
                            : "#6b7280"
                      }
                    />
                  </Animated.View>
                  {isSelected && (
                    <Animated.Text
                      entering={FadeInRight.duration(180)
                        .delay(55)
                        .easing(Easing.out(Easing.cubic))
                        .reduceMotion(ReduceMotion.System)}
                      exiting={FadeOutLeft.duration(100)
                        .easing(Easing.in(Easing.cubic))
                        .reduceMotion(ReduceMotion.System)}
                      numberOfLines={1}
                      className="shrink text-sm font-medium text-gray-900 dark:text-gray-100"
                    >
                      {section.title}
                    </Animated.Text>
                  )}
                </Animated.View>
              </Pressable>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

function ActionButton({
  label,
  variant,
  disabled,
  onPress,
}: {
  label: string;
  variant: "neutral" | "danger";
  disabled: boolean;
  onPress: () => void;
}) {
  const isDanger = variant === "danger";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      className={`h-9 flex-1 items-center justify-center rounded-full px-4 ${
        isDanger ? "bg-red-50 dark:bg-red-950/40" : "bg-gray-100 dark:bg-gray-800"
      } ${disabled ? "opacity-45" : ""}`}
    >
      <Text
        className={`text-sm font-semibold ${isDanger ? "text-red-600 dark:text-red-400" : "text-gray-950 dark:text-gray-50"}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function HouseholdMemberShow() {
  const { t, i18n } = useTranslation();
  const { id, householdId, uuid, household, member } = useLocalSearchParams<{
    id: string;
    householdId?: string;
    uuid?: string;
    household?: string;
    member?: string;
  }>();
  const router = useRouter();
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);

  const routeHousehold = parseHouseholdParam(household);
  const routeMember = parseMemberParam(member);

  const memberQuery = useLiveQuery(
    (q) =>
      q
        .from({ member: householdMembersCollection })
        .where(({ member }) => eq(member.uuid, id ?? routeMember?.uuid ?? ""))
        .orderBy(({ member }) => member.id, "asc")
        .limit(1),
    [id, routeMember?.uuid],
  );
  const currentMember = memberQuery.data?.[0] ?? routeMember ?? null;
  const householdUuid = uuid ?? currentMember?.householdUuid ?? "";

  const householdQuery = useLiveQuery(
    (q) =>
      q
        .from({ household: householdsCollection })
        .where(({ household }) => eq(household.uuid, householdUuid || "__missing_household__"))
        .orderBy(({ household }) => household.id, "asc")
        .limit(1),
    [householdUuid],
  );

  const householdRow = householdQuery.data?.[0] ?? null;
  const householdItem = householdRow
    ? {
        ...routeHousehold,
        id: householdRow.id,
        uuid: householdRow.uuid,
        headName: householdRow.headName,
        representativeName: householdRow.representativeName,
        groupCode: householdRow.groupCode,
        status: householdRow.caseStatus,
      }
    : routeHousehold;

  if (!currentMember && memberQuery.data) {
    return (
      <StyledSafeAreaView
        edges={["bottom"]}
        className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-950"
      >
        <Text className="text-lg text-red-600 dark:text-red-400">{t("member_data_not_found")}</Text>
        <Pressable
          onPress={() => goBackOrReplace(router, "/case-management")}
          className="mt-6 rounded-lg bg-emerald-700 px-6 py-3"
        >
          <Text className="font-medium text-white">{t("go_back")}</Text>
        </Pressable>
      </StyledSafeAreaView>
    );
  }

  if (!currentMember) {
    return (
      <StyledSafeAreaView
        edges={["bottom"]}
        className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-950"
      >
        <Text className="text-base text-gray-600 dark:text-gray-400">{t("loading_member")}</Text>
      </StyledSafeAreaView>
    );
  }

  const detailSections = buildHouseholdMemberDetailSections(currentMember, t, i18n.language);
  const selectedSectionIndex = Math.min(activeSectionIndex, Math.max(detailSections.length - 1, 0));
  const selectedSection = detailSections[selectedSectionIndex];
  const householdIsActive = householdItem?.status !== "inactive";
  const canManageMember = householdIsActive && currentMember.isActive && Boolean(householdItem);
  const serializedHousehold = household ?? (householdItem ? JSON.stringify(householdItem) : "");
  const serializedMember = JSON.stringify(currentMember);
  const baseParams = {
    id: currentMember.uuid ?? currentMember.id,
    householdId: householdId ?? String(householdItem?.id ?? ""),
    uuid: householdUuid,
    household: serializedHousehold,
    memberUuid: currentMember.uuid ?? currentMember.id,
    member: serializedMember,
  };

  const handlePickAvatar = async () => {
    if (!canManageMember) return;

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert(t("permission_required"), t("media_library_permission_required"));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.85,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (result.canceled) return;

    const avatarUri = result.assets[0]?.uri;
    if (!avatarUri) return;

    const now = new Date().toISOString();

    try {
      const memberTx = householdMembersCollection.update(currentMember.id, (draft) => {
        draft.avatarUri = avatarUri;
        draft.updatedAt = now;
      });
      await memberTx.isPersisted.promise;

      const changeTx = enqueueHouseholdChangeRequest({
        householdUuid,
        memberUuid: currentMember.uuid ?? currentMember.id,
        type: "member_updated",
        payload: {
          memberUuid: currentMember.uuid ?? currentMember.id,
          avatarUri,
          updatedAt: now,
          previous: {
            avatarUri: currentMember.avatarUri,
          },
        },
      });
      await changeTx.isPersisted.promise;
    } catch (error) {
      console.error("[Household Member Avatar] Failed:", error);
      Alert.alert(t("error"), t("failed_update_avatar"));
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: currentMember.fullName || t("member_details"),
          headerTintColor: "#fff",
          headerStyle: { backgroundColor: "#0d542b" },
        }}
      />

      <StyledSafeAreaView edges={["bottom"]} className="flex-1 bg-white dark:bg-gray-950">
        <ScrollView
          className="flex-1"
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 20 }}
        >
          <View>
            <View className="flex-row items-start justify-between gap-3">
              <Pressable
                onPress={handlePickAvatar}
                disabled={!canManageMember}
                accessibilityRole="imagebutton"
                accessibilityLabel={getAvatarAccessibilityLabel(currentMember, t)}
                accessibilityState={{ disabled: !canManageMember }}
                className={`relative size-16 ${
                  canManageMember ? "active:opacity-80" : "opacity-75"
                }`}
              >
                <View className="size-full overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-800">
                  {currentMember.avatarUri ? (
                    <ExpoImage
                      source={{ uri: currentMember.avatarUri }}
                      className="size-full"
                      contentFit="cover"
                      transition={150}
                    />
                  ) : (
                    <View className="size-full items-center justify-center">
                      <Text className="text-xl font-bold text-gray-700 dark:text-gray-300">
                        {getHouseholdMemberInitials(currentMember.fullName)}
                      </Text>
                    </View>
                  )}
                </View>
              </Pressable>

              <View className="min-w-0 flex-1">
                {householdItem?.groupCode && (
                  <Text className="text-sm font-normal text-gray-950 dark:text-gray-50">
                    {householdItem.groupCode}
                  </Text>
                )}
                <Text className="text-xl font-bold text-gray-950 dark:text-gray-50">
                  {currentMember.fullName}
                </Text>
                <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {formatHouseholdMemberRowSummary(currentMember, t)}
                </Text>
              </View>

              <View
                className={`rounded-full px-2.5 py-1 ${
                  currentMember.isActive
                    ? "bg-green-100 dark:bg-green-950"
                    : "bg-red-100 dark:bg-red-950"
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    currentMember.isActive
                      ? "text-green-700 dark:text-green-300"
                      : "text-red-700 dark:text-red-300"
                  }`}
                >
                  {translateStatus(t, currentMember.isActive ? "active" : "inactive")}
                </Text>
              </View>
            </View>
          </View>

          <View className="flex-row gap-3">
            <ActionButton
              label={t("edit")}
              variant="neutral"
              disabled={!canManageMember}
              onPress={() =>
                router.push({
                  pathname: "/(protected)/(app)/case-management/members/[id]/edit",
                  params: baseParams,
                })
              }
            />
            <ActionButton
              label={t("biometrics")}
              variant="neutral"
              disabled={!canManageMember}
              onPress={() =>
                router.push({
                  pathname: "/(protected)/(app)/case-management/members/[id]/biometrics",
                  params: baseParams,
                })
              }
            />
            <ActionButton
              label={t("deactivate")}
              variant="danger"
              disabled={!canManageMember}
              onPress={() =>
                router.push({
                  pathname: "/(protected)/(app)/case-management/members/[id]/diactivate",
                  params: baseParams,
                })
              }
            />
          </View>

          <View className="gap-5">
            <DetailSectionTabs
              sections={detailSections}
              selectedIndex={selectedSectionIndex}
              onSelect={setActiveSectionIndex}
            />
            <Animated.View
              key={selectedSectionIndex}
              entering={FadeIn.duration(180)
                .easing(Easing.out(Easing.cubic))
                .reduceMotion(ReduceMotion.System)}
              className="gap-1"
            >
              {selectedSection ? (
                <>
                  <Text className="py-2 text-sm font-semibold text-gray-950 dark:text-gray-50">
                    {selectedSection.title}
                  </Text>
                  {selectedSection.title === t("identity") ? (
                    <IdentityDetailSection section={selectedSection} member={currentMember} />
                  ) : (
                    <DetailSection section={selectedSection} />
                  )}
                </>
              ) : null}
            </Animated.View>
          </View>
        </ScrollView>
      </StyledSafeAreaView>
    </>
  );
}
