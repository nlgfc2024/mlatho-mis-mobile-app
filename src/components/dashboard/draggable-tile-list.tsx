/* eslint-disable react-hooks/immutability -- Reanimated shared values are intentionally mutated via `.value` inside gesture worklets. */
import { Host, Switch } from "@expo/ui/jetpack-compose";
import { BlurView } from "expo-blur";
import { GripVertical } from "lucide-react-native";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, useColorScheme, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { MODULE_TILE_BY_ID, type ModuleTileId } from "./module-tiles";

const ROW_BODY_HEIGHT = 52;
const ROW_GAP = 8;
const ROW_HEIGHT = ROW_BODY_HEIGHT + ROW_GAP;
const DARK_ICON_BLUR_INTENSITY = 60;

const styles = StyleSheet.create({
  darkIconContainer: {
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    borderRadius: 12,
    height: 40,
    justifyContent: "center",
    overflow: "hidden",
    width: 40,
  },
});

type Positions = Record<string, number>;

function buildPositions(order: ModuleTileId[]): Positions {
  return order.reduce<Positions>((acc, id, index) => {
    acc[id] = index;
    return acc;
  }, {});
}

function clamp(value: number, min: number, max: number) {
  "worklet";
  return Math.min(Math.max(value, min), max);
}

/** Shift every position between the old and new slot to make room for the dragged row. */
function reorderPositions(
  positions: Positions,
  activeId: ModuleTileId,
  newIndex: number,
): Positions {
  "worklet";
  const oldIndex = positions[activeId];
  if (newIndex === oldIndex) return positions;

  const next: Positions = { ...positions };
  for (const key in positions) {
    if (key === activeId) {
      next[key] = newIndex;
    } else if (newIndex > oldIndex && positions[key] > oldIndex && positions[key] <= newIndex) {
      next[key] = positions[key] - 1;
    } else if (newIndex < oldIndex && positions[key] < oldIndex && positions[key] >= newIndex) {
      next[key] = positions[key] + 1;
    }
  }
  return next;
}

type DraggableTileListProps = {
  order: ModuleTileId[];
  hidden: ModuleTileId[];
  onReorder: (order: ModuleTileId[]) => void;
  onToggle: (id: ModuleTileId) => void;
};

export default function DraggableTileList({
  order,
  hidden,
  onReorder,
  onToggle,
}: DraggableTileListProps) {
  const positions = useSharedValue<Positions>(buildPositions(order));
  const activeId = useSharedValue<string | null>(null);
  const dragY = useSharedValue(0);
  const startY = useSharedValue(0);

  // Keep the shared positions in sync when the order changes externally (reset).
  useEffect(() => {
    positions.value = buildPositions(order);
  }, [order, positions]);

  const commit = (next: Positions) => {
    const ids = (Object.keys(next) as ModuleTileId[]).sort((a, b) => next[a] - next[b]);
    onReorder(ids);
  };

  return (
    <View style={{ height: Math.max(order.length * ROW_HEIGHT - ROW_GAP, 0) }}>
      {order.map((id) => (
        <DraggableRow
          key={id}
          id={id}
          count={order.length}
          positions={positions}
          activeId={activeId}
          dragY={dragY}
          startY={startY}
          isVisible={!hidden.includes(id)}
          onToggle={onToggle}
          onCommit={commit}
        />
      ))}
    </View>
  );
}

function DraggableRow({
  id,
  count,
  positions,
  activeId,
  dragY,
  startY,
  isVisible,
  onToggle,
  onCommit,
}: {
  id: ModuleTileId;
  count: number;
  positions: SharedValue<Positions>;
  activeId: SharedValue<string | null>;
  dragY: SharedValue<number>;
  startY: SharedValue<number>;
  isVisible: boolean;
  onToggle: (id: ModuleTileId) => void;
  onCommit: (positions: Positions) => void;
}) {
  const { t } = useTranslation();
  const tile = MODULE_TILE_BY_ID[id];
  const Icon = tile.icon;
  const isDark = useColorScheme() === "dark";

  const pan = Gesture.Pan()
    .onStart(() => {
      activeId.value = id;
      startY.value = positions.value[id] * ROW_HEIGHT;
      dragY.value = startY.value;
    })
    .onUpdate((event) => {
      dragY.value = startY.value + event.translationY;
      const newIndex = clamp(Math.round(dragY.value / ROW_HEIGHT), 0, count - 1);
      if (newIndex !== positions.value[id]) {
        positions.value = reorderPositions(positions.value, id, newIndex);
      }
    })
    .onEnd(() => {
      activeId.value = null;
      runOnJS(onCommit)(positions.value);
    });

  const animatedStyle = useAnimatedStyle(() => {
    const isActive = activeId.value === id;
    if (isActive) {
      return {
        top: dragY.value,
        zIndex: 2,
        transform: [{ scale: 1.02 }],
        shadowOpacity: 0.18,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 6,
      };
    }
    return {
      top: withSpring(positions.value[id] * ROW_HEIGHT, { damping: 18, stiffness: 220 }),
      zIndex: 0,
      transform: [{ scale: 1 }],
      shadowOpacity: 0,
      elevation: 0,
    };
  });

  return (
    <Animated.View
      style={[{ position: "absolute", left: 0, right: 0, height: ROW_BODY_HEIGHT }, animatedStyle]}
    >
      <View className="flex-1 flex-row items-center gap-3 rounded-xl bg-white py-1 pr-3 pl-1 dark:bg-gray-900">
        <GestureDetector gesture={pan}>
          <View className="p-1.5" hitSlop={8}>
            <GripVertical size={20} color={isDark ? "#6b7280" : "#9ca3af"} />
          </View>
        </GestureDetector>

        {isDark ? (
          <BlurView
            intensity={DARK_ICON_BLUR_INTENSITY}
            tint="dark"
            style={styles.darkIconContainer}
          >
            <Icon size={18} color="#ffffff" />
          </BlurView>
        ) : (
          <View className="size-9 items-center justify-center rounded-lg bg-green-100">
            <Icon size={18} color="#0d542b" />
          </View>
        )}

        <Text
          className="flex-1 text-sm font-medium text-gray-950 dark:text-gray-100"
          numberOfLines={1}
        >
          {t(tile.titleKey)}
        </Text>

        <Host style={{ width: 52, height: 32 }}>
          <Switch
            value={isVisible}
            onCheckedChange={() => onToggle(id)}
            colors={{
              checkedThumbColor: "#ffffff",
              checkedTrackColor: "#0d542b",
              uncheckedThumbColor: "#ffffff",
              uncheckedTrackColor: isDark ? "#374151" : "#e5e7eb",
            }}
          />
        </Host>
      </View>
    </Animated.View>
  );
}
