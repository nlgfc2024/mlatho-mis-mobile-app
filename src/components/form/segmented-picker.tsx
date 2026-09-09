import { Pressable, Text, View } from "react-native";

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
    <View
      className={`flex-row overflow-hidden rounded-lg border border-gray-200 ${fullWidth ? "w-full" : ""}`}
    >
      {options.map((option, index) => {
        const isSelected = selectedIndex === index;
        const isDisabled = disabledIndices.includes(index);
        return (
          <Pressable
            key={option}
            onPress={() => onOptionSelected?.(index)}
            disabled={isDisabled}
            className={`flex-1 items-center px-3 py-1.5 ${isSelected ? "bg-[#0d542b]" : "bg-white"} ${isDisabled ? "opacity-35" : ""}`}
          >
            <Text className={`text-sm font-medium ${isSelected ? "text-white" : "text-gray-700"}`}>
              {option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

export default SegmentedPicker;
