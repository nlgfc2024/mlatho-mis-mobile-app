import { Host, Switch, type SwitchColors } from "@expo/ui/jetpack-compose";
import type { ColorValue } from "react-native";

type Props = {
  value?: boolean;
  onValueChange?: (value: boolean) => void;
  color?: ColorValue;
  colors?: SwitchColors;
  disabled?: boolean;
  enabled?: boolean;
};

const defaultColors: SwitchColors = {
  checkedThumbColor: "#16a34a",
  checkedTrackColor: "#bbf7d0",
  uncheckedThumbColor: "#f9fafb",
  uncheckedTrackColor: "#e5e7eb",
};

const SwitchInput = ({ value = false, onValueChange, color, colors, disabled, enabled }: Props) => {
  const switchColors = {
    ...defaultColors,
    ...(color ? { checkedTrackColor: color } : {}),
    ...colors,
  };

  return (
    <Host matchContents>
      <Switch
        value={value}
        enabled={enabled ?? !disabled}
        colors={switchColors}
        onCheckedChange={onValueChange}
      />
    </Host>
  );
};

export default SwitchInput;
