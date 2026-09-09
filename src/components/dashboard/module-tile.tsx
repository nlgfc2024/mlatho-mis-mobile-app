import { BlurView } from "expo-blur";
import { LinearGradient as RNLinearGradient } from "expo-linear-gradient";
import { Link, type Href } from "expo-router";
import { type LucideIcon } from "lucide-react-native";
import { Pressable, StyleSheet, Text, useColorScheme, View } from "react-native";
import { withUniwind } from "uniwind";

const LinearGradient = withUniwind(RNLinearGradient);

const MESH_LOCATIONS = [0, 0.5, 1] as const;
const DARK_ICON_BLUR_INTENSITY = 60;

type Mesh = {
  fallback: string;
  base: readonly [string, string, string];
  highlight: readonly [string, string, string];
  depth: readonly [string, string, string];
};

const activeMesh: Mesh = {
  // Light green mesh built around the tile's original green-100 colour.
  fallback: "#dcfce7",
  base: ["#f0fdf4", "#dcfce7", "#bbf7d0"],
  highlight: ["rgba(255, 255, 255, 0.6)", "rgba(220, 252, 231, 0.2)", "rgba(187, 247, 208, 0)"],
  depth: ["rgba(134, 239, 172, 0.45)", "rgba(74, 222, 128, 0.16)", "rgba(187, 247, 208, 0)"],
};

const activeDarkMesh: Mesh = {
  fallback: "#052e16",
  base: ["#14532d", "#052e16", "#022c22"],
  highlight: ["rgba(74, 222, 128, 0.18)", "rgba(21, 128, 61, 0.08)", "rgba(2, 44, 34, 0)"],
  depth: ["rgba(5, 46, 22, 0.5)", "rgba(20, 83, 45, 0.2)", "rgba(2, 44, 34, 0)"],
};

const mutedMesh: Mesh = {
  fallback: "#f3f4f6",
  base: ["#f9fafb", "#f3f4f6", "#e5e7eb"],
  highlight: ["rgba(255, 255, 255, 0.6)", "rgba(243, 244, 246, 0.2)", "rgba(229, 231, 235, 0)"],
  depth: ["rgba(209, 213, 219, 0.4)", "rgba(156, 163, 175, 0.15)", "rgba(229, 231, 235, 0)"],
};

const mutedDarkMesh: Mesh = {
  fallback: "#111827",
  base: ["#1f2937", "#111827", "#0f172a"],
  highlight: ["rgba(75, 85, 99, 0.28)", "rgba(31, 41, 55, 0.12)", "rgba(15, 23, 42, 0)"],
  depth: ["rgba(3, 7, 18, 0.42)", "rgba(17, 24, 39, 0.2)", "rgba(15, 23, 42, 0)"],
};

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

type ModuleTileProps = {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  href?: Href;
  push?: boolean;
  /** Muted styling for modules without a destination yet. */
  muted?: boolean;
};

function MeshBackground({ mesh }: { mesh: Mesh }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={mesh.base}
        locations={MESH_LOCATIONS}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        className="absolute inset-0"
      />
      <LinearGradient
        colors={mesh.highlight}
        locations={MESH_LOCATIONS}
        start={{ x: 0.05, y: 0 }}
        end={{ x: 0.85, y: 0.9 }}
        className="absolute inset-0"
      />
      <LinearGradient
        colors={mesh.depth}
        locations={MESH_LOCATIONS}
        start={{ x: 1, y: 0.08 }}
        end={{ x: 0.08, y: 1 }}
        className="absolute inset-0"
      />
    </View>
  );
}

export default function ModuleTile({
  icon: Icon,
  title,
  subtitle,
  href,
  push,
  muted,
}: ModuleTileProps) {
  const isDark = useColorScheme() === "dark";
  const mesh = muted ? (isDark ? mutedDarkMesh : mutedMesh) : isDark ? activeDarkMesh : activeMesh;
  const iconColor = isDark ? "#ffffff" : muted ? "#6a7282" : "#0d542b";

  const content = (
    <>
      <MeshBackground mesh={mesh} />

      <View style={{ zIndex: 1, elevation: 1 }} className="size-full flex-1 justify-between p-4">
        {isDark ? (
          <BlurView
            intensity={DARK_ICON_BLUR_INTENSITY}
            tint="dark"
            style={styles.darkIconContainer}
          >
            <Icon size={20} color={iconColor} />
          </BlurView>
        ) : (
          <View className="size-10 items-center justify-center rounded-lg bg-white shadow-xs">
            <Icon size={20} color={iconColor} />
          </View>
        )}

        <View className="gap-0.5">
          <Text
            className={
              muted
                ? "text-sm font-semibold text-gray-700 dark:text-gray-300"
                : "text-sm font-semibold text-green-900 dark:text-green-100"
            }
            numberOfLines={1}
          >
            {title}
          </Text>
          <Text
            className={
              muted
                ? "text-xs text-gray-500 dark:text-gray-400"
                : "text-xs text-green-700 dark:text-green-200"
            }
            numberOfLines={2}
          >
            {subtitle}
          </Text>
        </View>
      </View>
    </>
  );

  const className = "aspect-square w-1/2 flex-1 overflow-hidden rounded-2xl";

  if (!href) {
    return (
      <View className={className} style={{ backgroundColor: mesh.fallback }}>
        {content}
      </View>
    );
  }

  return (
    <Link href={href} push={push} asChild>
      <Pressable className={className} style={{ backgroundColor: mesh.fallback }}>
        {content}
      </Pressable>
    </Link>
  );
}
