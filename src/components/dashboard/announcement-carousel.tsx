import { BlurTargetView, BlurView as RNBlurView } from "expo-blur";
import { Image } from "expo-image";
import { BellRing, CalendarDays, CloudDownload } from "lucide-react-native";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { withUniwind } from "uniwind";

const CARD_GAP = 12;
const SCREEN_PADDING = 32;
const BlurView = withUniwind(RNBlurView);
const ANNOUNCEMENT_BACKGROUND = require("@/assets/images/announcement-carousel-background.png");

const ANNOUNCEMENTS = [
  {
    id: "payment-window",
    title: "announcement_payment_window_title",
    description: "announcement_payment_window_description",
    meta: "announcement_payment_window_meta",
    icon: CalendarDays,
  },
  {
    id: "training-materials",
    title: "announcement_training_title",
    description: "announcement_training_description",
    meta: "announcement_training_meta",
    icon: BellRing,
  },
  {
    id: "offline-sync",
    title: "announcement_sync_title",
    description: "announcement_sync_description",
    meta: "announcement_sync_meta",
    icon: CloudDownload,
  },
];

type Announcement = (typeof ANNOUNCEMENTS)[number];

type AnnouncementCardProps = {
  announcement: Announcement;
  cardWidth: number;
};

function AnnouncementCard({ announcement, cardWidth }: AnnouncementCardProps) {
  const { t } = useTranslation();
  const blurTargetRef = useRef<View>(null);
  const Icon = announcement.icon;

  return (
    <View
      style={{ width: cardWidth, backgroundColor: "#0d542b" }}
      className="min-h-36 overflow-hidden rounded-3xl"
    >
      <BlurTargetView ref={blurTargetRef} pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Image
          source={ANNOUNCEMENT_BACKGROUND}
          contentFit="cover"
          contentPosition="bottom right"
          style={StyleSheet.absoluteFill}
        />
      </BlurTargetView>

      <View className="min-h-36 justify-between p-4" style={{ zIndex: 1, elevation: 1 }}>
        <View className="flex-row items-start justify-between gap-3">
          <View className="size-10 items-center justify-center rounded-xl bg-green-700">
            <Icon size={20} color="#ffffff" />
          </View>

          <BlurView
            blurTarget={blurTargetRef}
            intensity={34}
            tint="dark"
            blurMethod="dimezisBlurViewSdk31Plus"
            className="overflow-hidden rounded-full bg-black/25"
          >
            <Text className="px-3 py-1 text-xs font-medium text-white">{t(announcement.meta)}</Text>
          </BlurView>
        </View>

        <View className="mt-8 gap-1">
          <Text className="text-lg font-semibold text-white">{t(announcement.title)}</Text>
          <Text className="text-sm leading-5 text-green-100">{t(announcement.description)}</Text>
        </View>
      </View>
    </View>
  );
}

export default function AnnouncementCarousel() {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const cardWidth = Math.max(width - SCREEN_PADDING, 280);
  const snapInterval = cardWidth + CARD_GAP;

  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / snapInterval);
    setActiveIndex(Math.max(0, Math.min(ANNOUNCEMENTS.length - 1, nextIndex)));
  };

  const handleDotPress = (index: number) => {
    setActiveIndex(index);
    scrollRef.current?.scrollTo({ x: index * snapInterval, animated: true });
  };

  return (
    <View className="gap-3">
      <ScrollView
        ref={scrollRef}
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        disableIntervalMomentum
        snapToAlignment="start"
        snapToInterval={snapInterval}
        contentContainerClassName="gap-3"
        onMomentumScrollEnd={handleScrollEnd}
      >
        {ANNOUNCEMENTS.map((announcement) => (
          <AnnouncementCard
            key={announcement.id}
            announcement={announcement}
            cardWidth={cardWidth}
          />
        ))}
      </ScrollView>

      <View className="flex-row justify-end gap-2">
        {ANNOUNCEMENTS.map((announcement, index) => (
          <Pressable
            key={announcement.id}
            accessibilityLabel={`${t("organization_announcements")} ${index + 1}`}
            accessibilityRole="button"
            accessibilityState={{ selected: activeIndex === index }}
            onPress={() => handleDotPress(index)}
            className="size-6 items-center justify-center"
          >
            <View
              className={
                activeIndex === index
                  ? "h-2 w-5 rounded-full bg-green-700"
                  : "size-2 rounded-full bg-gray-300 dark:bg-gray-600"
              }
            />
          </Pressable>
        ))}
      </View>
    </View>
  );
}
