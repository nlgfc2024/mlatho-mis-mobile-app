import { useEffect } from "react";
import { useColorScheme } from "react-native";
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

export const steps = ["Complaint", "Details", "Evidence", "Review"];

function StepperDot({ isActive }: { isActive: boolean }) {
  const progress = useSharedValue(isActive ? 1 : 0);
  const isDark = useColorScheme() === "dark";
  const inactiveColor = isDark ? "#364153" : "#D1D5DB";
  const activeColor = isDark ? "#00a63e" : "#065F46";

  useEffect(() => {
    progress.value = withTiming(isActive ? 1 : 0, {
      duration: 250,
    });
  }, [isActive, progress]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: interpolate(progress.value, [0, 1], [8, 24]),
      backgroundColor: interpolateColor(progress.value, [0, 1], [inactiveColor, activeColor]),
    };
  });

  return (
    <Animated.View
      style={[
        {
          width: isActive ? 24 : 8,
          height: 8,
          borderRadius: 999,
          backgroundColor: isActive ? activeColor : inactiveColor,
        },
        animatedStyle,
      ]}
    />
  );
}
export default StepperDot;
