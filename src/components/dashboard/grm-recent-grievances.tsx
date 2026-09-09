import { useLiveQuery } from "@tanstack/react-db";
import { formatDistanceToNow } from "date-fns";
import { Link } from "expo-router";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";

import { useRowSeparatorStyle } from "@/src/components/ui/list-separator";
import { grievancesCollection } from "@/src/powersync/collections";
import { needsGrievanceUpload } from "@/src/powersync/grievance-sync";

export default function GrmRecentGrievances() {
  const { t } = useTranslation();
  const rowSeparatorStyle = useRowSeparatorStyle("bottom");

  const { data: rows = [] } = useLiveQuery(
    (q) =>
      q
        .from({ grievance: grievancesCollection })
        .orderBy(({ grievance }) => grievance.createdAt, "desc"),
    [],
  );
  const recent = rows.slice(0, 5);

  return (
    <View className="gap-3">
      <View className="flex flex-row items-center justify-between">
        <Text className="text-base font-semibold text-gray-950 dark:text-gray-50">
          {t("recent_grievances")}
        </Text>

        <Link href={"/(protected)/(app)/grievance"} asChild push>
          <Pressable>
            <Text className="text-sm font-medium text-green-900 dark:text-green-100">
              {t("view_more")}
            </Text>
          </Pressable>
        </Link>
      </View>

      {recent.length === 0 ? (
        <Text className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
          {t("no_item_found")}
        </Text>
      ) : (
        <View>
          {recent.map((grievance, index) => {
            const pending = needsGrievanceUpload(grievance);

            return (
              <Link
                key={grievance.id}
                href={{
                  pathname: "/(protected)/(app)/grievance/[id]",
                  params: { id: grievance.id },
                }}
                asChild
                push
              >
                <Pressable
                  style={index === recent.length - 1 ? undefined : rowSeparatorStyle}
                  className="gap-1 py-3 focus:bg-pressed active:bg-pressed"
                >
                  <View className="flex flex-row items-center justify-between gap-3">
                    <View className="min-w-0 flex-1 flex-row items-center gap-2">
                      <View
                        className={`size-1.5 rounded-full ${
                          pending ? "bg-gray-500 dark:bg-gray-400" : "bg-green-600"
                        }`}
                      />
                      <Text
                        className="flex-1 text-base font-semibold text-gray-950 dark:text-gray-50"
                        numberOfLines={1}
                      >
                        {grievance.type ?? t("grievance")}
                      </Text>
                    </View>

                    <Text className="flex-none text-xs text-gray-400 dark:text-gray-500">
                      {grievance.createdAt
                        ? formatDistanceToNow(new Date(grievance.createdAt), { addSuffix: true })
                        : ""}
                    </Text>
                  </View>

                  <Text className="text-sm text-gray-600 dark:text-gray-400" numberOfLines={1}>
                    {grievance.description}
                  </Text>
                </Pressable>
              </Link>
            );
          })}
        </View>
      )}
    </View>
  );
}
