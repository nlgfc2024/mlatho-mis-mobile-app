import { Video } from "lucide-react-native";
import { Pressable, useColorScheme } from "react-native";

const CameraVideoField = () => {
  const isDark = useColorScheme() === "dark";

  return (
    <Pressable className="rounded-full border border-gray-200 bg-gray-200 p-2 dark:border-gray-800 dark:bg-gray-800">
      <Video size={16} color={isDark ? "#d1d5db" : "#4a5565"} />
    </Pressable>
  );
};

export default CameraVideoField;
