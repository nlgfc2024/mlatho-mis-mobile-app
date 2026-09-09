import { Toggle } from "@expo/ui/swift-ui";
import { disabled as disabledModifier, tint } from "@expo/ui/swift-ui/modifiers";
import type { ColorValue } from "react-native";

type Props = {
  value?: boolean;
  onValueChange?: (value: boolean) => void;
  color?: ColorValue;
  colors?: {
    checkedTrackColor?: ColorValue;
  };
  disabled?: boolean;
};

const SwitchInput = ({ value, onValueChange, color, colors, disabled = false }: Props) => {
  const tintColor = color ?? colors?.checkedTrackColor;
  const modifiers = [
    tint(typeof tintColor === "string" ? tintColor : "#bbf7d0"),
    ...(disabled ? [disabledModifier(true)] : []),
  ];

  return <Toggle isOn={value ?? false} modifiers={modifiers} onIsOnChange={onValueChange} />;
};

export default SwitchInput;
