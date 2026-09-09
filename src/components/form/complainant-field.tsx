import { eq, useLiveQuery } from "@tanstack/react-db";
import { useStore } from "@tanstack/react-store";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";

import ErrorMessage from "@/src/components/form/error-message";
import Label from "@/src/components/form/label";
import Select from "@/src/components/form/select";
import { householdsCollection } from "@/src/powersync/collections";
import { useFieldContext } from "@/src/providers/form-context";
import { useSession } from "@/src/providers/session-context";
import { grievanceStore } from "@/src/store/grievance-store";

interface ComponentProps {
  label: string;
}

const ComplainantField: React.FC<ComponentProps> = ({ label }) => {
  const { t } = useTranslation();
  const { user } = useSession();
  const field = useFieldContext<string>();

  const complainantId = useStore(grievanceStore, (state) => state.complainantId ?? "");

  useEffect(() => {
    if (field.state.value !== complainantId) {
      field.setValue(complainantId);
    }
  }, [complainantId, field]);

  const villageId = user?.villageId ? String(user.villageId) : null;

  const { data: households = [], isLoading } = useLiveQuery(
    (q) => {
      const query = q.from({ household: householdsCollection });

      const scopedQuery = villageId
        ? query.where(({ household }) => eq(household.villageId, villageId))
        : query;

      return scopedQuery
        .select(({ household }) => ({
          id: household.id,
          headName: household.headName,
        }))
        .orderBy(({ household }) => household.headName, "asc");
    },
    [villageId],
  );

  const updateComplainantId = (id: string) => {
    grievanceStore.setState((state) => ({ ...state, complainantId: id }));
  };

  const placeholder = isLoading ? t("loading") : t("select_household");

  return (
    <View className="flex flex-col gap-2">
      <Label>{label}</Label>
      <Select
        value={complainantId}
        onValueChange={updateComplainantId}
        placeholder={placeholder}
        disabled={isLoading}
        searchable
        searchPlaceholder={t("search")}
        emptyMessage={t("no_results_found")}
      >
        {households.map((option) => {
          const headName = option.headName ?? "";

          return (
            <Select.Option key={option.id} item={option.id} searchText={headName}>
              {headName}
            </Select.Option>
          );
        })}
      </Select>
      {!field.state.meta.isValid && <ErrorMessage errors={field.state.meta.errors} />}
    </View>
  );
};

export default ComplainantField;
