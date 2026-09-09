import { eq, useLiveQuery } from "@tanstack/react-db";
import { useStore } from "@tanstack/react-store";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";

import ErrorMessage from "@/src/components/form/error-message";
import Label from "@/src/components/form/label";
import Select from "@/src/components/form/select";
import { grievanceTypesCollection } from "@/src/powersync/collections";
import { useFieldContext } from "@/src/providers/form-context";
import { grievanceStore } from "@/src/store/grievance-store";

interface ComponentProps {
  label: string;
}

const GrievanceTypeField: React.FC<ComponentProps> = ({ label }) => {
  const { t } = useTranslation();
  const field = useFieldContext<string>();

  const { type, typeId, categoryId } = useStore(grievanceStore, (state) => ({
    categoryId: state.categoryId ?? "",
    type: state.type ?? "",
    typeId: state.typeId ?? "",
  }));

  useEffect(() => {
    if (field.state.value !== type) {
      field.setValue(type);
    }
  }, [field, type]);

  const { data = [], isLoading } = useLiveQuery(
    (q) => {
      if (!categoryId) return undefined;
      return q
        .from({ grievanceType: grievanceTypesCollection })
        .where(({ grievanceType }) => eq(grievanceType.categoryId, categoryId))
        .where(({ grievanceType }) => eq(grievanceType.isActive, 1))
        .where(({ grievanceType }) => eq(grievanceType.isDeleted, 0))
        .orderBy(({ grievanceType }) => grievanceType.name, "asc");
    },
    [categoryId],
  );

  const updateType = (id: string) => {
    const option = data.find((row) => row.id === id);
    const value = option?.name;
    if (!value) return;

    grievanceStore.setState((state) => ({
      ...state,
      typeId: option.id,
      type: value,
    }));
  };

  const placeholder = !categoryId
    ? t("select_category_first")
    : isLoading
      ? t("loading")
      : t("select_type");

  return (
    <View className="flex flex-col gap-2">
      <Label>{label}</Label>
      <Select
        value={typeId}
        onValueChange={updateType}
        placeholder={placeholder}
        disabled={!categoryId || isLoading}
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

export default GrievanceTypeField;
