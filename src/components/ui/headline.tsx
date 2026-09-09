import React from "react";
import { Text } from "react-native";

interface ComponentProps {
  children: React.ReactNode;
}

const Headline: React.FC<ComponentProps> = ({ children }) => {
  return (
    <Text className="text-left text-[1.75rem] font-bold text-gray-950 dark:text-gray-50">
      {children}
    </Text>
  );
};

export default Headline;
