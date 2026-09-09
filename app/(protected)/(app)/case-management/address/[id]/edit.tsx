import { Button, Host, Text as JCText } from "@expo/ui/jetpack-compose";
import { clip, fillMaxWidth, Shapes } from "@expo/ui/jetpack-compose/modifiers";
import { zodResolver } from "@hookform/resolvers/zod";
import { eq, useLiveQuery } from "@tanstack/react-db";
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

const requiredLocationId = (message: string) =>
  z
    .string({ error: message })
    .optional()
    .refine((value) => value !== undefined, { message });

const createFormSchema = (t: (key: string) => string) =>
  z.object({
    regionId: requiredLocationId(t("region_required")),
    districtId: requiredLocationId(t("district_required")),
    wardId: requiredLocationId(t("ward_required")),
    villageId: requiredLocationId(t("village_required")),
  });

type FormData = z.infer<ReturnType<typeof createFormSchema>>;

export default function HouseholdAddressChange() {
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

  // Resolve the household's existing location with a single indexed join instead
  // of loading every district/ward/village table and walking the arrays in memory.
  const { data: currentLocationRows = [] } = useLiveQuery(
    (q) => {
      if (!item?.villageId) return undefined;
      return q
        .from({ village: villagesCollection })
        .where(({ village }) => eq(village.id, item.villageId))
        .innerJoin({ ward: wardsCollection }, ({ village, ward }) => eq(village.wardId, ward.id))
        .innerJoin({ district: districtsCollection }, ({ ward, district }) =>
          eq(ward.districtId, district.id),
        )
        .innerJoin({ region: regionsCollection }, ({ district, region }) =>
          eq(district.regionId, region.id),
        )
        .select(({ village, ward, district, region }) => ({
          regionId: region.id,
          regionName: region.name,
          districtId: district.id,
          districtName: district.name,
          wardId: ward.id,
          wardName: ward.name,
          villageId: village.id,
          villageName: village.name,
        }));
    },
    [item?.villageId],
  );
  const currentLocation = currentLocationRows[0] ?? null;

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isValid, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      regionId: undefined,
      districtId: undefined,
      wardId: undefined,
      villageId: undefined,
    },
    mode: "onChange",
  });

  const regionId = useWatch({ control, name: "regionId" });
  const districtId = useWatch({ control, name: "districtId" });
  const wardId = useWatch({ control, name: "wardId" });

  // Only load the child options for the currently selected parent so we never
  // pull entire districts/wards/villages tables into memory.
  const { data: districts = [] } = useLiveQuery(
    (q) => {
      if (!regionId) return undefined;
      return q
        .from({ district: districtsCollection })
        .where(({ district }) => eq(district.regionId, regionId))
        .orderBy(({ district }) => district.name, "asc");
    },
    [regionId],
  );
  const { data: wards = [] } = useLiveQuery(
    (q) => {
      if (!districtId) return undefined;
      return q
        .from({ ward: wardsCollection })
        .where(({ ward }) => eq(ward.districtId, districtId))
        .orderBy(({ ward }) => ward.name, "asc");
    },
    [districtId],
  );
  const { data: villages = [] } = useLiveQuery(
    (q) => {
      if (!wardId) return undefined;
      return q
        .from({ village: villagesCollection })
        .where(({ village }) => eq(village.wardId, wardId))
        .orderBy(({ village }) => village.name, "asc");
    },
    [wardId],
  );

  useEffect(() => {
    if (!currentLocation || isDirty) return;

    reset({
      regionId: currentLocation.regionId,
      districtId: currentLocation.districtId,
      wardId: currentLocation.wardId,
      villageId: currentLocation.villageId,
    });
  }, [currentLocation, isDirty, reset]);

  if (!item || !uuid) {
    return (
      <StyledSafeAreaView
        edges={["bottom"]}
        className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-950"
      >
        <Text className="text-lg text-red-600 dark:text-red-400">{t("household_data_not_found")}</Text>
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
        draft.address = address;
        draft.villageId = data.villageId;
        draft.updatedAt = now;
      });

      const changeTx = enqueueHouseholdChangeRequest({
        householdUuid: uuid,
        type: "household_address_change",
        payload: {
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
      Alert.alert(t("saved"), t("household_address_updated_successfully"), [
        { text: t("ok"), onPress: () => goBackOrReplace(router, "/case-management") },
      ]);
    } catch (error) {
      console.error("[Household Address] Failed:", error);
      Alert.alert(t("error"), t("failed_change_household_address"));
    }
  };

  return (
    <StyledSafeAreaView edges={["bottom"]} className="flex-1 bg-white dark:bg-gray-950">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View className="border-b border-gray-200 px-4 py-4 dark:border-gray-800">
          <Text className="text-2xl font-bold text-gray-950 dark:text-gray-50">{item.headName}</Text>
          <Text className="text-sm font-normal text-gray-600 dark:text-gray-400">{item.groupCode}</Text>
        </View>

        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 20 }}
        >
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
        </ScrollView>

        <View className="px-4 pt-4">
          <Host style={{ width: "100%", height: 44 }}>
            <Button
              modifiers={[fillMaxWidth(), clip(Shapes.RoundedCorner(100))]}
              onClick={handleSubmit(onSubmit)}
              enabled={isValid && isDirty}
              colors={{ containerColor: "#0d542b", contentColor: "#ffffff" }}
            >
              <JCText>{t("save_address")}</JCText>
            </Button>
          </Host>
        </View>
      </KeyboardAvoidingView>
    </StyledSafeAreaView>
  );
}
