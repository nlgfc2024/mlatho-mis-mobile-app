import type { AttendanceAttendee } from "@/src/features/biometric-attendance/types";
import { clsx } from "clsx";
import { Check, X } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";

import { useRowSeparatorStyle } from "@/src/components/ui/list-separator";
import { translateStatus } from "@/src/i18n/helpers";

interface ComponentProps {
  attendee: AttendanceAttendee;
  subField: any;
  onPresentPress?: () => void;
}

const CommunitySessionAttendeeListItem = ({
  attendee,
  subField,
  onPresentPress,
}: ComponentProps) => {
  const { t } = useTranslation();
  const rowSeparatorStyle = useRowSeparatorStyle("top");

  return (
    <View
      key={attendee.id}
      style={rowSeparatorStyle}
      className="flex flex-row justify-between gap-4 px-4 py-3"
    >
      <View className="flex flex-1 flex-col gap-0.5">
        <Text className="text-base font-bold text-gray-950 dark:text-gray-50" numberOfLines={1}>
          {attendee.memberName ?? attendee.headName}
        </Text>
        <Text className="text-sm font-normal text-gray-600 dark:text-gray-400" numberOfLines={1}>
          {attendee.groupCode}
        </Text>
      </View>

      <View className="flex flex-row items-center gap-2">
        {!subField.state.value ? (
          <>
            <Pressable
              hitSlop={8}
              onPress={() => {
                subField.handleChange("absent");
              }}
              className="flex flex-row items-center justify-center rounded-full bg-red-100 px-2.5 py-1 dark:bg-red-950"
            >
              <Text className="text-sm font-medium text-red-500 dark:text-red-400">
                {t("absent")}
              </Text>
            </Pressable>

            <Pressable
              hitSlop={8}
              onPress={() => {
                if (onPresentPress) {
                  onPresentPress();
                  return;
                }

                subField.handleChange("present");
              }}
              className="flex flex-row items-center justify-center rounded-full bg-green-100 px-2.5 py-1 dark:bg-green-950"
            >
              <Text className="text-sm font-medium text-green-700 dark:text-green-300">
                {t("present")}
              </Text>
            </Pressable>
          </>
        ) : (
          <View className="flex min-w-20 flex-row items-center justify-start gap-2">
            <View
              className={clsx("rounded-full p-0.5", {
                "bg-green-500": subField.state.value === "present",
                "bg-red-500": subField.state.value === "absent",
              })}
            >
              {subField.state.value === "present" && (
                <Check size={12} strokeWidth={2.5} color={"#fff"} />
              )}
              {subField.state.value === "absent" && (
                <X size={12} strokeWidth={2.5} color={"#fff"} />
              )}
            </View>

            <Text
              className={clsx("text-sm font-medium capitalize", {
                "text-green-600 dark:text-green-400": subField.state.value === "present",
                "text-red-500 dark:text-red-400": subField.state.value === "absent",
              })}
            >
              {translateStatus(t, subField.state.value)}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

export default CommunitySessionAttendeeListItem;
