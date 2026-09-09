import { useTranslation } from "react-i18next";

import { resetComplaintFieldForBeneficiaryType } from "@/src/form/grievance-mode";
import { useFieldContext, useFormContext } from "@/src/providers/form-context";
import { grievanceStore } from "@/src/store/grievance-store";

import SwitchRow from "./switch-row";

const BeneficiaryField = () => {
  const { t } = useTranslation();
  const field = useFieldContext<boolean>();
  const form = useFormContext();

  return (
    <SwitchRow
      label={t("is_beneficiary")}
      value={field.state.value}
      onValueChange={(value) => {
        field.handleChange(value);
        resetComplaintFieldForBeneficiaryType(
          (fieldName) => form.resetField(fieldName as never),
          value,
        );
        if (!value) {
          grievanceStore.setState((state) => ({
            ...state,
            complainantId: null,
            complainant: null,
          }));
        }
      }}
    />
  );
};

export default BeneficiaryField;
