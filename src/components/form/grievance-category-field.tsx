import { eq, useLiveQuery } from "@tanstack/react-db";
import { useStore } from "@tanstack/react-store";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";

import ErrorMessage from "@/src/components/form/error-message";
import Label from "@/src/components/form/label";
import Select from "@/src/components/form/select";
import { grievanceCategoriesCollection } from "@/src/powersync/collections";
import { useFieldContext } from "@/src/providers/form-context";
import { grievanceStore, isPaymentRelatedCategory } from "@/src/store/grievance-store";

interface ComponentProps {
  label: string;
}

const GrievanceCategoryField: React.FC<ComponentProps> = ({ label }) => {
  const { t } = useTranslation();
  const field = useFieldContext<string>();

  const { category, categoryId } = useStore(grievanceStore, (state) => ({
    category: state.category ?? "",
    categoryId: state.categoryId ?? "",
  }));

  useEffect(() => {
    if (field.state.value !== category) {
      field.setValue(category);
    }
  }, [category, field]);

  const { data = [], isLoading } = useLiveQuery((q) =>
    q
      .from({ category: grievanceCategoriesCollection })
      .where(({ category }) => eq(category.isActive, 1))
      .where(({ category }) => eq(category.isDeleted, 0))
      .orderBy(({ category }) => category.name, "asc"),
  );

  const updateCategory = (id: string) => {
    const option = data.find((row) => row.id === id);
    const value = option?.name;
    if (!value) return;

    grievanceStore.setState((state) => ({
      ...state,
      categoryId: option.id,
      category: value,
      typeId: null,
      type: null,
      paymentWindowPeriod: isPaymentRelatedCategory(value) ? state.paymentWindowPeriod : "",
      paymentWindowYear: isPaymentRelatedCategory(value) ? state.paymentWindowYear : null,
    }));
  };

  const placeholder = isLoading ? t("loading") : t("select_category");

  return (
    <View className="flex flex-col gap-2">
      <Label>{label}</Label>
      <Select
        value={categoryId}
        onValueChange={updateCategory}
        placeholder={placeholder}
        disabled={isLoading}
        searchable
        searchPlaceholder={t("search")}
        emptyMessage={t("no_item_found")}
      >
        {data.map((option) => (
          <Select.Option key={option.id} item={option.id}>
            {option.name}
          </Select.Option>
        ))}
      </Select>
      {!field.state.meta.isValid && <ErrorMessage errors={field.state.meta.errors} />}
    </View>
  );
};

export default GrievanceCategoryField;
