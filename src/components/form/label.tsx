import { Text, type TextProps } from "react-native";

interface ComponentProps extends TextProps {
  children: React.ReactNode;
}

const Label: React.FC<ComponentProps> = ({ children, ...props }) => {
  return (
    <Text {...props} className="text-sm font-normal text-gray-950 dark:text-gray-50">
      {children}
    </Text>
  );
};

export default Label;
