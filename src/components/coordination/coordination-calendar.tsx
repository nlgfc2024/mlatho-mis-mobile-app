import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  Extrapolation,
  FadeIn,
  FadeOut,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import { activityTypeColor } from "@/src/components/coordination/coordination-visuals";
import {
  getActivitiesForDate,
  getMonthGridDates,
  getWeekDates,
  parseCalendarDate,
  toCalendarDate,
  type CoordinationActivity,
  type CoordinationCalendarView,
} from "@/src/data/coordination";

const WEEKDAY_KEYS = [
  "calendar_sun_short",
  "calendar_mon_short",
  "calendar_tue_short",
  "calendar_wed_short",
  "calendar_thu_short",
  "calendar_fri_short",
  "calendar_sat_short",
];

function DateIndicators({
  activities,
  inverted = false,
}: {
  activities: CoordinationActivity[];
  inverted?: boolean;
}) {
  const visible = activities.slice(0, 3);
  return (
    <View className="h-3 flex-row items-center justify-center gap-0.5">
      {visible.map((activity) => (
        <View
          key={activity.id}
          className="size-1.5 rounded-full"
          style={{ backgroundColor: activityTypeColor[activity.type] }}
        />
      ))}
      {activities.length > 3 ? (
        <Text
          selectable
          className={
            inverted
              ? "text-[8px] font-bold text-white"
              : "text-[8px] font-bold text-gray-500 dark:text-gray-300"
          }
        >
          +{activities.length - 3}
        </Text>
      ) : null}
    </View>
  );
}

function MonthCalendar({
  anchor,
  selectedDate,
  activities,
  onSelectDate,
  onSwipeMonth,
}: Omit<CoordinationCalendarProps, "view">) {
  const { t } = useTranslation();
  const dates = getMonthGridDates(anchor);
  const anchorMonth = parseCalendarDate(anchor).getMonth();
  const today = toCalendarDate(new Date());
  const weeks = Array.from({ length: 6 }, (_, index) => dates.slice(index * 7, index * 7 + 7));
  const dragX = useSharedValue(0);
  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-24, 24])
    .failOffsetY([-20, 20])
    .onUpdate((event) => {
      dragX.value = Math.max(-96, Math.min(96, event.translationX * 0.42));
    })
    .onEnd((event) => {
      const isDeliberateSwipe =
        Math.abs(event.translationX) >= 56 || Math.abs(event.velocityX) >= 700;
      if (isDeliberateSwipe) {
        const direction = event.translationX < 0 ? 1 : -1;
        runOnJS(onSwipeMonth)(direction);
        dragX.value = direction > 0 ? 72 : -72;
      }
      dragX.value = withDelay(
        16,
        withTiming(0, {
          duration: 190,
          easing: Easing.out(Easing.cubic),
        }),
      );
    });
  const animatedGridStyle = useAnimatedStyle(() => {
    const distance = Math.abs(dragX.value);
    return {
      opacity: interpolate(distance, [0, 96], [1, 0.78], Extrapolation.CLAMP),
      transform: [
        { translateX: dragX.value },
        { scale: interpolate(distance, [0, 96], [1, 0.985], Extrapolation.CLAMP) },
      ],
    };
  });

  return (
    <GestureDetector gesture={swipeGesture}>
      <View className="flex-1">
        <View className="flex-row pb-2">
          {WEEKDAY_KEYS.map((key) => (
            <Text
              selectable
              key={key}
              className="flex-1 text-center text-[11px] font-semibold text-gray-400 dark:text-gray-500"
            >
              {t(key)}
            </Text>
          ))}
        </View>
        <Animated.View
          style={animatedGridStyle}
          className="flex-1 gap-2"
        >
          {weeks.map((week) => (
            <View key={week[0]} className="flex-1 flex-row gap-2">
              {week.map((date) => {
                const dayActivities = getActivitiesForDate(activities, date);
                const parsed = parseCalendarDate(date);
                const isToday = date === today;
                const inMonth = parsed.getMonth() === anchorMonth;
                const selected = inMonth && date === selectedDate;
                return (
                  <Pressable
                    key={date}
                    accessibilityRole="button"
                    accessibilityLabel={`${parsed.toLocaleDateString()}, ${dayActivities.length} activities`}
                    onPress={() => onSelectDate(date)}
                    className={`flex-1 items-center justify-center gap-1 overflow-hidden rounded-xl border-continuous active:opacity-70 ${
                      selected
                        ? "bg-transparent"
                        : isToday
                          ? "bg-green-100 dark:bg-green-950"
                          : "bg-transparent"
                    }`}
                  >
                    {selected ? (
                      <Animated.View
                        pointerEvents="none"
                        entering={FadeIn.duration(180)}
                        exiting={FadeOut.duration(120)}
                        className="absolute inset-0 rounded-xl border-continuous bg-green-900"
                      />
                    ) : null}
                    <Text
                      selectable
                      className={
                        selected
                          ? "text-sm font-bold text-white"
                          : isToday
                            ? "text-sm font-bold text-green-900 dark:text-green-100"
                            : inMonth
                              ? "text-sm font-medium text-gray-900 dark:text-gray-100"
                              : "text-sm text-gray-300 dark:text-gray-700"
                      }
                    >
                      {parsed.getDate()}
                    </Text>
                    <DateIndicators activities={dayActivities} inverted={selected} />
                  </Pressable>
                );
              })}
            </View>
          ))}
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

function WeekCalendar({
  anchor,
  selectedDate,
  activities,
  onSelectDate,
}: Omit<CoordinationCalendarProps, "view">) {
  const dates = getWeekDates(anchor);
  const today = toCalendarDate(new Date());
  return (
    <View className="flex-row gap-2">
      {dates.map((date) => {
        const parsed = parseCalendarDate(date);
        const dayActivities = getActivitiesForDate(activities, date);
        const selected = date === selectedDate;
        const isToday = date === today;
        return (
          <Pressable
            key={date}
            onPress={() => onSelectDate(date)}
            className={
              selected
                ? "flex-1 items-center justify-center gap-3 overflow-hidden rounded-2xl border-continuous bg-transparent px-1 py-6"
                : isToday
                  ? "flex-1 items-center justify-center gap-3 overflow-hidden rounded-2xl border-continuous bg-green-100 px-1 py-6 active:bg-green-200 dark:bg-green-950"
                  : "flex-1 items-center justify-center gap-3 overflow-hidden rounded-2xl border-continuous px-1 py-6 active:bg-gray-50 dark:active:bg-gray-900"
            }
          >
            {selected ? (
              <Animated.View
                pointerEvents="none"
                entering={FadeIn.duration(180)}
                exiting={FadeOut.duration(120)}
                className="absolute inset-0 rounded-2xl border-continuous bg-green-900"
              />
            ) : null}
            <Text
              selectable
              className={
                selected
                  ? "text-xs font-semibold text-green-100"
                  : isToday
                    ? "text-xs font-semibold text-green-800 dark:text-green-200"
                    : "text-xs font-semibold text-gray-400 dark:text-gray-500"
              }
            >
              {parsed.toLocaleDateString(undefined, { weekday: "narrow" })}
            </Text>
            <Text
              selectable
              className={
                selected
                  ? "text-2xl font-bold text-white"
                  : isToday
                    ? "text-2xl font-bold text-green-900 dark:text-green-100"
                    : "text-2xl font-semibold text-gray-900 dark:text-gray-100"
              }
            >
              {parsed.getDate()}
            </Text>
            <DateIndicators activities={dayActivities} inverted={selected} />
            <Text
              selectable
              className={
                selected
                  ? "text-[10px] font-medium text-green-100"
                  : isToday
                    ? "text-[10px] font-semibold text-green-800 dark:text-green-200"
                    : "text-[10px] font-medium text-gray-500 dark:text-gray-400"
              }
            >
              {dayActivities.length}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function DayCalendar({
  selectedDate,
  activities,
  onSelectDate,
}: Omit<CoordinationCalendarProps, "view">) {
  const { t } = useTranslation();
  const parsed = parseCalendarDate(selectedDate);
  const dayActivities = getActivitiesForDate(activities, selectedDate);
  return (
    <Pressable
      onPress={() => onSelectDate(selectedDate)}
      className="items-center justify-center gap-5 overflow-hidden rounded-3xl border-continuous bg-green-900 py-10 active:bg-green-800"
    >
      <Text selectable className="text-sm font-semibold tracking-widest text-green-100 uppercase">
        {parsed.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
      </Text>
      <Text selectable className="text-8xl font-light text-white">
        {parsed.getDate()}
      </Text>
      <Text selectable className="text-xl font-semibold text-white">
        {parsed.toLocaleDateString(undefined, { weekday: "long" })}
      </Text>
      <DateIndicators activities={dayActivities} inverted />
      <Text selectable className="text-sm font-medium text-green-100">
        {t("coordination_activity_count", { count: dayActivities.length })}
      </Text>
    </Pressable>
  );
}

type CoordinationCalendarProps = {
  view: CoordinationCalendarView;
  anchor: string;
  selectedDate: string;
  activities: CoordinationActivity[];
  onSelectDate: (date: string) => void;
  onSwipeMonth: (direction: -1 | 1) => void;
};

export default function CoordinationCalendar(props: CoordinationCalendarProps) {
  const content =
    props.view === "month" ? (
      <MonthCalendar {...props} />
    ) : props.view === "week" ? (
      <WeekCalendar {...props} />
    ) : (
      <DayCalendar {...props} />
    );

  return (
    <Animated.View
      key={props.view}
      entering={FadeIn.duration(220)}
      exiting={FadeOut.duration(120)}
      className={props.view === "month" ? "flex-1" : "flex-none"}
    >
      {content}
    </Animated.View>
  );
}
