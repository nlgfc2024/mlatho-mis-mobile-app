import {
  Host,
  SegmentedButton,
  SingleChoiceSegmentedButtonRow,
  Text,
} from "@expo/ui/jetpack-compose";
import { fillMaxWidth, weight } from "@expo/ui/jetpack-compose/modifiers";

type Props = {
  options: string[];
  selectedIndex?: number | null;
  onOptionSelected?: (index: number) => void;
  disabledIndices?: number[];
  fullWidth?: boolean;
};

const colors = {
  inactiveBorderColor: "#d1d5dc",
  activeBorderColor: "#016630",
  activeContainerColor: "#016630",
  activeContentColor: "#FFFFFF",
};

const SegmentedPicker = ({
  options,
  selectedIndex,
  onOptionSelected,
  disabledIndices = [],
  fullWidth = false,
}: Props) => {
  return (
    <Host
      matchContents={fullWidth ? { vertical: true } : true}
      style={fullWidth ? { width: "100%" } : undefined}
    >
      <SingleChoiceSegmentedButtonRow modifiers={fullWidth ? [fillMaxWidth()] : undefined}>
        {options.map((option, index) => {
          const isDisabled = disabledIndices.includes(index);
          return (
            <SegmentedButton
              key={option}
              selected={selectedIndex === index}
              onClick={() => onOptionSelected?.(index)}
              colors={colors}
              enabled={!isDisabled}
              modifiers={fullWidth ? [weight(1)] : undefined}
            >
              <SegmentedButton.Label>
                <Text style={{ fontWeight: "600" }}>{option}</Text>
              </SegmentedButton.Label>
            </SegmentedButton>
          );
        })}
      </SingleChoiceSegmentedButtonRow>
    </Host>
  );
};

export default SegmentedPicker;
