import {
  Button,
  Column,
  Host,
  Icon,
  IconButton,
  Text as JCText,
  ListItem,
  Row,
  Snackbar,
  SnackbarHost,
  type SnackbarHostRef,
  type SnackbarShowOptions,
} from "@expo/ui/jetpack-compose";
import {
  background,
  clickable,
  clip,
  defaultMinSize,
  fillMaxWidth,
  padding,
  Shapes,
  weight,
} from "@expo/ui/jetpack-compose/modifiers";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, useColorScheme, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

const ICON_PERSON = require("@/assets/icons/person.xml");
const ICON_ADD = require("@/assets/icons/add.xml");
const ICON_CHEVRON_RIGHT = require("@/assets/icons/chevron_right.xml");

function formatCount(value: number) {
  return value.toLocaleString("en-US");
}

const CORNER_OUTER = 20;
const CORNER_INNER = 4;

function cornersFor(index: number, total: number) {
  const isFirst = index === 0;
  const isLast = index === total - 1;
  return {
    topStart: isFirst ? CORNER_OUTER : CORNER_INNER,
    topEnd: isFirst ? CORNER_OUTER : CORNER_INNER,
    bottomStart: isLast ? CORNER_OUTER : CORNER_INNER,
    bottomEnd: isLast ? CORNER_OUTER : CORNER_INNER,
  };
}

type Palette = {
  screenBg: string;
  surface: string;
  surfaceMuted: string;
  textPrimary: string;
  textSecondary: string;
  iconMuted: string;
  divider: string;
  danger: string;
  dangerBg: string;
};

function usePalette(): Palette {
  const isDark = useColorScheme() === "dark";
  const iconMuted = getAccountCaretColor(isDark);

  return useMemo(
    () =>
      isDark
        ? {
            screenBg: "#030712",
            surface: "#111827",
            surfaceMuted: "#1f2937",
            textPrimary: "#f3f4f6",
            textSecondary: "#9ca3af",
            iconMuted,
            divider: "#1f2937",
            danger: "#fb2c36",
            dangerBg: "#3b0c10",
          }
        : {
            screenBg: "#f3f4f6",
            surface: "#ffffff",
            surfaceMuted: "#f3f4f6",
            textPrimary: "#030712",
            textSecondary: "#4b5563",
            iconMuted,
            divider: "#e5e7eb",
            danger: "#fb2c36",
            dangerBg: "#ffe2e2",
          },
    [iconMuted, isDark],
  );
}

function SectionHeader({
  title,
  trailing,
  palette,
}: {
  title: string;
  trailing?: React.ReactNode;
  palette: Palette;
}) {
  return (
    <Host matchContents={{ vertical: true }} style={{ width: "100%" }}>
      <Row modifiers={[fillMaxWidth(), padding(16, 0, 4, 8)]} verticalAlignment="center">
        <JCText
          style={{ typography: "titleMedium", fontWeight: "bold" }}
          color={palette.textPrimary}
          modifiers={[weight(1)]}
        >
          {title}
        </JCText>
        {trailing}
      </Row>
    </Host>
  );
}

export default function AccountScreen() {
  const router = useRouter();
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { logout, user } = useSession();
  const snackbarRef = useRef<SnackbarHostRef>(null);
  const [previewSnackbar, setPreviewSnackbar] = useState<SnackbarShowOptions | null>(null);

  useEffect(() => {
    if (!previewSnackbar) return;

    const host = snackbarRef.current;
    if (!host) return;

    let cancelled = false;
    void host
      .showSnackbar(previewSnackbar)
      .then((result) => {
        if (cancelled) return;

        if (result === "actionPerformed" && previewSnackbar.actionLabel) {
          setPreviewSnackbar({ message: t("synchronizing"), duration: "short" });
          return;
        }

        setPreviewSnackbar(null);
      })
      .catch(() => {
        if (!cancelled) setPreviewSnackbar(null);
      });

    return () => {
      cancelled = true;
    };
  }, [previewSnackbar, t]);

  // @ts-ignore — fullName is a custom SQL relation, not on the base type
  const displayName = user?.fullName?.trim?.() || t("unknown_user");
  const displayEmail = user?.email ?? "";

  return (
    <StyledSafeAreaView edges={["bottom"]} style={{ flex: 1, backgroundColor: palette.screenBg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, justifyContent: "space-between", padding: 16 }}
      >
        <View style={{ gap: ACCOUNT_SECTION_GAP }}>
          {/* ───────────── Profile ───────────── */}
          <Host matchContents={{ vertical: true }} style={{ width: "100%" }}>
            <ListItem
              modifiers={[fillMaxWidth()]}
              colors={{
                containerColor: palette.screenBg,
                contentColor: palette.textPrimary,
                supportingContentColor: palette.textSecondary,
                leadingContentColor: palette.iconMuted,
              }}
            >
              <ListItem.LeadingContent>
                <Icon source={ICON_PERSON} tint={palette.iconMuted} size={32} />
              </ListItem.LeadingContent>
              <ListItem.HeadlineContent>
                <JCText
                  style={{ typography: "titleMedium", fontWeight: "600" }}
                  color={palette.textPrimary}
                  maxLines={1}
                  overflow="ellipsis"
                >
                  {displayName}
                </JCText>
              </ListItem.HeadlineContent>
              <ListItem.SupportingContent>
                <JCText
                  style={{ typography: "bodySmall" }}
                  color={palette.textSecondary}
                  maxLines={1}
                  overflow="ellipsis"
                >
                  {displayEmail}
                </JCText>
              </ListItem.SupportingContent>
            </ListItem>
          </Host>

          {/* ───────────── Role ───────────── */}
          <View>
            <SectionHeader title={t("role")} palette={palette} />
            <View>
              <AccessRoleSwitcher containerStyle={{ borderRadius: CORNER_OUTER }} />
            </View>
          </View>

          {/* ───────────── Active locations ───────────── */}
          <View>
            <SectionHeader
              title={t("locations")}
              palette={palette}
              trailing={
                <IconButton
                  onClick={() => router.push("/account/location/create")}
                  colors={{ contentColor: palette.iconMuted }}
                >
                  <Icon source={ICON_ADD} tint={palette.iconMuted} size={20} />
                </IconButton>
              }
            />

            <DeferredAccountSection
              fallback={<AndroidRowsPlaceholder palette={palette} rows={1} />}
            >
              <AndroidActiveLocations user={user} palette={palette} />
            </DeferredAccountSection>
          </View>

          {/* ───────────── Synced locations ───────────── */}
          <View>
            <SectionHeader title={t("synced_locations")} palette={palette} />

            <DeferredAccountSection
              fallback={<AndroidRowsPlaceholder palette={palette} rows={4} />}
              frames={1}
            >
              <AndroidSyncedLocations palette={palette} />
            </DeferredAccountSection>
          </View>

          {/* ───────────── Synced grievance setup ───────────── */}
          <View>
            <SectionHeader title={t("synced_grievance_setup")} palette={palette} />

            <DeferredAccountSection
              fallback={<AndroidRowsPlaceholder palette={palette} rows={3} />}
              frames={2}
            >
              <AndroidSyncedGrievances palette={palette} />
            </DeferredAccountSection>
          </View>

          {/* ───────────── Account preferences ───────────── */}
          <View>
            <SectionHeader title={t("account_preferences")} palette={palette} />

            <DeferredAccountSection
              fallback={<AndroidRowsPlaceholder palette={palette} rows={5} />}
              frames={3}
            >
              <AndroidAccountPreferences palette={palette} />
            </DeferredAccountSection>
          </View>
        </View>

        {/* ───────────── Sync feedback preview ───────────── */}
        <View style={{ width: "100%", marginTop: 24 }}>
          <Host style={{ width: "100%", height: 48 }}>
            <Button
              modifiers={[fillMaxWidth()]}
              colors={{ contentColor: palette.textPrimary, containerColor: palette.surface }}
              onClick={() =>
                setPreviewSnackbar({
                  message: t("sync_failed"),
                  actionLabel: t("retry"),
                  duration: "indefinite",
                })
              }
            >
              <JCText>{t("show_snackbar")}</JCText>
            </Button>
          </Host>
        </View>

        {/* ───────────── Logout ───────────── */}
        <View style={{ width: "100%", marginTop: 12 }}>
          <Host style={{ width: "100%", height: 48 }}>
            <Button
              modifiers={[fillMaxWidth()]}
              enabled={!logout.isPending}
              colors={{ contentColor: palette.danger, containerColor: palette.dangerBg }}
              onClick={() => logout.mutate({})}
            >
              <JCText>{logout.isPending ? t("loading") : t("logout")}</JCText>
            </Button>
          </Host>
        </View>
      </ScrollView>

      {previewSnackbar ? (
        <View
          style={{ position: "absolute", left: 0, right: 0, bottom: insets.bottom + 16 }}
          pointerEvents="box-none"
        >
          <Host matchContents={{ vertical: true }} style={{ width: "100%" }}>
            <SnackbarHost ref={snackbarRef} modifiers={[fillMaxWidth()]}>
              <Snackbar
                containerColor={palette.surface}
                contentColor={palette.textPrimary}
                actionContentColor="#3b82f6"
              />
            </SnackbarHost>
          </Host>
        </View>
      ) : null}
    </StyledSafeAreaView>
  );
}

function AndroidRowsPlaceholder({ palette, rows }: { palette: Palette; rows: number }) {
  return (
    <View style={{ width: "100%", gap: 2 }}>
      {Array.from({ length: rows }, (_, index) => {
        const corners = cornersFor(index, rows);
        return (
          <View
            key={index}
            style={{
              minHeight: 72,
              justifyContent: "center",
              paddingHorizontal: 16,
              backgroundColor: palette.surface,
              borderTopLeftRadius: corners.topStart,
              borderTopRightRadius: corners.topEnd,
              borderBottomLeftRadius: corners.bottomStart,
              borderBottomRightRadius: corners.bottomEnd,
            }}
          >
            <View
              style={{
                width: index % 2 === 0 ? "42%" : "56%",
                height: 12,
                borderRadius: 6,
                backgroundColor: palette.surfaceMuted,
              }}
            />
          </View>
        );
      })}
    </View>
  );
}

function AndroidActiveLocations({ user, palette }: { user: SessionUser | null; palette: Palette }) {
  const router = useRouter();
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

  if (isLocationsLoading) return <AndroidRowsPlaceholder palette={palette} rows={1} />;

  return (
    <Host matchContents={{ vertical: true }} style={{ width: "100%" }}>
      <Column modifiers={[fillMaxWidth()]} verticalArrangement={{ spacedBy: 2 }}>
        {displayLocations.length === 0 ? (
          <Column
            modifiers={[
              fillMaxWidth(),
              clip(Shapes.RoundedCorner(cornersFor(0, 1))),
              background(palette.surface),
            ]}
          >
            <ListItem
              modifiers={[fillMaxWidth(), defaultMinSize({ minHeight: 72 })]}
              colors={{ containerColor: palette.surface, contentColor: palette.textSecondary }}
            >
              <ListItem.HeadlineContent>
                <JCText style={{ typography: "bodyMedium" }} color={palette.textSecondary}>
                  {hasError ? t("error") : t("no_active_location")}
                </JCText>
              </ListItem.HeadlineContent>
            </ListItem>
          </Column>
        ) : (
          displayLocations.map((location, index) => {
            const village = location.villageId ? villageById.get(location.villageId) : null;
            const householdCount = location.villageId
              ? (householdCountByVillageId.get(location.villageId) ?? 0)
              : 0;
            const targetedMemberCount = location.villageId
              ? (targetedMemberCountByVillageId.get(location.villageId) ?? 0)
              : 0;
            const isActive = Boolean(activeVillageId && location.villageId === activeVillageId);
            const locationName =
              isNamesLoading && !village ? t("loading") : (village?.name ?? t("unnamed_location"));
            const supportingText = areCountsLoading
              ? t("loading")
              : hasError
                ? t("error")
                : `${t("household_count", {
                    count: householdCount,
                    formattedCount: formatCount(householdCount),
                  })} · ${t("targeted_member_count", {
                    count: targetedMemberCount,
                    formattedCount: formatCount(targetedMemberCount),
                  })}`;

            return (
              <Column
                key={location.id}
                modifiers={[
                  fillMaxWidth(),
                  clip(Shapes.RoundedCorner(cornersFor(index, displayLocations.length))),
                  background(palette.surface),
                ]}
              >
                <ListItem
                  modifiers={[
                    fillMaxWidth(),
                    defaultMinSize({ minHeight: 72 }),
                    clickable(() =>
                      router.push({
                        pathname: "/account/location/[id]",
                        params: { id: location.villageId ?? "" },
                      }),
                    ),
                  ]}
                  colors={{
                    containerColor: palette.surface,
                    contentColor: palette.textPrimary,
                    trailingContentColor: palette.textSecondary,
                  }}
                >
                  <ListItem.HeadlineContent>
                    <Row verticalAlignment="center" horizontalArrangement={{ spacedBy: 8 }}>
                      <JCText
                        style={{ typography: "bodyLarge" }}
                        color={palette.textPrimary}
                        maxLines={1}
                        overflow="ellipsis"
                      >
                        {locationName}
                      </JCText>
                      {isActive ? (
                        <JCText
                          style={{ typography: "labelSmall", fontWeight: "600" }}
                          color="#15803d"
                        >
                          {t("active")}
                        </JCText>
                      ) : null}
                    </Row>
                  </ListItem.HeadlineContent>
                  <ListItem.SupportingContent>
                    <JCText
                      style={{ typography: "bodySmall" }}
                      color={hasError ? palette.danger : palette.textSecondary}
                      maxLines={1}
                      overflow="ellipsis"
                    >
                      {supportingText}
                    </JCText>
                  </ListItem.SupportingContent>
                  <ListItem.TrailingContent>
                    <Icon
                      source={ICON_CHEVRON_RIGHT}
                      tint={palette.iconMuted}
                      size={ACCOUNT_CARET_SIZE}
                    />
                  </ListItem.TrailingContent>
                </ListItem>
              </Column>
            );
          })
        )}
      </Column>
    </Host>
  );
}

function countLabel(state: CountState, loadingLabel: string, errorLabel: string) {
  if (state.count !== null) return formatCount(state.count);
  return state.isError ? errorLabel : loadingLabel;
}

function activeCountLabel(
  state: ActiveCountState,
  loadingLabel: string,
  errorLabel: string,
  formatActiveCount: (value: number) => string,
) {
  if (state.activeCount !== null) return formatActiveCount(state.activeCount);
  return state.isError ? errorLabel : loadingLabel;
}

function AndroidSyncedLocations({ palette }: { palette: Palette }) {
  const router = useRouter();
  const { t } = useTranslation();
  const counts = useSyncedLocationCounts();
  const stats = [
    {
      label: t("regions"),
      state: counts.regions,
      onPress: () => router.push("/account/synced-locations/regions"),
    },
    {
      label: t("districts"),
      state: counts.districts,
      onPress: () => router.push("/account/synced-locations/districts"),
    },
    {
      label: t("wards"),
      state: counts.wards,
      onPress: () => router.push("/account/synced-locations/wards"),
    },
    {
      label: t("villages"),
      state: counts.villages,
      onPress: () => router.push("/account/synced-locations/villages"),
    },
  ];

  return (
    <Host matchContents={{ vertical: true }} style={{ width: "100%" }}>
      <Column modifiers={[fillMaxWidth()]} verticalArrangement={{ spacedBy: 2 }}>
        {stats.map((item, index) => (
          <Column
            key={item.label}
            modifiers={[
              fillMaxWidth(),
              clip(Shapes.RoundedCorner(cornersFor(index, stats.length))),
              background(palette.surface),
            ]}
          >
            <ListItem
              modifiers={[
                fillMaxWidth(),
                defaultMinSize({ minHeight: 72 }),
                clickable(item.onPress),
              ]}
              colors={{
                containerColor: palette.surface,
                contentColor: palette.textPrimary,
                trailingContentColor: palette.textSecondary,
              }}
            >
              <ListItem.HeadlineContent>
                <JCText style={{ typography: "bodyLarge" }} color={palette.textPrimary}>
                  {item.label}
                </JCText>
              </ListItem.HeadlineContent>
              <ListItem.TrailingContent>
                <Row verticalAlignment="center" horizontalArrangement={{ spacedBy: 6 }}>
                  <JCText
                    style={{ typography: "labelLarge", fontWeight: "500" }}
                    color={item.state.isError ? palette.danger : palette.textSecondary}
                  >
                    {countLabel(item.state, t("loading"), t("error"))}
                  </JCText>
                  <Icon
                    source={ICON_CHEVRON_RIGHT}
                    tint={palette.iconMuted}
                    size={ACCOUNT_CARET_SIZE}
                  />
                </Row>
              </ListItem.TrailingContent>
            </ListItem>
          </Column>
        ))}
      </Column>
    </Host>
  );
}

function AndroidSyncedGrievances({ palette }: { palette: Palette }) {
  const router = useRouter();
  const { t } = useTranslation();
  const counts = useSyncedGrievanceCounts();
  const stats = [
    {
      label: t("categories"),
      state: counts.categories,
      onPress: () => router.push("/account/synced-grievance-setup/categories"),
    },
    {
      label: t("types"),
      state: counts.types,
      onPress: () => router.push("/account/synced-grievance-setup/types"),
    },
    {
      label: t("channels"),
      state: counts.channels,
      onPress: () => router.push("/account/synced-grievance-setup/channels"),
    },
  ];

  return (
    <Host matchContents={{ vertical: true }} style={{ width: "100%" }}>
      <Column modifiers={[fillMaxWidth()]} verticalArrangement={{ spacedBy: 2 }}>
        {stats.map((item, index) => (
          <Column
            key={item.label}
            modifiers={[
              fillMaxWidth(),
              clip(Shapes.RoundedCorner(cornersFor(index, stats.length))),
              background(palette.surface),
            ]}
          >
            <ListItem
              modifiers={[
                fillMaxWidth(),
                defaultMinSize({ minHeight: 72 }),
                clickable(item.onPress),
              ]}
              colors={{
                containerColor: palette.surface,
                contentColor: palette.textPrimary,
                trailingContentColor: palette.textSecondary,
              }}
            >
              <ListItem.HeadlineContent>
                <JCText style={{ typography: "bodyLarge" }} color={palette.textPrimary}>
                  {item.label}
                </JCText>
              </ListItem.HeadlineContent>
              <ListItem.SupportingContent>
                <JCText
                  style={{ typography: "bodySmall" }}
                  color={item.state.isError ? palette.danger : palette.textSecondary}
                >
                  {activeCountLabel(item.state, t("loading"), t("error"), (value) =>
                    t("active_count", {
                      count: value,
                      formattedCount: formatCount(value),
                    }),
                  )}
                </JCText>
              </ListItem.SupportingContent>
              <ListItem.TrailingContent>
                <Row verticalAlignment="center" horizontalArrangement={{ spacedBy: 6 }}>
                  <JCText
                    style={{ typography: "labelLarge", fontWeight: "500" }}
                    color={item.state.isError ? palette.danger : palette.textSecondary}
                  >
                    {countLabel(item.state, t("loading"), t("error"))}
                  </JCText>
                  <Icon
                    source={ICON_CHEVRON_RIGHT}
                    tint={palette.iconMuted}
                    size={ACCOUNT_CARET_SIZE}
                  />
                </Row>
              </ListItem.TrailingContent>
            </ListItem>
          </Column>
        ))}
      </Column>
    </Host>
  );
}

function AndroidAccountPreferences({ palette }: { palette: Palette }) {
  const nodes = [
    <AccountThemePreference key="theme" />,
    <AccountNotificationPreference key="notification" />,
    <AccountScreenshotPreference key="screenshots" />,
    <AccountBiometricPreference key="biometric" />,
    <AccountLanguagePreference key="language" />,
  ];

  return (
    <View style={{ gap: 2 }}>
      {nodes.map((node, index) => {
        const corners = cornersFor(index, nodes.length);
        return (
          <View
            key={node.key}
            style={{
              borderTopLeftRadius: corners.topStart,
              borderTopRightRadius: corners.topEnd,
              borderBottomLeftRadius: corners.bottomStart,
              borderBottomRightRadius: corners.bottomEnd,
              overflow: "hidden",
              backgroundColor: palette.surface,
            }}
          >
            {node}
          </View>
        );
      })}
    </View>
  );
}
