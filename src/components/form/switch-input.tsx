import { Switch, type ColorValue } from "react-native";

type Props = {
  value?: boolean;
  onValueChange?: (value: boolean) => void;
  color?: ColorValue;
  colors?: {
    checkedThumbColor?: ColorValue;
    checkedTrackColor?: ColorValue;
    uncheckedThumbColor?: ColorValue;
    uncheckedTrackColor?: ColorValue;
  };
  disabled?: boolean;
};

const defaultColors = {
  checkedThumbColor: "#16a34a" as ColorValue,
  checkedTrackColor: "#bbf7d0" as ColorValue,
  uncheckedThumbColor: "#f9fafb" as ColorValue,
  uncheckedTrackColor: "#e5e7eb" as ColorValue,
};

const SwitchInput = ({ value = false, onValueChange, color, colors, disabled }: Props) => {
  const switchColors = {
    ...defaultColors,
    ...(color ? { checkedTrackColor: color } : {}),
    ...colors,
  };

  return (
    <Switch
      value={value}
      disabled={disabled}
      thumbColor={value ? switchColors.checkedThumbColor : switchColors.uncheckedThumbColor}
      trackColor={{
        false: switchColors.uncheckedTrackColor,
        true: switchColors.checkedTrackColor,
      }}
      ios_backgroundColor={switchColors.uncheckedTrackColor}
      onValueChange={onValueChange}
    />
  );
};

export default SwitchInput;
