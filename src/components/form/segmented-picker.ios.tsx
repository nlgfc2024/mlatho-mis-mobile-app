import { Host, Picker, Text } from "@expo/ui/swift-ui";
import { disabled, opacity, pickerStyle, tag } from "@expo/ui/swift-ui/modifiers";

type Props = {
  options: string[];
  selectedIndex?: number | null;
  onOptionSelected?: (index: number) => void;
  disabledIndices?: number[];
  fullWidth?: boolean;
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
      <Picker
        modifiers={[pickerStyle("segmented")]}
        selection={selectedIndex ?? null}
        onSelectionChange={(index) => {
          if (!disabledIndices.includes(index as number)) {
            onOptionSelected?.(index as number);
          }
        }}
      >
        {options.map((option, index) => {
          const isDisabled = disabledIndices.includes(index);
          return (
            <Text
              key={option}
              modifiers={[tag(index), ...(isDisabled ? [disabled(true), opacity(0.35)] : [])]}
            >
              {option}
            </Text>
          );
        })}
      </Picker>
    </Host>
  );
};

export default SegmentedPicker;
