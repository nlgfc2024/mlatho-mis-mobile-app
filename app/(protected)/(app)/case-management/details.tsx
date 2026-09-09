import { Button, Host, Text as JCText } from "@expo/ui/jetpack-compose";
import { clip, fillMaxWidth, Shapes } from "@expo/ui/jetpack-compose/modifiers";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLiveQuery } from "@tanstack/react-db";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import * as z from "zod";

import Input from "@/src/components/form/input";
import Select from "@/src/components/form/select";
import StyledSafeAreaView from "@/src/components/ui/styled-safe-area-view";
import { goBackOrReplace } from "@/src/lib/navigation";
import {
  districtsCollection,
  householdsCollection,
  regionsCollection,
  villagesCollection,
  wardsCollection,
} from "@/src/powersync/collections";
import { enqueueHouseholdChangeRequest } from "@/src/powersync/mutations";
import { formatHouseholdAddressPath } from "@/src/utils/household-address";
import { getHouseholdRepresentativeDisplayName } from "@/src/utils/household-representative";

const requiredLocationId = (message: string) =>
  z
    .string({ error: message })
    .optional()
    .refine((value) => value !== undefined, { message });

const createFormSchema = (t: (key: string) => string) =>
  z.object({
    headName: z.string().trim().min(2, t("head_of_household_min_length")),
    groupCode: z.string().trim().min(1, t("group_code_required")),
    regionId: requiredLocationId(t("region_required")),
    districtId: requiredLocationId(t("district_required")),
    wardId: requiredLocationId(t("ward_required")),
    villageId: requiredLocationId(t("village_required")),
  });

type FormData = z.infer<ReturnType<typeof createFormSchema>>;

export default function HouseholdDetailsUpdate() {
  const { t } = useTranslation();
  const { uuid, household } = useLocalSearchParams<{
    id: string;
    uuid: string;
    household: string;
  }>();
  const router = useRouter();
  const formSchema = useMemo(() => createFormSchema(t), [t]);

  const item = useMemo(() => {
    try {
      return household ? JSON.parse(household) : null;
    } catch {
      return null;
    }
  }, [household]);

  const { data: regions = [] } = useLiveQuery((q) =>
    q.from({ region: regionsCollection }).orderBy(({ region }) => region.name, "asc"),
  );
  const { data: allDistricts = [] } = useLiveQuery((q) =>
    q.from({ district: districtsCollection }).orderBy(({ district }) => district.name, "asc"),
  );
  const { data: allWards = [] } = useLiveQuery((q) =>
    q.from({ ward: wardsCollection }).orderBy(({ ward }) => ward.name, "asc"),
  );
  const { data: allVillages = [] } = useLiveQuery((q) =>
    q.from({ village: villagesCollection }).orderBy(({ village }) => village.name, "asc"),
  );

  const currentLocation = useMemo(() => {
    if (!item?.villageId) return null;

    const village = allVillages.find((row) => row.id === item.villageId);
    const ward = village ? allWards.find((row) => row.id === village.wardId) : null;
    const district = ward ? allDistricts.find((row) => row.id === ward.districtId) : null;
    const region = district ? regions.find((row) => row.id === district.regionId) : null;

    if (!village || !ward || !district || !region) return null;

    return {
      regionId: region.id,
      regionName: region.name,
      districtId: district.id,
      districtName: district.name,
      wardId: ward.id,
      wardName: ward.name,
      villageId: village.id,
      villageName: village.name,
    };
  }, [allDistricts, allVillages, allWards, item, regions]);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isValid, isDirty, dirtyFields },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      headName: item?.headName ?? "",
      groupCode: item?.groupCode ?? "",
      regionId: undefined,
      districtId: undefined,
      wardId: undefined,
      villageId: undefined,
    },
    mode: "onChange",
  });

  const hasDirtyAddressFields = Boolean(
    dirtyFields.regionId || dirtyFields.districtId || dirtyFields.wardId || dirtyFields.villageId,
  );

  useEffect(() => {
    if (!currentLocation || hasDirtyAddressFields) return;

    setValue("regionId", currentLocation.regionId, { shouldValidate: true });
    setValue("districtId", currentLocation.districtId, { shouldValidate: true });
    setValue("wardId", currentLocation.wardId, { shouldValidate: true });
    setValue("villageId", currentLocation.villageId, { shouldValidate: true });
  }, [currentLocation, hasDirtyAddressFields, setValue]);

  const regionId = useWatch({ control, name: "regionId" });
  const districtId = useWatch({ control, name: "districtId" });
  const wardId = useWatch({ control, name: "wardId" });

  const districts = useMemo(
    () => allDistricts.filter((district) => district.regionId === regionId),
    [allDistricts, regionId],
  );
  const wards = useMemo(
    () => allWards.filter((ward) => ward.districtId === districtId),
    [allWards, districtId],
  );
  const villages = useMemo(
    () => allVillages.filter((village) => village.wardId === wardId),
    [allVillages, wardId],
  );

  if (!item || !uuid) {
    return (
      <StyledSafeAreaView
        edges={["bottom"]}
        className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-950"
      >
        <Text className="text-lg text-red-600 dark:text-red-400">
          {t("household_data_not_found")}
        </Text>
        <Pressable
          onPress={() => goBackOrReplace(router, "/case-management")}
          className="mt-6 rounded-lg bg-emerald-700 px-6 py-3"
        >
          <Text className="font-medium text-white">{t("go_back")}</Text>
        </Pressable>
      </StyledSafeAreaView>
    );
  }

  const onSubmit = async (data: FormData) => {
    if (!data.villageId) {
      Alert.alert(t("error"), t("please_select_household_village"));
      return;
    }

    const now = new Date().toISOString();
    const region = regions.find((option) => option.id === data.regionId);
    const district = districts.find((option) => option.id === data.districtId);
    const ward = wards.find((option) => option.id === data.wardId);
    const village = villages.find((option) => option.id === data.villageId);
    const regionName =
      region?.name ??
      (currentLocation && data.regionId === currentLocation.regionId
        ? currentLocation.regionName
        : null);
    const districtName =
      district?.name ??
      (currentLocation && data.districtId === currentLocation.districtId
        ? currentLocation.districtName
        : null);
    const wardName =
      ward?.name ??
      (currentLocation && data.wardId === currentLocation.wardId ? currentLocation.wardName : null);
    const villageName =
      village?.name ??
      (currentLocation && data.villageId === currentLocation.villageId
        ? currentLocation.villageName
        : null);
    const address = formatHouseholdAddressPath({
      regionName,
      districtName,
      wardName,
      villageName,
    });

    if (!address) {
      Alert.alert(t("error"), t("please_select_full_household_address"));
      return;
    }

    try {
      const householdId = String(item.id ?? uuid);
      const updateTx = householdsCollection.update(householdId, {}, (draft) => {
        draft.headName = data.headName;
        draft.groupCode = data.groupCode;
        draft.address = address;
        draft.villageId = data.villageId;
        draft.updatedAt = now;
      });

      const changeTx = enqueueHouseholdChangeRequest({
        householdUuid: uuid,
        type: "household_details_update",
        payload: {
          headName: data.headName,
          groupCode: data.groupCode,
          address,
          regionId: data.regionId ?? null,
          regionName,
          districtId: data.districtId ?? null,
          districtName,
          wardId: data.wardId ?? null,
          wardName,
          villageId: data.villageId,
          villageName,
          previous: {
            headName: item.headName,
            groupCode: item.groupCode,
            address: item.address ?? null,
            regionId: currentLocation?.regionId ?? null,
            regionName: currentLocation?.regionName ?? null,
            districtId: currentLocation?.districtId ?? null,
            districtName: currentLocation?.districtName ?? null,
            wardId: currentLocation?.wardId ?? null,
            wardName: currentLocation?.wardName ?? null,
            villageId: currentLocation?.villageId ?? item.villageId ?? null,
            villageName: currentLocation?.villageName ?? null,
          },
        },
      });

      await Promise.all([updateTx.isPersisted.promise, changeTx.isPersisted.promise]);
      Alert.alert(t("saved"), t("household_details_updated_successfully"), [
        { text: t("ok"), onPress: () => goBackOrReplace(router, "/case-management") },
      ]);
    } catch (error) {
      console.error("[Household Details] Failed:", error);
      Alert.alert(t("error"), t("failed_update_household_details"));
    }
  };

  const representativeName = getHouseholdRepresentativeDisplayName(item);

  return (
    <StyledSafeAreaView edges={["bottom"]} className="flex-1 bg-white dark:bg-gray-950">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View className="border-b border-gray-200 px-4 py-4 dark:border-gray-800">
          <Text className="text-xs font-normal text-gray-500 dark:text-gray-400">
            {t("representative")}: {representativeName ?? "—"}
          </Text>
          <Text className="mt-0.5 text-2xl font-bold text-gray-950 dark:text-gray-50">
            {item.headName}
          </Text>
          <Text className="text-sm font-normal text-gray-600 dark:text-gray-400">
            {item.groupCode}
          </Text>
        </View>

        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 20 }}
        >
          <Controller
            control={control}
            name="headName"
            render={({ field: { onChange, value, onBlur } }) => (
              <View className="gap-2">
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("head_of_household")}</Text>
                <Input
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder={t("head_of_household_name")}
                  autoCapitalize="words"
                />
                {errors.headName && (
                  <Text className="text-sm text-red-600 dark:text-red-400">{errors.headName.message}</Text>
                )}
              </View>
            )}
          />

          <Controller
            control={control}
            name="groupCode"
            render={({ field: { onChange, value, onBlur } }) => (
              <View className="gap-2">
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("group_code")}</Text>
                <Input
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder={t("group_code")}
                  autoCapitalize="characters"
                />
                {errors.groupCode && (
                  <Text className="text-sm text-red-600 dark:text-red-400">{errors.groupCode.message}</Text>
                )}
              </View>
            )}
          />

          <View className="gap-4">
            <Controller
              control={control}
              name="regionId"
              render={({ field: { onChange, value } }) => (
                <View className="gap-2">
                  <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("region")}</Text>
                  <Select
                    value={value}
                    onValueChange={(nextRegionId) => {
                      if (nextRegionId === value) return;

                      onChange(nextRegionId);
                      setValue("districtId", undefined, {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                      setValue("wardId", undefined, {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                      setValue("villageId", undefined, {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                    }}
                    placeholder={t("select_region")}
                  >
                    {regions.map((region) => (
                      <Select.Option key={region.id} item={region.id}>
                        {region.name}
                      </Select.Option>
                    ))}
                  </Select>
                  {errors.regionId && (
                    <Text className="text-sm text-red-600 dark:text-red-400">{errors.regionId.message}</Text>
                  )}
                </View>
              )}
            />

            <Controller
              control={control}
              name="districtId"
              render={({ field: { onChange, value } }) => (
                <View className="gap-2">
                  <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("district")}</Text>
                  <Select
                    value={value}
                    onValueChange={(nextDistrictId) => {
                      if (nextDistrictId === value) return;

                      onChange(nextDistrictId);
                      setValue("wardId", undefined, {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                      setValue("villageId", undefined, {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                    }}
                    placeholder={regionId ? t("select_district") : t("select_region_first")}
                    disabled={!regionId}
                  >
                    {districts.map((district) => (
                      <Select.Option key={district.id} item={district.id}>
                        {district.name}
                      </Select.Option>
                    ))}
                  </Select>
                  {errors.districtId && (
                    <Text className="text-sm text-red-600 dark:text-red-400">{errors.districtId.message}</Text>
                  )}
                </View>
              )}
            />

            <Controller
              control={control}
              name="wardId"
              render={({ field: { onChange, value } }) => (
                <View className="gap-2">
                  <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("ward")}</Text>
                  <Select
                    value={value}
                    onValueChange={(nextWardId) => {
                      if (nextWardId === value) return;

                      onChange(nextWardId);
                      setValue("villageId", undefined, {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                    }}
                    placeholder={districtId ? t("select_ward") : t("select_district_first")}
                    disabled={!districtId}
                  >
                    {wards.map((ward) => (
                      <Select.Option key={ward.id} item={ward.id}>
                        {ward.name}
                      </Select.Option>
                    ))}
                  </Select>
                  {errors.wardId && (
                    <Text className="text-sm text-red-600 dark:text-red-400">{errors.wardId.message}</Text>
                  )}
                </View>
              )}
            />

            <Controller
              control={control}
              name="villageId"
              render={({ field: { onChange, value } }) => (
                <View className="gap-2">
                  <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("village")}</Text>
                  <Select
                    value={value}
                    onValueChange={onChange}
                    placeholder={wardId ? t("select_village") : t("select_ward_first")}
                    disabled={!wardId}
                  >
                    {villages.map((village) => (
                      <Select.Option key={village.id} item={village.id}>
                        {village.name}
                      </Select.Option>
                    ))}
                  </Select>
                  {errors.villageId && (
                    <Text className="text-sm text-red-600 dark:text-red-400">{errors.villageId.message}</Text>
                  )}
                </View>
              )}
            />
          </View>
        </ScrollView>

        <View className="p-4">
          <Host style={{ width: "100%", height: 44 }}>
            <Button
              modifiers={[fillMaxWidth(), clip(Shapes.RoundedCorner(100))]}
              onClick={handleSubmit(onSubmit)}
              enabled={isValid && isDirty}
              colors={{ containerColor: "#0d542b", contentColor: "#ffffff" }}
            >
              <JCText>{t("save_changes")}</JCText>
            </Button>
          </Host>
        </View>
      </KeyboardAvoidingView>
    </StyledSafeAreaView>
  );
}
