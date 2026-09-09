import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";

type ProgressRingProps = {
  /** Progress value between 0 and 100. */
  progress: number;
  size?: number;
  strokeWidth?: number;
  gapSize?: number;
  strokeCap?: "round" | "butt" | "square";
  color?: string;
  trackColor?: string;
  children?: React.ReactNode;
};

export default function ProgressRing({
  progress,
  size = 88,
  strokeWidth = 8,
  strokeCap = "round",
  color = "#0d542b",
  trackColor = "#dcfce7",
  children,
}: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, progress));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clamped / 100) * circumference;
  const center = size / 2;
  const contentPadding = Math.min(12, Math.max(0, size * 0.12));

  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      <Svg width={size} height={size} style={{ transform: [{ rotate: "-90deg" }] }}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap={strokeCap}
          fill="none"
        />
      </Svg>
      <View
        className="absolute items-center justify-center"
        style={{ width: size, height: size, paddingHorizontal: contentPadding }}
      >
        {children}
      </View>
    </View>
  );
}
