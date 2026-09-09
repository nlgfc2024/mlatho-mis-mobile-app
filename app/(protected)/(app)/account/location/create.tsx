import { formOptions } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useStore } from "@tanstack/react-store";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import * as z from "zod";

import Headline from "@/src/components/ui/headline";
import StyledSafeAreaView from "@/src/components/ui/styled-safe-area-view";
import { useAppForm } from "@/src/form";
import { goBackOrReplace } from "@/src/lib/navigation";
import { userLocationsCollection } from "@/src/powersync/collections";
import { upsertLocalRecord } from "@/src/powersync/remote-sync";
import { useSession } from "@/src/providers/session-context";
import { locationStore } from "@/src/store/location-store";

const defaultValues = {
  regionId: "",
  districtId: "",
  wardId: "",
  villageId: "",
};

const locationSchema = z.object({
  regionId: z.string().min(1, "The region field is required."),
  districtId: z.string().min(1, "The district field is required."),
  wardId: z.string().min(1, "The ward field is required."),
  villageId: z.string().min(1, "The village field is required."),
});

export type FormValues = z.infer<typeof locationSchema>;

const formOpts = formOptions({ defaultValues });

export default function CreateUserLocationScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, location: sessionLocation } = useSession();

  const { region, district, ward, village } = useStore(locationStore, (state) => ({
    region: state.region,
    district: state.district,
    ward: state.ward,
    village: state.village,
  }));

  const currentUserId = user?.id;

  const mutation = useMutation<void, Error, FormValues>({
    mutationKey: ["UpdateUserLocation"],
    mutationFn: async (): Promise<void> => {
      if (!currentUserId) {
        throw new Error("User id is required to update location.");
      }

      if (!region || !district || !ward || !village) {
        throw new Error("Complete location hierarchy is required.");
      }

      await sessionLocation.mutateAsync({
        regionId: region.id,
        districtId: district.id,
        wardId: ward.id,
        villageId: village.id,
      });

      const timestamp = new Date().toISOString();
      await upsertLocalRecord(userLocationsCollection, {
        id: `${currentUserId}:${village.id}`,
        userId: currentUserId,
        regionId: region.id,
        districtId: district.id,
        wardId: ward.id,
        villageId: village.id,
        synchronizedAt: null,
        createdAt: timestamp,
        updatedAt: timestamp,
        deletedAt: null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["GetCurrentUserWithConfiguration"],
      });
      form.reset();
      goBackOrReplace(router, "/account");
    },
    onError: (error) => {
      console.log(error);
    },
  });

  const form = useAppForm({
    ...formOpts,
    validators: {
      onSubmit: locationSchema,
    },
    onSubmit: ({ value }) => {
      if (!mutation.isPending) {
        mutation.mutate(value);
      }
    },
  });

  return (
    <StyledSafeAreaView edges={["left", "right", "bottom"]} className="flex-1 bg-white">
      <View className="flex-1 p-4">
        <View className="flex-1 gap-6">
          <View>
            <Headline>{t("create_location")}</Headline>
          </View>

          <View className="flex flex-col gap-6">
            <form.AppField name={"regionId"}>
              {(field) => <field.RegionField label={t("region")} />}
            </form.AppField>

            <form.AppField name={"districtId"}>
              {(field) => <field.DistrictField label={t("district")} />}
            </form.AppField>

            <form.AppField name={"wardId"}>
              {(field) => <field.WardField label={t("ward")} />}
            </form.AppField>

            <form.AppField name={"villageId"}>
              {(field) => <field.VillageField label={t("village")} />}
            </form.AppField>
          </View>
        </View>

        <View className="flex flex-none flex-row items-stretch justify-between gap-4">
          <form.AppForm>
            <form.SubscribeButton label={t("save_changes")} />
          </form.AppForm>
        </View>
      </View>
    </StyledSafeAreaView>
  );
}
