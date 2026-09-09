export const ACCOUNT_SECTION_GAP = 32;

export const ACCOUNT_CARET_SIZE = 18;
export const ACCOUNT_CARET_STROKE_WIDTH = 2;
export const ACCOUNT_CARET_LIGHT_COLOR = "#6a7282";
export const ACCOUNT_CARET_DARK_COLOR = "#9ca3af";

export function getAccountCaretColor(isDark: boolean) {
  return isDark ? ACCOUNT_CARET_DARK_COLOR : ACCOUNT_CARET_LIGHT_COLOR;
}
