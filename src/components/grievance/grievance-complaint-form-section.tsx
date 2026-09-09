import { useStore } from "@tanstack/react-form";
import { useTranslation } from "react-i18next";
import { ScrollView, useColorScheme, View } from "react-native";

import Headline from "@/src/components/ui/headline";
import { getRowSeparatorStyle } from "@/src/components/ui/list-separator";
import { withForm } from "@/src/form";
import { grievanceFormOptions } from "@/src/form/grievance";

const GrievanceComplaintFormSection = withForm({
  ...grievanceFormOptions,
  props: { title: "Complaint details" },
  render: function Render({ form, title }) {
    const { t } = useTranslation();
    const isDark = useColorScheme() === "dark";
    const isBulk = useStore(form.store, ({ values }) => values.complaint.isBulk);
    const isBeneficiary = useStore(form.store, ({ values }) => values.complaint.isBeneficiary);

    return (
      <form.AppForm>
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

            <form.AppField name={"complaint.isBulk"}>
              {(field) => <field.BulkGrievanceField />}
            </form.AppField>

            {!isBulk && (
              <View className="mt-3 gap-4 pt-6" style={getRowSeparatorStyle("top", isDark)}>
                <View>
                  <form.AppField name={"complaint.isBeneficiary"}>
                    {(field) => <field.BeneficiaryField />}
                  </form.AppField>
                </View>

                {isBeneficiary ? (
                  <View className="flex flex-col gap-5">
                    <form.AppField name={"complaint.id"}>
                      {(field) => <field.ComplainantField label={t("complainant")} />}
                    </form.AppField>

                    <form.AppField name={"complaint.phone"}>
                      {(field) => (
                        <field.TextField
                          label={t("phone_number")}
                          placeholder={t("enter_phone_number")}
                        />
                      )}
                    </form.AppField>
                  </View>
                ) : (
                  <View className="flex flex-col gap-5">
                    <form.AppField name={"complaint.fullname"}>
                      {(field) => (
                        <field.TextField label={t("name")} placeholder={t("enter_full_name")} />
                      )}
                    </form.AppField>

                    <form.AppField name={"complaint.phone"}>
                      {(field) => (
                        <field.TextField
                          label={t("phone_number")}
                          placeholder={t("enter_phone_number")}
                        />
                      )}
                    </form.AppField>
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          <View className="flex flex-row items-stretch justify-between gap-4">
            <View className="min-w-0 flex-1">
              <form.SubscribeButton label={t("continue")} />
            </View>
          </View>
        </View>
      </form.AppForm>
    );
  },
});

export default GrievanceComplaintFormSection;
