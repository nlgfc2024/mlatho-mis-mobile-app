import { StyleSheet, useColorScheme, type ViewStyle } from "react-native";

export const ROW_SEPARATOR_WIDTH = StyleSheet.hairlineWidth;
export const ROW_SEPARATOR_COLOR = "#d1d5db";
export const ROW_SEPARATOR_DARK_COLOR = "#1e2939";

type RowSeparatorEdge = "top" | "bottom";

export function getRowSeparatorStyle(edge: RowSeparatorEdge, isDark: boolean): ViewStyle {
  const color = isDark ? ROW_SEPARATOR_DARK_COLOR : ROW_SEPARATOR_COLOR;

  return edge === "top"
    ? { borderTopWidth: ROW_SEPARATOR_WIDTH, borderTopColor: color }
    : { borderBottomWidth: ROW_SEPARATOR_WIDTH, borderBottomColor: color };
}

export function useRowSeparatorStyle(edge: RowSeparatorEdge): ViewStyle {
  return getRowSeparatorStyle(edge, useColorScheme() === "dark");
}
