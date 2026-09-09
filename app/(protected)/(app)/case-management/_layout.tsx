import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";

export default function CaseManagementLayout() {
  const { t } = useTranslation();

  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name={"index"}>
        <Stack.Title large>{t("case_management")}</Stack.Title>
        <Stack.Header
          style={{
            color: "#ffffff",
            backgroundColor: "#0d542b",
            shadowColor: "transparent",
          }}
        />
      </Stack.Screen>

      <Stack.Screen
        name={"payments/[id]/edit"}
        options={{
          title: t("account_update"),
          headerTintColor: "#fff",
          headerStyle: { backgroundColor: "#0d542b" },
        }}
      />

      <Stack.Screen
        name={"payments/[id]/phone-update"}
        options={{
          title: t("update_payment_phone_number"),
          headerTintColor: "#fff",
          headerStyle: { backgroundColor: "#0d542b" },
        }}
      />

      <Stack.Screen
        name={"payments/history/[id]"}
        options={{
          title: t("payment_transaction_details"),
          headerTintColor: "#fff",
          headerStyle: { backgroundColor: "#0d542b" },
        }}
      />

      <Stack.Screen
        name={"show"}
        options={{
          title: t("household_details"),
          headerTintColor: "#fff",
          headerStyle: { backgroundColor: "#0d542b" },
        }}
      />

      <Stack.Screen
        name={"representative/[id]/edit"}
        options={{
          title: t("update_representative"),
          headerTintColor: "#fff",
          headerStyle: { backgroundColor: "#0d542b" },
        }}
      />
      <Stack.Screen
        name={"details"}
        options={{
          title: t("update_household"),
          headerTintColor: "#fff",
          headerStyle: { backgroundColor: "#0d542b" },
        }}
      />
      <Stack.Screen
        name={"address/[id]/edit"}
        options={{
          title: t("change_address"),
          headerTintColor: "#fff",
          headerStyle: { backgroundColor: "#0d542b" },
        }}
      />
      <Stack.Screen
        name={"members/index"}
        options={{
          title: t("household_members"),
          headerTintColor: "#fff",
          headerStyle: { backgroundColor: "#0d542b" },
        }}
      />
      <Stack.Screen
        name={"members/create"}
        options={{
          title: t("add_member"),
          headerTintColor: "#fff",
          headerStyle: { backgroundColor: "#0d542b" },
        }}
      />
      <Stack.Screen
        name={"deactivate"}
        options={{
          title: t("deactivate_household"),
          headerTintColor: "#fff",
          headerStyle: { backgroundColor: "#0d542b" },
        }}
      />
      <Stack.Screen
        name={"members/[id]/index"}
        options={{
          title: t("member_details"),
          headerTintColor: "#fff",
          headerStyle: { backgroundColor: "#0d542b" },
        }}
      />
      <Stack.Screen
        name={"members/[id]/edit"}
        options={{
          title: t("edit_member"),
          headerTintColor: "#fff",
          headerStyle: { backgroundColor: "#0d542b" },
        }}
      />
      <Stack.Screen
        name={"members/[id]/biometrics"}
        options={{
          title: t("member_biometrics"),
          headerTintColor: "#fff",
          headerStyle: { backgroundColor: "#0d542b" },
        }}
      />
      <Stack.Screen
        name={"members/[id]/diactivate"}
        options={{
          title: t("deactivate_member"),
          headerTintColor: "#fff",
          headerStyle: { backgroundColor: "#0d542b" },
        }}
      />
    </Stack>
  );
}
