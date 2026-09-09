import { Host, RadioButton } from "@expo/ui/jetpack-compose";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

const RadioGroup = ({ options }: { options: string[] }) => {
  const [value, setValue] = useState<number | null>(null);

  return (
    <View className="gap-2">
      {options.map((option, index) => (
        <Pressable
          key={option}
          onPress={() => setValue(index)}
          className="flex-row items-center gap-2"
        >
          <Host matchContents>
            <RadioButton selected={value === index} onClick={() => setValue(index)} />
          </Host>
          <Text className="text-sm text-gray-700 dark:text-gray-300">{option}</Text>
        </Pressable>
      ))}
    </View>
  );
};

export default RadioGroup;
