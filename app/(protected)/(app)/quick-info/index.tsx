import { Home, TrendingUp, UserCheck, Users } from "lucide-react-native";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from "react-native";

import StyledSafeAreaView from "@/src/components/ui/styled-safe-area-view";

// ── Period ────────────────────────────────────────────────────────────────────

type Period = "1d" | "1w" | "1m" | "6m" | "year" | "all";

const PERIODS: { key: Period; labelKey: string }[] = [
  { key: "all", labelKey: "all" },
  { key: "1d", labelKey: "period_1d" },
  { key: "1w", labelKey: "period_1w" },
  { key: "1m", labelKey: "period_1m" },
  { key: "6m", labelKey: "period_6m" },
  { key: "year", labelKey: "year" },
];

// ── Mock data ─────────────────────────────────────────────────────────────────

const STATIC = {
  paa: 100,
  households: { targeted: 500_000, enrolled: 334_200 },
  members: {
    targeted: { total: 2_250_000, male: 1_035_000, female: 1_215_000 },
    enrolled: { total: 1_504_000, male: 692_000, female: 812_000 },
  },
};

const PERIOD_ACTIVITY: Record<
  Period,
  {
    households: number;
    members: { total: number; male: number; female: number };
  }
> = {
  "1d": {
    households: 3_800,
    members: { total: 17_100, male: 7_866, female: 9_234 },
  },
  "1w": {
    households: 28_000,
    members: { total: 126_000, male: 57_960, female: 68_040 },
  },
  "1m": {
    households: 115_000,
    members: { total: 517_500, male: 238_050, female: 279_450 },
  },
  "6m": {
    households: 244_000,
    members: { total: 1_098_000, male: 505_080, female: 592_920 },
  },
  year: {
    households: 334_200,
    members: { total: 1_504_000, male: 692_000, female: 812_000 },
  },
  all: {
    households: 500_000,
    members: { total: 2_250_000, male: 1_035_000, female: 1_215_000 },
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

function pct(part: number, total: number): string {
  if (total === 0) return "0%";
  return `${((part / total) * 100).toFixed(1)}%`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Card({ children }: { children: React.ReactNode }) {
  return (
    <View className="gap-4 rounded-2xl bg-white p-4 shadow-xs dark:bg-gray-900">{children}</View>
  );
}

function CardHeader({
  icon,
  title,
  badge,
  badgeColor = "gray",
}: {
  icon: React.ReactNode;
  title: string;
  badge: string;
  badgeColor?: "gray" | "green" | "blue";
}) {
  const bg = {
    gray: "bg-gray-100 dark:bg-gray-800",
    green: "bg-green-50 dark:bg-green-950",
    blue: "bg-blue-50 dark:bg-blue-950",
  }[badgeColor];
  const text = {
    gray: "text-gray-500 dark:text-gray-400",
    green: "text-green-700 dark:text-green-300",
    blue: "text-blue-600 dark:text-blue-300",
  }[badgeColor];
  return (
    <View className="flex-row items-center justify-between">
      <View className="flex-row items-center gap-2">
        {icon}
        <Text className="text-sm font-semibold text-gray-950 dark:text-gray-50">{title}</Text>
      </View>
      <View className={`rounded-md px-2 py-0.5 ${bg}`}>
        <Text className={`text-[10px] font-semibold tracking-wide uppercase ${text}`}>{badge}</Text>
      </View>
    </View>
  );
}

function Divider() {
  return <View className="h-px bg-gray-100 dark:bg-gray-800" />;
}

function GenderBar({ male, female, total }: { male: number; female: number; total: number }) {
  const { t } = useTranslation();
  const maleW = total > 0 ? (male / total) * 100 : 0;
  const femaleW = total > 0 ? (female / total) * 100 : 0;
  return (
    <View className="gap-2">
      <View className="h-2.5 flex-row overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        <View className="h-full rounded-l-full bg-blue-400" style={{ width: `${maleW}%` }} />
        <View className="h-full rounded-r-full bg-rose-400" style={{ width: `${femaleW}%` }} />
      </View>
      <View className="flex-row gap-3">
        <View className="flex-1 flex-row items-center gap-1.5">
          <View className="size-2 rounded-full bg-blue-400" />
          <Text className="text-xs text-gray-500 dark:text-gray-400">{t("male")}</Text>
          <Text className="ml-auto text-xs font-bold text-gray-800 dark:text-gray-200">
            {fmt(male)}
          </Text>
          <Text className="text-[10px] text-gray-400 dark:text-gray-500">{pct(male, total)}</Text>
        </View>
        <View className="flex-1 flex-row items-center gap-1.5">
          <View className="size-2 rounded-full bg-rose-400" />
          <Text className="text-xs text-gray-500 dark:text-gray-400">{t("female")}</Text>
          <Text className="ml-auto text-xs font-bold text-gray-800 dark:text-gray-200">
            {fmt(female)}
          </Text>
          <Text className="text-[10px] text-gray-400 dark:text-gray-500">{pct(female, total)}</Text>
        </View>
      </View>
    </View>
  );
}

function MembersBlock({
  label,
  total,
  male,
  female,
}: {
  label: string;
  total: number;
  male: number;
  female: number;
}) {
  return (
    <View className="gap-2">
      <View className="flex-row items-baseline justify-between">
        <Text className="text-xs font-medium text-gray-600 dark:text-gray-400">{label}</Text>
        <Text className="text-2xl font-bold text-gray-950 dark:text-gray-50">{fmt(total)}</Text>
      </View>
      <GenderBar male={male} female={female} total={total} />
    </View>
  );
}

// ── Screen ───────────────────────────────────────────────────────────────────

export default function QuickInfoScreen() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<Period>("all");
  const isDark = useColorScheme() === "dark";
  const cardIconColor = isDark ? "#f9fafb" : "#030712";

  const activity = PERIOD_ACTIVITY[period];
  const overallRate = (STATIC.households.enrolled / STATIC.households.targeted) * 100;
  const periodLabel = t(PERIODS.find((p) => p.key === period)!.labelKey);

  return (
    <StyledSafeAreaView edges={["bottom"]} className="flex-1 bg-gray-100 dark:bg-gray-950">
      {/* ── Period filter ── */}
      <View className="flex-row items-center gap-1 bg-[#0d542b] px-4 py-2.5">
        {PERIODS.map(({ key, labelKey }, i) => (
          <React.Fragment key={key}>
            {i === 1 && <View className="mx-1 h-4 w-px bg-green-700" />}
            <Pressable
              onPress={() => setPeriod(key)}
              className={`rounded-full px-4 py-1.5 ${period === key ? "bg-white" : "bg-transparent"}`}
            >
              <Text
                className={`text-sm font-semibold ${period === key ? "text-[#0d542b]" : "text-green-300"}`}
              >
                {t(labelKey)}
              </Text>
            </Pressable>
          </React.Fragment>
        ))}
      </View>

      <ScrollView contentContainerClassName="gap-4">
        {/* ── Hero ── */}
        <View className="overflow-hidden bg-[#0d542b]">
          <View className="px-4 pt-4">
            <View className="flex-row items-center gap-1.5">
              <TrendingUp size={13} color="#86efac" />
              <Text className="text-xs font-medium text-white">
                {t("overall_program_progress")}
              </Text>
            </View>

            {/* Big rate */}
            <View className="mt-3 flex-row items-end gap-2">
              <Text className="text-6xl leading-none font-bold text-white">
                {overallRate.toFixed(1)}%
              </Text>
              <Text className="mb-1 text-sm text-green-400">{t("enrolled")}</Text>
            </View>

            {/* Overall bar */}
            <View className="mt-2 gap-2.5">
              <View className="h-2 overflow-hidden rounded-full bg-green-700/50">
                <View
                  className="h-full rounded-full bg-green-400"
                  style={{ width: `${overallRate}%` }}
                />
              </View>

              <View className="flex-row justify-between">
                <Text className="text-xs font-normal text-green-100">
                  {t("enrolled_count", {
                    count: STATIC.households.enrolled,
                    formattedCount: fmt(STATIC.households.enrolled),
                  })}
                </Text>
                <Text className="text-xs font-normal text-green-100">
                  {t("targeted_count", {
                    count: STATIC.households.targeted,
                    formattedCount: fmt(STATIC.households.targeted),
                  })}
                </Text>
              </View>
            </View>
          </View>

          <View className="px-4 py-4">
            <View className="bg-green-700" style={{ height: StyleSheet.hairlineWidth }} />
          </View>

          {/* Bottom strip — PAA + Members targeted */}
          <View className="flex-row border-t border-green-900 pb-4">
            <View className="flex-1 gap-0.5 px-4">
              <Text className="text-2xl font-bold text-white">{fmt(STATIC.paa)}</Text>
              <Text className="text-[10px] font-medium tracking-widest text-green-300 uppercase">
                {t("paa_targeted")}
              </Text>
            </View>

            <View className="flex-1 gap-0.5 px-4">
              <Text className="text-2xl font-bold text-white">
                {fmt(STATIC.members.targeted.total)}
              </Text>
              <Text className="text-[10px] font-medium tracking-widest text-green-300 uppercase">
                {t("members_targeted")}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Cards ── */}
        <View className="gap-4 px-4 pb-4">
          {/* ── PAA Targeted ── */}
          <Card>
            <CardHeader
              icon={<Users size={14} color={cardIconColor} />}
              title={t("paa_targeted")}
              badge={t("all_time")}
              badgeColor="gray"
            />
            <View className="flex-row items-end justify-between">
              <Text className="text-5xl font-bold text-gray-950 dark:text-gray-50">
                {fmt(STATIC.paa)}
              </Text>
              <Text className="mb-1 text-xs text-gray-500 dark:text-gray-400">
                {t("program_area_agents")}
              </Text>
            </View>
          </Card>

          {/* ── Households Targeted ── */}
          <Card>
            <CardHeader
              icon={<Home size={14} color={cardIconColor} />}
              title={t("households_targeted")}
              badge={t("all_time")}
              badgeColor="green"
            />
            <View className="flex-row items-end justify-between">
              <Text className="text-5xl font-bold text-gray-950 dark:text-gray-50">
                {fmt(STATIC.households.targeted)}
              </Text>
              <Text className="mb-1 text-xs text-gray-400 dark:text-gray-500">
                {t("households")}
              </Text>
            </View>

            <Divider />

            <MembersBlock
              label={t("members")}
              total={STATIC.members.targeted.total}
              male={STATIC.members.targeted.male}
              female={STATIC.members.targeted.female}
            />
          </Card>

          {/* ── Households Enrolled ── */}
          <Card>
            <CardHeader
              icon={<UserCheck size={14} color={cardIconColor} />}
              title={t("households_enrolled")}
              badge={periodLabel}
              badgeColor="blue"
            />

            {/* Period enrolled */}
            <View className="flex-row items-end justify-between">
              <Text className="text-5xl font-bold text-gray-950 dark:text-gray-50">
                {fmt(activity.households)}
              </Text>
              <View className="mb-1 items-end gap-0.5">
                <Text className="text-xs text-gray-400 dark:text-gray-500">{t("households")}</Text>
                <Text className="text-xs font-semibold text-blue-500 dark:text-blue-400">
                  {t("of_targeted", {
                    value: pct(activity.households, STATIC.households.targeted),
                  })}
                </Text>
              </View>
            </View>

            <Divider />

            <MembersBlock
              label={t("members")}
              total={activity.members.total}
              male={activity.members.male}
              female={activity.members.female}
            />

            {/* Cumulative footnote */}
            <View className="flex-row items-center justify-between rounded-xl bg-gray-50 px-3 py-2 dark:bg-gray-800">
              <Text className="text-xs text-gray-600 dark:text-gray-400">
                {t("cumulative_enrolled")}
              </Text>
              <Text className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                {t("cumulative_enrolled_value", {
                  households: fmt(STATIC.households.enrolled),
                  members: fmt(STATIC.members.enrolled.total),
                })}
              </Text>
            </View>
          </Card>
        </View>
      </ScrollView>
    </StyledSafeAreaView>
  );
}
