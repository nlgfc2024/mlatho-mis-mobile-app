import { useStore } from "@tanstack/react-form";
import { ArrowLeft } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, useColorScheme, View } from "react-native";

import { withForm } from "@/src/form";
import { grievanceFormOptions } from "@/src/form/grievance";
import { isPaymentRelatedCategory } from "@/src/store/grievance-store";

import Label from "../form/label";
import Headline from "../ui/headline";

const GrievanceDetailsFormSection = withForm({
  ...grievanceFormOptions,
  props: { title: "Details" },
  render: function Render({ form, title }) {
    const { t } = useTranslation();
    const isDark = useColorScheme() === "dark";
    const category = useStore(
      form.store,
      ({ values }) => values.details.category,
    );
    const showPaymentWindow = isPaymentRelatedCategory(category);

    return (
      <View className="flex flex-1 flex-col gap-4">
        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ gap: 16, paddingBottom: 16 }}
        >
          <View>
            <Headline>{title}</Headline>
          </View>

          <View className="flex flex-col gap-5">
            <form.AppField name={"details.category"}>
              {(field) => (
                <field.GrievanceCategoryField label={t("category")} />
              )}
            </form.AppField>

            <form.AppField name={"details.type"}>
              {(field) => <field.GrievanceTypeField label={t("type")} />}
            </form.AppField>

            {showPaymentWindow && (
              <View className="flex flex-col gap-2">
                <Label>{t("payment_window")}</Label>

                <View className="flex flex-row items-stretch gap-4">
                  <form.AppField name={"details.paymentWindowYear"}>
                    {(field) => <field.PaymentWindowYearField />}
                  </form.AppField>

                  <form.AppField name={"details.paymentWindowPeriod"}>
                    {(field) => <field.PaymentWindowPeriodField />}
                  </form.AppField>
                </View>
              </View>
            )}

            <View className="mt-4">
              <form.AppField name={"details.dateOfIncident"}>
                {(field) => <field.DateField label={t("date_of_incidence")} />}
              </form.AppField>
            </View>

            <form.AppField name={"details.description"}>
              {(field) => (
                <field.TextareaField
                  label={t("description")}
                  placeholder={t("write_something")}
                />
              )}
            </form.AppField>
          </View>
        </ScrollView>

        <View className="flex flex-row items-stretch justify-between gap-4">
          <Pressable
            onPress={() => form.setFieldValue("section", "complaint")}
            className="aspect-square items-center justify-center rounded-full border border-gray-100 bg-gray-100 dark:border-gray-800 dark:bg-gray-800"
          >
            <ArrowLeft size={20} color={isDark ? "#d1d5db" : "#364153"} strokeWidth={2.25} />
          </Pressable>

          <View className="min-w-0 flex-1">
            <form.AppForm>
              <form.SubscribeButton label={t("continue")} />
            </form.AppForm>
          </View>
        </View>
      </View>
    );
  },
});

export default GrievanceDetailsFormSection;
