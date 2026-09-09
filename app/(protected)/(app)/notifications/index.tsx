import {
  BadgeCheck,
  Clock,
  CloudLightning,
  FileText,
  Pin,
  Power,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react-native";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, Text, View } from "react-native";

import SearchInput from "@/src/components/form/search-input";
import { useRowSeparatorStyle } from "@/src/components/ui/list-separator";
import StyledSafeAreaView from "@/src/components/ui/styled-safe-area-view";

type CategoryId = "critical" | "weather" | "policy" | "app";
type FilterId = "all" | "urgent" | "policy" | "updates";

type CategoryStyle = {
  tileBg: string;
  iconColor: string;
  labelColor: string;
};

const CATEGORY_STYLE: Record<CategoryId, CategoryStyle> = {
  critical: { tileBg: "bg-red-600", iconColor: "#ffffff", labelColor: "text-red-700" },
  weather: { tileBg: "bg-amber-100", iconColor: "#b45309", labelColor: "text-amber-700" },
  policy: { tileBg: "bg-purple-100", iconColor: "#7c3aed", labelColor: "text-purple-600" },
  app: { tileBg: "bg-teal-100", iconColor: "#0d9488", labelColor: "text-teal-600" },
};

type PillTone = "info" | "danger" | "solid" | "primary" | "outline";
type PillSize = "sm" | "md";
type PillDefinition = { icon: LucideIcon; label: string; tone: PillTone };

const PILL_STYLE: Record<PillTone, { bg: string; text: string; icon: string }> = {
  info: { bg: "bg-green-50", text: "text-green-900", icon: "#0d542b" },
  danger: { bg: "bg-red-50", text: "text-red-600", icon: "#dc2626" },
  solid: { bg: "bg-white", text: "text-red-600", icon: "#dc2626" },
  primary: {
    bg: "bg-gray-950 dark:bg-white",
    text: "text-gray-50 dark:text-gray-950",
    icon: "#ffffff",
  },
  outline: {
    bg: "bg-gray-100 dark:bg-gray-800",
    text: "text-gray-700 dark:text-gray-200",
    icon: "#6a7282",
  },
};

const PILL_SIZE: Record<PillSize, { container: string; text: string; icon: number }> = {
  sm: { container: "rounded-lg px-2.5 py-1", text: "text-xs font-semibold", icon: 13 },
  md: { container: "rounded-full px-3 py-1", text: "text-sm font-medium", icon: 16 },
};

type Notice = {
  id: string;
  category: CategoryId;
  label: string;
  icon: LucideIcon;
  title: string;
  body?: string;
  time: string;
  unread?: boolean;
  urgent?: boolean;
  pills?: PillDefinition[];
};

const PINNED: Notice = {
  id: "pinned-critical",
  category: "critical",
  label: "CRITICAL · DRILL",
  icon: Power,
  title: "Emergency payment freeze drill — Kibaha DC, 2:00 PM",
  time: "Today",
  urgent: true,
};

// Mock notices. TODO: replace with live notification records.
const TODAY: Notice[] = [
  {
    id: "weather",
    category: "weather",
    label: "WEATHER ALERT",
    icon: CloudLightning,
    title: "Severe weather protocol activated",
    body: "Non-essential field visits after 4 PM are being rescheduled. Review guidance…",
    time: "9h",
    unread: true,
    urgent: true,
  },
  {
    id: "policy",
    category: "policy",
    label: "POLICY UPDATE",
    icon: ShieldCheck,
    title: "Grievance handling policy — revision 4.2",
    time: "",
    unread: true,
    pills: [
      { icon: FileText, label: "PDF", tone: "info" },
      { icon: Clock, label: "Ack by Fri", tone: "danger" },
    ],
  },
  {
    id: "app",
    category: "app",
    label: "APP UPDATE",
    icon: BadgeCheck,
    title: "TASAF staff app v3.8 released",
    time: "3h",
  },
];

const FILTERS: { id: FilterId; labelKey: string; count?: number }[] = [
  { id: "all", labelKey: "all" },
  { id: "urgent", labelKey: "urgent", count: 2 },
  { id: "policy", labelKey: "policy" },
  { id: "updates", labelKey: "updates" },
];

function matchesFilter(notice: Notice, filter: FilterId) {
  if (filter === "all") return true;
  if (filter === "urgent") return Boolean(notice.urgent);
  if (filter === "policy") return notice.category === "policy";
  return notice.category === "app"; // updates
}

function matchesQuery(notice: Notice, query: string) {
  if (!query) return true;
  const haystack = `${notice.title} ${notice.body ?? ""} ${notice.label}`.toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function Pill({
  label,
  icon: Icon,
  tone = "info",
  size = "sm",
  count,
  onPress,
  selected,
}: {
  label: string;
  icon?: LucideIcon;
  tone?: PillTone;
  size?: PillSize;
  count?: number;
  onPress?: () => void;
  selected?: boolean;
}) {
  const style = PILL_STYLE[tone];
  const sizeStyle = PILL_SIZE[size];

  const content = (
    <View
      className={`flex-row items-center gap-1.5 ${sizeStyle.container} ${style.bg} ${
        count ? "pr-1" : ""
      }`}
    >
      {Icon ? <Icon size={sizeStyle.icon} color={style.icon} strokeWidth={2.25} /> : null}
      <Text className={`${sizeStyle.text} ${style.text}`}>{label}</Text>
      {count ? (
        <View className="size-5 items-center justify-center rounded-full bg-red-500">
          <Text className="text-[10px] font-bold text-white">{count}</Text>
        </View>
      ) : null}
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected }}>
      {content}
    </Pressable>
  );
}

function NoticePill({ pill }: { pill: PillDefinition }) {
  return <Pill icon={pill.icon} label={pill.label} tone={pill.tone} />;
}

function NoticeCard({ notice, last }: { notice: Notice; last?: boolean }) {
  const style = CATEGORY_STYLE[notice.category];
  const Icon = notice.icon;
  const rowSeparatorStyle = useRowSeparatorStyle("bottom");

  return (
    <View style={last ? undefined : rowSeparatorStyle}>
      <View className="flex-row gap-3 px-4 py-4">
        <View className={`size-12 items-center justify-center rounded-2xl ${style.tileBg}`}>
          <Icon size={22} color={style.iconColor} strokeWidth={2.25} />
        </View>

        <View className="min-w-0 flex-1 gap-1">
          <View className="flex-row items-start justify-between gap-2">
            <Text
              className={`flex-1 text-xs font-bold tracking-wide uppercase ${style.labelColor}`}
              numberOfLines={1}
            >
              {notice.label}
            </Text>
            <View className="flex-none flex-row items-center gap-1.5 pt-0.5">
              {notice.time ? (
                <Text className="text-xs text-gray-400 dark:text-gray-500">{notice.time}</Text>
              ) : null}
              {notice.unread ? <View className="size-2 rounded-full bg-green-600" /> : null}
            </View>
          </View>

          <Text className="text-base font-bold text-gray-950 dark:text-gray-50">
            {notice.title}
          </Text>

          {notice.body ? (
            <Text className="text-sm leading-5 text-gray-500 dark:text-gray-300" numberOfLines={2}>
              {notice.body}
            </Text>
          ) : null}

          {notice.pills?.length ? (
            <View className="mt-1 flex-row flex-wrap gap-2">
              {notice.pills.map((pill) => (
                <NoticePill key={pill.label} pill={pill} />
              ))}
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function PinnedCard({ notice }: { notice: Notice }) {
  const { t } = useTranslation();
  const Icon = notice.icon;

  return (
    <View className="gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
      <View className="flex-row gap-3">
        <View className="size-12 items-center justify-center rounded-2xl bg-red-600">
          <Icon size={22} color="#ffffff" strokeWidth={2.25} />
        </View>

        <View className="min-w-0 flex-1 gap-1">
          <View className="flex-row items-start justify-between gap-2">
            <Text className="flex-1 text-xs font-bold tracking-wide text-red-700 uppercase">
              {notice.label}
            </Text>
            <Text className="flex-none text-xs text-red-400">{notice.time}</Text>
          </View>
          <Text className="text-base font-bold text-gray-950 dark:text-gray-50">
            {notice.title}
          </Text>
        </View>
      </View>

      <View className="flex-row">
        <NoticePill
          pill={{ icon: BadgeCheck, label: t("acknowledgement_required"), tone: "solid" }}
        />
      </View>
    </View>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <Text className="text-sm font-medium text-gray-950 dark:text-gray-50">{children}</Text>;
}

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<FilterId>("all");
  const [query, setQuery] = useState("");

  const showPinned = (filter === "all" || filter === "urgent") && matchesQuery(PINNED, query);

  const todayItems = useMemo(
    () => TODAY.filter((notice) => matchesFilter(notice, filter) && matchesQuery(notice, query)),
    [filter, query],
  );

  return (
    <StyledSafeAreaView edges={["bottom"]} className="flex-1 bg-white dark:bg-gray-950">
      <ScrollView contentContainerClassName="gap-6 pb-8">
        {/* ── Search + filters ── */}
        <View className="gap-4 px-4 pt-4">
          {/* Search */}
          <SearchInput
            value={query}
            onChangeText={setQuery}
            placeholder={t("search_notices")}
            className="py-3"
          />

          {/* Filters */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-2"
          >
            {FILTERS.map((item) => {
              const active = item.id === filter;
              return (
                <Pill
                  key={item.id}
                  label={t(item.labelKey)}
                  tone={active ? "primary" : "outline"}
                  size="md"
                  count={item.count}
                  selected={active}
                  onPress={() => setFilter(item.id)}
                />
              );
            })}
          </ScrollView>
        </View>

        {/* ── Pinned ── */}
        {showPinned ? (
          <View className="gap-3 px-4">
            <View className="flex-row items-center gap-2">
              <Pin size={13} color="#9ca3af" />
              <SectionLabel>{t("pinned")}</SectionLabel>
            </View>
            <PinnedCard notice={PINNED} />
          </View>
        ) : null}

        {/* ── Today ── */}
        <View className="gap-3">
          <View className="flex-row items-center justify-between px-4">
            <SectionLabel>{t("today")}</SectionLabel>
            <Pressable accessibilityRole="button">
              <Text className="text-sm font-semibold text-green-900">{t("mark_all_read")}</Text>
            </Pressable>
          </View>

          {todayItems.length > 0 ? (
            <View>
              {todayItems.map((notice, index) => (
                <NoticeCard
                  key={notice.id}
                  notice={notice}
                  last={index === todayItems.length - 1}
                />
              ))}
            </View>
          ) : (
            <Text className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
              {t("no_item_found")}
            </Text>
          )}
        </View>
      </ScrollView>
    </StyledSafeAreaView>
  );
}
