import * as Haptics from "expo-haptics";
import { useLocalSearchParams } from "expo-router";
import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Filter,
  ShieldCheck,
} from "lucide-react-native";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { FadeInDown } from "react-native-reanimated";

import CoordinationCalendar from "@/src/components/coordination/coordination-calendar";
import CoordinationDateSheet from "@/src/components/coordination/coordination-date-sheet";
import CoordinationFilterSheet from "@/src/components/coordination/coordination-filter-sheet";
import {
  activityTypeColor,
  activityTypeLabelKey,
} from "@/src/components/coordination/coordination-visuals";
import SegmentedPicker from "@/src/components/form/segmented-picker";
import StyledSafeAreaView from "@/src/components/ui/styled-safe-area-view";
import {
  coordinationActivities,
  countActiveCoordinationFilters,
  emptyCoordinationFilters,
  filterCoordinationActivities,
  getActivitiesForDate,
  getVisibleCoordinationActivities,
  getWeekDates,
  parseCalendarDate,
  shiftCalendarAnchor,
  toCalendarDate,
  type CoordinationActivityType,
  type CoordinationCalendarView,
  type CoordinationFilters,
  type CoordinationUserContext,
} from "@/src/data/coordination";
import { useSession } from "@/src/providers/session-context";

const CALENDAR_VIEWS: CoordinationCalendarView[] = ["day", "week", "month"];
const ACTIVITY_TYPES: CoordinationActivityType[] = [
  "communication",
  "training",
  "departmental",
];

function normalizeParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function optionalString(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  return String(value);
}

function selectionFeedback() {
  if (process.env.EXPO_OS === "ios") void Haptics.selectionAsync();
}

function getCalendarTitle(view: CoordinationCalendarView, anchor: string) {
  const parsed = parseCalendarDate(anchor);
  if (view === "month") {
    return parsed.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  }
  if (view === "week") {
    const dates = getWeekDates(anchor);
    const start = parseCalendarDate(dates[0]);
    const end = parseCalendarDate(dates[6]);
    if (start.getMonth() === end.getMonth()) {
      return `${start.toLocaleDateString(undefined, { month: "long" })} ${start.getDate()}–${end.getDate()}, ${end.getFullYear()}`;
    }
    return `${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
  }
  return parsed.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function CoordinationScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ type?: string | string[] }>();
  const { activeRole, user } = useSession();
  const today = toCalendarDate(new Date());
  const [view, setView] = useState<CoordinationCalendarView>("month");
  const [anchor, setAnchor] = useState(today);
  const [selectedDate, setSelectedDate] = useState(today);
  const requestedType = normalizeParam(params.type);
  const initialType = ACTIVITY_TYPES.includes(requestedType as CoordinationActivityType)
    ? (requestedType as CoordinationActivityType)
    : null;
  const [filters, setFilters] = useState<CoordinationFilters>(() => ({
    ...emptyCoordinationFilters,
    type: initialType,
  }));
  const [filterOpen, setFilterOpen] = useState(false);
  const [dateSheetOpen, setDateSheetOpen] = useState(false);

  const sessionUser = user as
    | (typeof user & {
        department?: string | null;
        regionId?: string | number | null;
        districtId?: string | number | null;
        wardId?: string | number | null;
        villageId?: string | number | null;
      })
    | null;
  const userContext: CoordinationUserContext = useMemo(
    () => ({
      userId: optionalString(sessionUser?.id),
      roleName: activeRole?.name ?? null,
      department: sessionUser?.department ?? null,
      regionId: optionalString(sessionUser?.regionId),
      districtId: optionalString(sessionUser?.districtId),
      wardId: optionalString(sessionUser?.wardId),
      villageId: optionalString(sessionUser?.villageId),
    }),
    [
      activeRole?.name,
      sessionUser?.department,
      sessionUser?.districtId,
      sessionUser?.id,
      sessionUser?.regionId,
      sessionUser?.villageId,
      sessionUser?.wardId,
    ],
  );

  const visibleActivities = useMemo(
    () => getVisibleCoordinationActivities(userContext, coordinationActivities),
    [userContext],
  );
  const filteredActivities = useMemo(
    () => filterCoordinationActivities(visibleActivities, filters),
    [filters, visibleActivities],
  );
  const selectedActivities = useMemo(
    () => getActivitiesForDate(filteredActivities, selectedDate),
    [filteredActivities, selectedDate],
  );
  const activeFilterCount = countActiveCoordinationFilters(filters);
  const calendarTitle = getCalendarTitle(view, anchor);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StyledSafeAreaView edges={["bottom"]} className="flex-1 bg-white dark:bg-gray-950">
      <Animated.View
        entering={FadeInDown.duration(240).delay(120)}
        className="w-full flex-row items-center gap-2 bg-blue-100 px-4 py-3"
      >
        <ShieldCheck size={18} color="#1d4ed8" />
        <Text selectable className="flex-1 text-xs font-medium text-blue-900">
          {t("coordination_scope_notice")}
        </Text>
      </Animated.View>

      <View className="flex-1 pt-3">
        <View className="mx-auto w-full max-w-5xl gap-3 px-3 pb-3 md:px-8">
          <View className="flex-row items-center justify-between gap-3">
            <View className="flex-row items-center gap-2">
              <CalendarRange size={20} color="#0d542b" />
              <Animated.Text
                key={calendarTitle}
                entering={FadeInDown.duration(180)}
                selectable
                className="flex-shrink text-base font-semibold text-gray-950 dark:text-gray-50"
              >
                {calendarTitle}
              </Animated.Text>
            </View>
            <Pressable
              onPress={() => setFilterOpen(true)}
              className="relative rounded-full bg-gray-100 p-2.5 active:bg-gray-200 dark:bg-gray-800 dark:active:bg-gray-700"
            >
              <Filter size={18} color="#6a7282" />
              {activeFilterCount > 0 ? (
                <View className="absolute -top-1 -right-1 min-w-4 items-center rounded-full bg-green-900 px-1">
                  <Text selectable className="text-[10px] font-bold text-white">
                    {activeFilterCount}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          </View>

          <SegmentedPicker
            options={CALENDAR_VIEWS.map((option) => t(`calendar_view_${option}`))}
            selectedIndex={CALENDAR_VIEWS.indexOf(view)}
            onOptionSelected={(index) => {
              selectionFeedback();
              const nextView = CALENDAR_VIEWS[index];
              if (nextView !== "month") setSelectedDate(anchor);
              setView(nextView);
            }}
            fullWidth
          />

          <View className="flex-row items-center justify-between">
            <Pressable
              accessibilityLabel={t("previous_period")}
              onPress={() => {
                selectionFeedback();
                const next = shiftCalendarAnchor(anchor, view, -1);
                setAnchor(next);
                if (view !== "month") setSelectedDate(next);
              }}
              className="rounded-full p-2.5 active:bg-gray-100 dark:active:bg-gray-800"
            >
              <ChevronLeft size={18} color="#6a7282" />
            </Pressable>
            <Pressable
              onPress={() => {
                selectionFeedback();
                setAnchor(today);
                setSelectedDate(today);
              }}
              className="rounded-full px-4 py-2 active:bg-green-50 dark:active:bg-green-950"
            >
              <Text selectable className="text-xs font-semibold text-green-900 dark:text-green-100">
                {t("today")}
              </Text>
            </Pressable>
            <Pressable
              accessibilityLabel={t("next_period")}
              onPress={() => {
                selectionFeedback();
                const next = shiftCalendarAnchor(anchor, view, 1);
                setAnchor(next);
                if (view !== "month") setSelectedDate(next);
              }}
              className="rounded-full p-2.5 active:bg-gray-100 dark:active:bg-gray-800"
            >
              <ChevronRight size={18} color="#6a7282" />
            </Pressable>
          </View>
        </View>

        <View
          className={
            view === "month"
              ? "w-full flex-1 px-3 md:px-8"
              : "w-full flex-none px-3 md:px-8"
          }
        >
          <CoordinationCalendar
            view={view}
            anchor={anchor}
            selectedDate={selectedDate}
            activities={filteredActivities}
            onSelectDate={(date) => {
              selectionFeedback();
              setSelectedDate(date);
              setAnchor(date);
              setDateSheetOpen(true);
            }}
            onSwipeMonth={(direction) => {
              selectionFeedback();
              const next = shiftCalendarAnchor(anchor, "month", direction);
              setAnchor(next);
            }}
          />
        </View>

        <View className="w-full flex-row flex-wrap justify-start gap-x-4 gap-y-1 px-3 py-2 md:px-8">
          {ACTIVITY_TYPES.map((type) => (
            <View key={type} className="flex-row items-center gap-1.5">
              <View
                className="size-2 rounded-full"
                style={{ backgroundColor: activityTypeColor[type] }}
              />
              <Text selectable className="text-[11px] text-gray-500 dark:text-gray-400">
                {t(activityTypeLabelKey[type])}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <CoordinationFilterSheet
        visible={filterOpen}
        filters={filters}
        onApply={setFilters}
        onClose={() => setFilterOpen(false)}
      />
      <CoordinationDateSheet
        visible={dateSheetOpen}
        date={selectedDate}
        activities={selectedActivities}
        onClose={() => setDateSheetOpen(false)}
      />
      </StyledSafeAreaView>
    </GestureHandlerRootView>
  );
}
