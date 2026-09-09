import { type PropsWithChildren, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import { StartupScreen } from "./startup-screen";

const DRAW_SETTLE_MS = 64;
const TRANSITION_MS = 280;
const OVERLAY_REMOVAL_MS = DRAW_SETTLE_MS + TRANSITION_MS + 40;

/**
 * Mount the resolved route behind the React splash for one frame, then
 * cross-fade. The destination is already final at this point, so the animation
 * cannot expose an intermediate login, setup, or dashboard screen.
 */
export function StartupTransition({ children }: PropsWithChildren) {
  const [showSplashOverlay, setShowSplashOverlay] = useState(true);
  const [destinationDrawn, setDestinationDrawn] = useState(false);
  const [splashDrawn, setSplashDrawn] = useState(false);
  const destinationOpacity = useSharedValue(0.88);
  const destinationTranslateY = useSharedValue(4);
  const splashOpacity = useSharedValue(1);

  useEffect(() => {
    if (!destinationDrawn || !splashDrawn) return;

    destinationOpacity.value = withDelay(
      DRAW_SETTLE_MS,
      withTiming(1, {
        duration: TRANSITION_MS,
        easing: Easing.out(Easing.cubic),
        reduceMotion: ReduceMotion.System,
      }),
    );
    destinationTranslateY.value = withDelay(
      DRAW_SETTLE_MS,
      withTiming(0, {
        duration: TRANSITION_MS,
        easing: Easing.out(Easing.cubic),
        reduceMotion: ReduceMotion.System,
      }),
    );
    splashOpacity.value = withDelay(
      DRAW_SETTLE_MS,
      withTiming(0, {
        duration: TRANSITION_MS,
        easing: Easing.inOut(Easing.cubic),
        reduceMotion: ReduceMotion.System,
      }),
    );

    const removalTimer = setTimeout(() => {
      setShowSplashOverlay(false);
    }, OVERLAY_REMOVAL_MS);
    return () => clearTimeout(removalTimer);
  }, [
    destinationDrawn,
    destinationOpacity,
    destinationTranslateY,
    splashDrawn,
    splashOpacity,
  ]);

  const destinationStyle = useAnimatedStyle(() => ({
    opacity: destinationOpacity.value,
    transform: [{ translateY: destinationTranslateY.value }],
  }));
  const splashStyle = useAnimatedStyle(() => ({
    opacity: splashOpacity.value,
  }));

  return (
    <View style={styles.container}>
      <Animated.View
        onLayout={() => setDestinationDrawn(true)}
        style={[styles.destination, destinationStyle]}
      >
        {children}
      </Animated.View>

      {showSplashOverlay ? (
        <Animated.View
          onLayout={() => setSplashDrawn(true)}
          pointerEvents="none"
          style={[styles.overlay, splashStyle]}
          testID="startup-transition-overlay"
        >
          <StartupScreen loadingReason="dashboard" />
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#ffffff",
    flex: 1,
  },
  destination: {
    flex: 1,
  },
  overlay: {
    bottom: 0,
    backgroundColor: "#ffffff",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 1,
  },
});
