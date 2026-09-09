import { eq, useLiveQuery } from "@tanstack/react-db";
import { useStore } from "@tanstack/react-form";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { householdsCollection } from "@/src/powersync/collections";

type GrievanceComplaint = {
  id?: number | string | null;
  isBulk?: boolean;
  isBeneficiary?: boolean;
  phone?: string | null;
  fullname?: string | null;
};

const GrievanceReporter = ({ form }: { form: any }) => {
  const { t } = useTranslation();
  const complaint = useStore(
    form.store,
    (state: any) => state.values.complaint,
  ) as GrievanceComplaint;
  const reporterId = complaint.id ? String(complaint.id) : null;

  const { data: households = [] } = useLiveQuery(
    (q) => {
      if (!reporterId || complaint.isBulk) return undefined;
      return q
        .from({ household: householdsCollection })
        .where(({ household }) => eq(household.id, reporterId))
        .orderBy(({ household }) => household.id, "asc")
        .limit(1);
    },
    [reporterId, complaint.isBulk],
  );
  const data = households[0];

  if (complaint.isBulk) {
    return (
      <View className="flex flex-row items-center gap-2">
        <Text className="text-sm font-medium text-green-700 dark:text-green-400">
          {t("bulk_grievance")}
        </Text>
      </View>
    );
  }

  const phoneNumber = complaint.phone;
  let fullname = data?.headName ?? undefined;
  if (!complaint.isBeneficiary) {
    fullname = complaint.fullname ?? undefined;
  }

  return (
    <View className="flex flex-row items-center gap-2">
      <Text className="text-sm font-medium text-green-700 dark:text-green-400">{fullname}</Text>
      <View className="size-1 rounded-full bg-gray-400 dark:bg-gray-500" />
      <Text className="text-sm font-normal text-gray-500 dark:text-gray-400">{phoneNumber}</Text>
    </View>
  );
};

export default GrievanceReporter;
