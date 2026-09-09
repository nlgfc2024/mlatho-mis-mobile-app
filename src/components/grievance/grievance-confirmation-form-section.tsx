import { Button, Host, Text as JCText } from "@expo/ui/jetpack-compose";
import { clip, fillMaxWidth, Shapes } from "@expo/ui/jetpack-compose/modifiers";
import { ArrowLeft, Calendar } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Pressable, Text, useColorScheme, View } from "react-native";

import { useRowSeparatorStyle } from "@/src/components/ui/list-separator";
import { withForm } from "@/src/form";
import { grievanceFormOptions } from "@/src/form/grievance";
import { isPaymentRelatedCategory } from "@/src/store/grievance-store";

import Headline from "../ui/headline";

import GrievanceEvidences from "./grievance-evidences";
import GrievanceReporter from "./grievance-reporter";

const GrievanceConfirmationFormSection = withForm({
  ...grievanceFormOptions,
  props: { title: "Confirmation" },
  render: function Render({ form }) {
    const { t } = useTranslation();
    const isDark = useColorScheme() === "dark";
    const topSeparatorStyle = useRowSeparatorStyle("top");
    const bottomSeparatorStyle = useRowSeparatorStyle("bottom");
    const grievance = form.store.state.values;
    const showPaymentWindow = isPaymentRelatedCategory(grievance.details.category);
    const paymentWindowText =
      grievance.details.paymentWindowPeriod && grievance.details.paymentWindowYear
        ? `${grievance.details.paymentWindowPeriod} (${grievance.details.paymentWindowYear})`
        : grievance.details.paymentWindowPeriod ||
          (grievance.details.paymentWindowYear
            ? String(grievance.details.paymentWindowYear)
            : t("not_selected"));

    const incidentDate = new Date(grievance.details.dateOfIncident).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });

    return (
      <View className="flex-1">
        <View className="flex-1">
          <View className="mt-3">
            <View>
              <GrievanceReporter form={form} />

              <Headline>{grievance.details.type}</Headline>
            </View>

            <View className="mt-1 flex flex-row items-center gap-1.5">
              <Calendar size={14} color={isDark ? "#9ca3af" : "#6a7282"} />
              <Text className="text-sm text-gray-600 dark:text-gray-400">{incidentDate}</Text>
            </View>

            <View className="mt-3">
              <Text className="text-base font-normal text-gray-700 dark:text-gray-300">
                {grievance.details.description}
              </Text>
            </View>

            {showPaymentWindow && (
              <View
                className="mt-5 mb-4 flex flex-row items-center justify-between pt-4"
                style={topSeparatorStyle}
              >
                <View>
                  <Text className="text-sm font-medium text-gray-950 dark:text-gray-50">
                    {t("payment_window")}
                  </Text>
                </View>
                <View className="flex flex-row items-center gap-1">
                  <Text className="text-sm font-normal text-gray-950 dark:text-gray-50">
                    {paymentWindowText}
                  </Text>
                </View>
              </View>
            )}

            <View className="mt-4 flex flex-col gap-4">
              <View className="rounded-2xl bg-gray-100 px-4 dark:bg-gray-900">
                <View className="flex flex-row gap-4 py-4" style={bottomSeparatorStyle}>
                  <View className="w-1/5">
                    <Text className="text-sm font-medium text-gray-950 dark:text-gray-50">
                      {t("type")}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text
                      className="text-sm font-normal text-gray-600 dark:text-gray-400"
                      numberOfLines={1}
                    >
                      {grievance.details.type}
                    </Text>
                  </View>
                </View>

                <View className="flex flex-row gap-4 py-4" style={bottomSeparatorStyle}>
                  <View className="w-1/5">
                    <Text className="text-sm font-medium text-gray-950 dark:text-gray-50">
                      {t("category")}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-normal text-gray-600 dark:text-gray-400">
                      {grievance.details.category}
                    </Text>
                  </View>
                </View>
              </View>

              <View className="mt-4">
                <GrievanceEvidences form={form} />
              </View>
            </View>
          </View>
        </View>

        <View className="flex flex-row items-stretch justify-between gap-4">
          <Pressable
            onPress={() => form.setFieldValue("section", "evidence")}
            className="aspect-square items-center justify-center rounded-full border border-gray-100 bg-gray-100 dark:border-gray-800 dark:bg-gray-800"
          >
            <ArrowLeft size={20} color={isDark ? "#d1d5db" : "#364153"} strokeWidth={2.25} />
          </Pressable>

          <View className="min-w-0 flex-1">
            <Host style={{ width: "100%", height: 44 }}>
              <Button
                modifiers={[fillMaxWidth(), clip(Shapes.RoundedCorner(100))]}
                colors={{ containerColor: "#0d542b", contentColor: "#ffffff" }}
                onClick={() => form.handleSubmit()}
              >
                <JCText>{t("submit_grievance")}</JCText>
              </Button>
            </Host>
          </View>
        </View>
      </View>
    );
  },
});

export default GrievanceConfirmationFormSection;
